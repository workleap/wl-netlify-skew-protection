import type { Config, Context } from "@netlify/edge-functions";

// We don't want users to be able to access very old versions of the site, so
// we sign the cookie with HMAC to prevent tampering. Cookies are timestamped
// and expire after 1 day. Older cookies are ignored.
const SECRET = Netlify.env.get("SKEW_PROTECTION_SECRET");
const COOKIE_NAME = "netlify_sp";
// 1 day.
const MAX_AGE = 1000 * 60 * 60 * 24;
const ENTRYPOINTS = ["/index.html"];

export default async (request: Request, context: Context) => {
    try {
        if (!context.deploy || !context.deploy.id || !context.deploy.published) {
            return;
        }

        if (!SECRET) {
            console.error("Skew protection extension not installed properly. Missing or invalid SKEW_PROTECTION_SECRET env variable.");

            return;
        }

        const url = new URL(request.url);

        if (ENTRYPOINTS.includes(url.pathname)) {
            // Entrypoint, set the cookie.
            context.cookies.set({
                name: COOKIE_NAME,
                // Cookie size is about 114 bytes.
                value: await sign({ id: context.deploy.id, ts: Date.now() }),
                httpOnly: true,
                // Needs to be SameSite=None for cross-origin requests to work on classic <script> tags.
                sameSite: "None",
                // SameSite=None requires Secure=true.
                secure: true,
                expires: Date.now() + MAX_AGE
            });

            return;
        }

        const cookie = context.cookies.get(COOKIE_NAME);

        if (!cookie) {
            // Cookie not found.
            return;
        }

        const deploy = await verifySignature(cookie);

        if (!deploy) {
            // Cookie invalid.
            context.cookies.delete(COOKIE_NAME);

            return;
        }

        if (Date.now() - deploy.ts > MAX_AGE) {
            // Expired.
            context.cookies.delete(COOKIE_NAME);

            return;
        }

        if (deploy.id === context.deploy.id) {
            // Current deploy, no need to proxy.
            return;
        }

        const target = new URL(request.url);
        target.hostname = `${deploy.id}--${context.site.name}.netlify.app`;

        return fetch(target, request);
    } catch (e) {
        console.error(e);

        return;
    }
};

interface Payload {
    id: string;
    ts: number;
}

/** Returns a string with the shape `<hex data (*B)>.<hex signature (43B)>` */
export async function sign(data: Payload): Promise<string> {
    const message = new TextEncoder().encode(JSON.stringify(data));
    const keyData = new TextEncoder().encode(SECRET);
    const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, true, ["sign", "verify"]);
    const signature = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, message));

    return `${encodeHex(message)}.${encodeHex(signature)}`;
}

/** Verifies the signature of the cookie, then return the payload. If invalid, returns `null` */
export async function verifySignature(cookie: string): Promise<Payload | null> {
    const [message, signature] = cookie.split(".").map(value => decodeHex(value));
    const keyData = new TextEncoder().encode(SECRET);
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
