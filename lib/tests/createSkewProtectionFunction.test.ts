import type { Context, Cookie } from "@netlify/edge-functions";
import { http } from "msw";
import { setupServer } from "msw/node";
import { beforeAll, describe, test } from "vitest";
import { CookieName, createSkewProtectionFunction, sign, verifySignature } from "../src/index.ts";

const SecretKey = "secret-key";
const Secret = "secret";

beforeAll(() => {
    globalThis.Netlify = {
        env: {
            get: (key: string) => {
                if (key === SecretKey) {
                    return Secret;
                }
            }
        }
    } as unknown as typeof global["Netlify"];
});

describe("manifest mode", () => {
    test("when an entrypoint is requested, skew protection cookie is set", async ({ expect }) => {
        // Setup the request and context.
        const request = new Request("https://example.com/manifest.json");
        const cookies: Cookie[] = [];
        const context = {
            deploy: {
                id: "deploy-id",
                published: true
            },
            cookies: {
                set(input: Cookie) {
                    cookies.push(input);
                }
            }
        };

        // Create the skew protection function.
        const fct = createSkewProtectionFunction("manifest", {
            entrypoints: ["/manifest.json"],
            secretEnvironmentVariableName: SecretKey
        });

        // Execute the skew protection function.
        await fct(request, context as unknown as Context);

        // Check that the cookie is set.
        expect(cookies).toHaveLength(1);
        const cookie = cookies[0];
        expect(cookie.name).toBe(CookieName);
        expect(cookie.value).toBeDefined();

        // Check that the cookie is signed properly
        const deploy = await verifySignature(cookie.value, Secret);
        expect(deploy).toBeDefined();
        expect(deploy!.id).toBe("deploy-id");
        expect(deploy!.ts).toBeDefined();
    });

    test("when the resource is requested with a cookie already set, load the file from correct deploy", async ({ expect, onTestFinished }) => {
        // Setup a mock server to simulate the resource request
        const server = setupServer(http.get("https://previous-deploy-id--site-name.netlify.app/file.js", () => Response.json({ success: true })));
        server.listen();
        onTestFinished(() => server.close());

        // Setup the request and context.
        const request = new Request("https://example.com/file.js");
        const cookie = await sign({ id: "previous-deploy-id", ts: Date.now() }, Secret);
        const context = {
            site: {
                name: "site-name"
            },
            deploy: {
                id: "deploy-id",
                published: true
            },
            cookies: {
                get: () => cookie
            }
        };

        // Create the skew protection function.
        const fct = createSkewProtectionFunction("manifest", {
            entrypoints: ["/manifest.json"],
            secretEnvironmentVariableName: SecretKey
        });

        // Execute the skew protection function.
        const response = await fct(request, context as unknown as Context);

        // Verify reponse.
        expect(response).toBeDefined();
        const data = await response!.json();
        expect(data).toEqual({ success: true });
    });
});
