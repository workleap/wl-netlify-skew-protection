// Original Gist provided by Netlify: https://gist.github.com/sean-roberts/cbf1e9197e37e8dcd22c4f058ad86448.

import type { Config, Context } from "@netlify/edge-functions";

export const SecretEnvironmentVariable = "SKEW_PROTECTION_SECRET";
export const BasicAuthPasswordEnvironmentVariableName = "BASIC_AUTH_PASSWORD";
export const CookieName = "nf_sp";

export interface CreateSkewProtectionFunctionOptions {
    /**
     * Name of the files that should be considered entrypoints, and that should
     * set a skew protection cookie.
     *
     * If you're building a SPA, you can leave this empty since we use the
     * `Accept: text/html` header to determine if the request is a page load.
     */
    entrypoints?: string[];
    /**
     * We don't want users to be able to access very old versions of the site, so
     * the cookie is signed with HMAC to prevent tampering.
     * The secret must be configured as an environment variable of the Netlify site
     * using the provided environment variable name.
     * @default SKEW_PROTECTION_SECRET
     */
    secretEnvironmentVariableName?: string;
    /**
     * If the site is protected by a basic auth, the basic auth must be configured as an
     * environment variable of the Netlify site using the provided environment variable name.
     * @default BASIC_AUTH_PASSWORD
     */
    basicAuthPasswordEnvironmentVariableName?: string;
    /**
     * @default: nf-sp
     */
    cookieName?: string;
    /**
     * @default: "/"
     */
    cookiePath?: string;
    /**
     * @default 86400000
     */
    cookieMaxAgeInMs?: number;
    /**
     * @default false
     */
    debug?: boolean;
}

type LogDebugFunction = (log: string, ...rest: unknown[]) => void;

function createLogDebugFunction(debug: boolean) {
    const fct: LogDebugFunction = debug
        ? (log: string, ...rest: unknown[]) => {
            return console.log(log, ...rest);
        }
        : () => {};

    return fct;
}

interface Payload {
    id: string;
    ts: number;
}

/** Returns a string with the shape `<hex data (*B)>.<hex signature (43B)>` */
export async function sign(data: Payload, secret: string): Promise<string> {
    const message = new TextEncoder().encode(JSON.stringify(data));
    const keyData = new TextEncoder().encode(secret);
    const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, true, ["sign", "verify"]);
    const signature = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, message));

    return `${encodeHex(message)}.${encodeHex(signature)}`;
}

/** Verifies the signature of the cookie, then return the payload. If invalid, returns `null` */
export async function verifySignature(cookie: string, secret: string): Promise<Payload | null> {
    const [message, signature] = cookie.split(".").map(value => decodeHex(value));
    const keyData = new TextEncoder().encode(secret);
    const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, true, ["sign", "verify"]);
    const valid = await crypto.subtle.verify("HMAC", cryptoKey, signature, message);

    if (!valid) {
        return null;
    }

    return JSON.parse(new TextDecoder().decode(message));
}

function encodeHex(data: Uint8Array): string {
    let result = "";

    for (const byte of data) {
        result += byte.toString(16).padStart(2, "0");
    }

    return result;
}

function decodeHex(data: string): Uint8Array {
    const result = new Uint8Array(data.length / 2);

    for (let i = 0; i < data.length; i += 2) {
        result[i / 2] = parseInt(data.slice(i, i + 2), 16);
    }

    return result;
}

async function rerouteRequestWithBasicAuthBypass(target: URL, originalRequest: Request, siteId: string, basicAuthPassword: string, logDebug: LogDebugFunction) {
    logDebug("Re-routing the request using a basic auth bypass strategy.");

    const data = new FormData();

    data.append("form-name", "form 1");
    data.append("password", basicAuthPassword);

    logDebug("Sending a POST request to obtain the JWT.");

    const postResponse = await fetch(target, {
        method: "POST",
        body: new URLSearchParams(Array.from(data.entries()).map(([key, value]) => [key, value.toString()])).toString(),
        headers: {
            "content-type": "application/x-www-form-urlencoded"
        },
        redirect: "manual"
    });

    logDebug("POST request response status is: ", postResponse.status);

    const cookies = postResponse.headers.getSetCookie();
    // The expected cookie format is: <siteId>=<JWT>; <other attributes>
    // This regex captures the JWT value associated with the siteId, stopping at the first semicolon.
    const jwtMatch = cookies[0].match(new RegExp(`^${siteId}=(?<value>[^;]+)`));
    const jwt = jwtMatch?.groups?.value;

    if (!jwt) {
        logDebug("Failed to extract the JWT from the POST response, returning a 401 response.");

        return new Response(null, {
            status: 401
        });
    }

    logDebug("Extracted the JWT from the POST response.");
    logDebug("Re-routing the request.");

    return fetch(target, {
        ...originalRequest,
        headers: {
            ...originalRequest.headers,
            // Odly, sending the JWT with "Authorization": `Bearer ${jwt}` doesn't work?
            cookie: `${siteId}=${jwt}`
        }
    });
}

function rerouteRequest(target: URL, originalRequest: Request) {
    return fetch(target, originalRequest);
}

export function createSkewProtectionFunction(options: CreateSkewProtectionFunctionOptions = {}) {
    const {
        entrypoints = [],
        secretEnvironmentVariableName = SecretEnvironmentVariable,
        basicAuthPasswordEnvironmentVariableName = BasicAuthPasswordEnvironmentVariableName,
        cookieName = CookieName,
        cookiePath = "/",
        // Expires in 1 day.
        cookieMaxAgeInMs = 1000 * 60 * 60 * 24,
        debug = false
    } = options;

    const logDebug = createLogDebugFunction(debug);

    const secret = Netlify.env.get(secretEnvironmentVariableName);
    const basicAuthPassword = Netlify.env.get(basicAuthPasswordEnvironmentVariableName);

    return async (request: Request, context: Context) => {
        try {
            if (!context.deploy || !context.deploy.id || !context.deploy.published) {
                logDebug("This is dev mode, exiting");

                return;
            }

            if (!secret) {
                console.error(`The edge function is not installed properly. Missing or invalid env variable. Did you configured a env variabled named "${secretEnvironmentVariableName}" for your Netlify site?`);

                return;
            }

            logDebug("The secret has been retrieved successfully.");
            logDebug("Provided entrypoints are:", entrypoints);

            const url = new URL(request.url);

            // For SPAs, since any URL pathname could be an entrypoint, we
            // instead check if the browser is requesting HTML content. If yes,
            // we can confidently assume that this is a page load request.
            const isPageLoadRequest = request.headers.get("Accept")?.toLowerCase().includes("text/html");

            logDebug("The request URL path name is:", url.pathname);

            if (entrypoints.includes(url.pathname) || isPageLoadRequest) {
                logDebug(`One of the provided entrypoint match the request URL path name, writing a cookie with the ${context.deploy.id} deployment id and exiting.`);

                context.cookies.set({
                    name: cookieName,
                    path: cookiePath,
                    // Cookie size is about 114 bytes.
                    value: await sign({ id: context.deploy.id, ts: Date.now() }, secret),
                    httpOnly: true,
                    // Needs to be SameSite=None for cross-origin requests to work on classic <script> tags.
                    sameSite: "None",
                    // SameSite=None requires Secure=true.
                    secure: true,
                    expires: Date.now() + cookieMaxAgeInMs
                });

                return;
            }

            logDebug(`Retrieving cookie with name "${cookieName}"...`);

            const cookie = context.cookies.get(cookieName);

            if (!cookie) {
                logDebug(`Cookie with name "${cookieName}" cannot be found, exiting`);

                return;
            } else {
                logDebug("Retrieved the cookie successfully.");
            }

            logDebug("Validating the cookie signature...");

            const deploy = await verifySignature(cookie, secret);

            if (!deploy) {
                logDebug("The cookie is invalid, deleting the cookie and exiting");

                context.cookies.delete(cookieName);

                return;
            } else {
                logDebug("The cookie signature is valid.");
            }

            if (Date.now() - deploy.ts > cookieMaxAgeInMs) {
                logDebug("The cookie is expired, deleting the cookie and exiting");

                context.cookies.delete(cookieName);

                return;
            }

            if (deploy.id === context.deploy.id) {
                logDebug("This cookie deployment id is the current deploy id, exiting.");

                return;
            }

            const target = new URL(request.url);
            const hostname = `${deploy.id}--${context.site.name}.netlify.app`;

            logDebug(`Re-routing the request to the following hostname: "${hostname}"`);

            target.hostname = hostname;

            return basicAuthPassword
                ? rerouteRequestWithBasicAuthBypass(target, request, context.site.id!, basicAuthPassword, logDebug)
                : rerouteRequest(target, request);
        } catch (error) {
            console.error(error);

            return;
        }
    };
}

export const config: Config = {
    path: "/*",
    method: "GET"
};
