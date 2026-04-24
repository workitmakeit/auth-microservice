import { WorkerEntrypoint } from "cloudflare:workers";

import { AutoRouter, cors } from "itty-router";

import { handle_login } from "./login";
import { handle_callback } from "./callback";
import { handle_frontend } from "./frontend";
import { handle_logout } from "./logout";
import { handle_me } from "./me";

import { validate_origin, verify_token } from "./util";
import { handle_provider_names, provider_friendly_names, provider_names, type ProviderName } from "./providers";
import { handle_discord_activity_auth } from "./discord_activity";

export default class AuthService extends WorkerEntrypoint<Env> {
    async fetch(request: Request): Promise<Response> {
        // check rate limit
        const {success} = await this.env.AUTH_RATE_LIMIT.limit({key: request.headers.get("CF-Connecting-IP") || "unknown"});
        if (!success) {
            return new Response("Too many requests", { status: 429 });
        }

        // note that this is only preflight, the actual CORS headers are set in each handler to allow for dynamic origins
        const { preflight } = cors({
            origin: (origin) => {
                if (!origin || origin === "null") {
                    return;
                }

                // allow anything under discordsays
                if (origin.endsWith(".discordsays.com") || origin === "https://discordsays.com") {
                    return origin;
                }

                const {is_allowed} = validate_origin(origin, this.env);
                if (is_allowed) {
                    return origin;
                }

                return;
            },
            allowMethods: "GET, POST",
            allowHeaders: ["Authorization", "Content-Type"]
        });

        const router = AutoRouter({
            before: [preflight]
        });

        router
            .get("/login", handle_login)
            .get("/login/:provider", handle_login)
            .get("/callback/:provider", handle_callback)
            .get("/logout", handle_logout)
            .get("/me", handle_me)
            .get("/providers", handle_provider_names)
            .get("/", handle_frontend)
            .post("/login-discord-activity", handle_discord_activity_auth);

        return router.fetch(request, this.env, this.ctx);
    }

    // rpc methods

    async verify_token(token: string): ReturnType<typeof verify_token> {
        return verify_token(token, this.env);
    }

    get_provider_names(): readonly ProviderName[] {
        return provider_names;
    }

    get_provider_friendly_names(): Record<ProviderName, string> {
        return provider_friendly_names;
    }

    // TODO: get details from D1 when implemented
}

// TODO: allow localhost redirect, but show a warning first
