---
icon: gear
---

# Available options

## `secretEnvironmentVariableName`

Specifies the name of the environment variable that holds the secret used for signing the cookie with HMAC encryption to prevent tampering. To override the default value, use the `secretEnvironmentVariableName` option:

```ts !#2 skew-protection.ts
createSkewProtectionFunction("spa", {
    secretEnvironmentVariableName: "HMAC_SECRET"
});
```

## `cookieName`

Defines the name of the cookie that stores the deploy ID associated with the user's session. To change the cookie name, use the `cookieName` option:

```ts !#2 skew-protection.ts
createSkewProtectionFunction("spa", {
    cookieName: "my_app_sp"
});
```

## `cookiePath`

Specifies the cookie path for the deployment ID cookie associated with the user session. To change the cookie path, use the `cookiePath` option:

```ts !#2 skew-protection.ts
createSkewProtectionFunction("spa", {
    cookiePath: "/my-app"
});
```

## `cookieMaxAgeInMs`

Sets the maximum age (in milliseconds) of the cookie holding the deployment ID. To customize the expiration, use the `cookieMaxAgeInMs` option:

```ts !#2 skew-protection.ts
createSkewProtectionFunction("spa", {
    cookieMaxAgeInMs: 1000 * 60 * 30 * 24
});
```

## `verbose`

Enables additional logging in the [Edge Functions logs](https://docs.netlify.com/edge-functions/get-started/#monitor) to assist with troubleshooting. To enable verbose logging, set the `verbose` option to `true`:

```ts !#2 skew-protection.ts
createSkewProtectionFunction("spa", {
    verbose: true
});
```
