// Original Gist provided by Netlify: https://gist.github.com/sean-roberts/cbf1e9197e37e8dcd22c4f058ad86448.

import type { Config, Context } from "@netlify/edge-functions";

export interface CreateSkewProtectionFunctionOptions {
    /**
     * We don't want users to be able to access very old versions of the site, so
     * the cookie is signed with HMAC to prevent tampering.
     * The secret must be configured as an environment variable of the Netlify site using the provided
     * environment variable name name.
     * @default SKEW_PROTECTION_SECRET
     */
    secretEnvironmentVariableName?: string;
    /**
     * @default 86400000
     */
    cookieMaxAgeInMs?: number;
}

/**
 *
 * @param entrypoints
 * @param cookieName
 * @param options
 * @returns
 */
export function createSkewProtectionFunction(entrypoints: string[], cookieName: string, options: CreateSkewProtectionFunctionOptions = {}) {
    return async (request: Request, context: Context) => {
        const {
            secretEnvironmentVariableName = "SKEW_PROTECTION_SECRET",
            // Expires in 1 day.
            cookieMaxAgeInMs = 1000 * 60 * 60 * 24
        } = options;

        const secret = Netlify.env.get(secretEnvironmentVariableName);

        try {
            if (!context.deploy || !context.deploy.id || !context.deploy.published) {
                // Dev mode, skipping skew protection.
                return;
            }

            if (!secret) {
                console.error(`[Netlify Skew Protection] Skew protection edge function is not installed properly. Missing or invalid env variable. Did you configured a env variabled named "${secretEnvironmentVariableName}" for your Netlify site?`);

                return;
            }

            const url = new URL(request.url);

            if (entrypoints.includes(url.pathname)) {
                context.cookies.set({
                    name: cookieName,
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

            const cookie = context.cookies.get(cookieName);

            if (!cookie) {
                // The cookie cannot not found.
                return;
            }

            const deploy = await verifySignature(cookie, secret);

            if (!deploy) {
                // The cookie is invalid.
                context.cookies.delete(cookieName);

                return;
            }

            if (Date.now() - deploy.ts > cookieMaxAgeInMs) {
                // The cookie is expired.
                context.cookies.delete(cookieName);

                return;
            }

            if (deploy.id === context.deploy.id) {
                // Current deploy, no need to proxy.
                return;
            }

            const target = new URL(request.url);
            target.hostname = `${deploy.id}--${context.site.name}.netlify.app`;

            return fetch(target, request);
        } catch (error) {
            console.error("[Netlify Skew Protection] An unmanaged error occured.", error);

            return;
        }
    };
}

interface Payload {
    id: string;
    ts: number;
}

/** Returns a string with the shape `<hex data (*B)>.<hex signature (43B)>` */
async function sign(data: Payload, secret: string): Promise<string> {
    const message = new TextEncoder().encode(JSON.stringify(data));
    const keyData = new TextEncoder().encode(secret);
    const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, true, ["sign", "verify"]);
    const signature = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, message));

    return `${encodeHex(message)}.${encodeHex(signature)}`;
}

/** Verifies the signature of the cookie, then return the payload. If invalid, returns `null` */
async function verifySignature(cookie: string, secret: string): Promise<Payload | null> {
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

export const config: Config = {
    path: "/*",
    method: "GET"
};
