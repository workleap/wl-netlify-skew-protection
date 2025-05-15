// Original Gist provided by Netlify: https://gist.github.com/sean-roberts/cbf1e9197e37e8dcd22c4f058ad86448.

import type { Config, Context } from "@netlify/edge-functions";

export const SecretEnvironmentVariable = "SKEW_PROTECTION_SECRET";
export const CookieName = "nf_sp";
// Required to support application including url segments like https://contoso.workleap.com/app.
export const CookiePath = "/";
// Expires in 1 day.
export const CookieMaxAge = 1000 * 60 * 60 * 24;

export type Mode = "spa" | "entrypoints";

export interface CreateSkewProtectionFunctionOptions {
    /**
     * Relative path of the files that should set a skew protection cookie.
     *
     * Ex: "/index.html"
     *
     * If skew protection mode is "SPA", this option can be left undefined since
     * this function will use the `Accept: text/html` header to determine if the request is a page load.
     */
    entrypoints?: string[];
    /**
     * The cookie is signed with HMAC to prevent tampering. The encryption secret must be configured as an environment
     * variable of the Netlify site using the provided environment variable name.
     * @default SKEW_PROTECTION_SECRET
     */
    secretEnvironmentVariableName?: string;
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
    verbose?: boolean;
}

type LogDebugFunction = (log: string, ...rest: unknown[]) => void;

function createLogFunction(id: string, verbose: boolean) {
    const fct: LogDebugFunction = verbose
        ? (log: string, ...rest: unknown[]) => {
            return console.log(`[${id}] ${log}`, ...rest);
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

/**
 * Creates a skew protection edge function to return as the default "export".
 * @param mode The actual mode in which the returned function should operate. For a SPA host application, the mode should be "spa".
 * @param options Configuration options object.
 */
export function createSkewProtectionFunction(mode: Mode, options: CreateSkewProtectionFunctionOptions = {}) {
    const {
        entrypoints = [],
        secretEnvironmentVariableName = SecretEnvironmentVariable,
        cookieName = CookieName,
        cookiePath = CookiePath,
        cookieMaxAgeInMs = CookieMaxAge,
        verbose = false
    } = options;

    const secret = Netlify.env.get(secretEnvironmentVariableName);

    return async (request: Request, context: Context) => {
        try {
            const logDebug = createLogFunction(crypto.randomUUID(), verbose);

            if (!context.deploy || !context.deploy.id || !context.deploy.published) {
                logDebug("This is dev mode, exiting.");

                return;
            }

            if (!secret) {
                console.error(`The edge function is not installed properly. Missing or invalid env variable. Did you configured a env variabled named "${secretEnvironmentVariableName}" for your Netlify site?`);

                return;
            }

            if (mode === "spa" && entrypoints.length > 0) {
                console.error(`When the edge function is operating in "${mode}" mode, the entrypoints of the application must not be provided as options of the "createSkewProtectionFunction" function.`);

                return;
            }

            if (mode === "entrypoints" && entrypoints.length === 0) {
                console.error(`When the edge function mode is "${mode}", the entrypoints of the application must be provided as options of the "createSkewProtectionFunction" function.`);

                return;
            }

            if (mode !== "spa" && mode !== "entrypoints") {
                console.error(`Unknown mode: "${mode}". Valid modes are "spa" and "entrypoints".`);

                return;
            }

            logDebug(`The edge function is operating in "${mode}" mode.`);
            logDebug(`The HMAC secret has been retrieved successfully from the site "${secretEnvironmentVariableName}" environment variable.`);

            const url = new URL(request.url);

            logDebug("The request URL path name is:", url.pathname);

            let canSetCookie = false;

            if (mode === "spa") {
                const acceptHeader = request.headers.get("Accept");

                if (acceptHeader) {
                    logDebug("The request \"accept\" header value is: ", acceptHeader);
                } else {
                    logDebug("The request does not include an \"accept\" header.");
                }

                // Since any URL pathname could be an entrypoint for a SPA, the request is considered
                // as an entrypoint of if the browser is requesting HTML content.
                if (acceptHeader?.toLowerCase().includes("text/html")) {
                    logDebug("The request accept \"text/html\" files, will return the skew protection cookie with the response.");

                    canSetCookie = true;
                }
            } else if (mode === "entrypoints") {
                logDebug("Provided entrypoints are:", entrypoints);

                // For scenarios such as a federation application or an application returning a manifest file, the function
                // cannot rely on the "accept" header before the entrypoints will usually be a JavaScript or a JSON files.
                // Those scenarios are handled by validating the request URL pathname against an array of entrypoints provided by the host application.
                if (entrypoints.includes(url.pathname)) {
                    logDebug("One of the provided entrypoint match the request URL path name, will return the skew protection cookie with the response.");

                    canSetCookie = true;
                }
            }

            if (canSetCookie) {
                logDebug(`Writing a cookie with the ${context.deploy.id} deployment id and exiting.`);

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
            } else {
                logDebug("The request does not match any of the conditions to return a cookie with the response, moving to the next step.");
            }

            logDebug(`Retrieving cookie with name "${cookieName}"...`);

            const cookie = context.cookies.get(cookieName);

            if (!cookie) {
                logDebug(`Cookie with name "${cookieName}" cannot be found, exiting.`);

                return;
            } else {
                logDebug("Retrieved the cookie successfully.");
            }

            logDebug("Validating the cookie signature...");

            const deploy = await verifySignature(cookie, secret);

            if (!deploy) {
                logDebug("The cookie is invalid, deleting the cookie and exiting.");

                context.cookies.delete(cookieName);

                return;
            } else {
                logDebug("The cookie signature is valid.");
            }

            if (Date.now() - deploy.ts > cookieMaxAgeInMs) {
                logDebug("The cookie is expired, deleting the cookie and exiting.");

                context.cookies.delete(cookieName);

                return;
            }

            if (deploy.id === context.deploy.id) {
                logDebug("This cookie deployment id is the current deploy id, exiting.");

                return;
            }

            const target = new URL(request.url);
            const hostname = `${deploy.id}--${context.site.name}.netlify.app`;

            logDebug("Re-routing the request to the following hostname", hostname);

            target.hostname = hostname;

            return fetch(target, request);
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
