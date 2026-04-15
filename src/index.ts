import { WorkerEntrypoint } from "cloudflare:workers";

import { AutoRouter, cors } from "itty-router";

import { handle_login } from "./login";
import { handle_callback } from "./callback";
import { handle_frontend } from "./frontend";
import { handle_logout } from "./logout";
import { handle_me } from "./me";

import { verify_token } from "./util";
import { handle_provider_names, provider_friendly_names, provider_names, type ProviderName } from './providers';

const { preflight } = cors({
    origin: "*", // TODO: restrict to allowed origins
    allowMethods: "GET",
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
    .get("/", handle_frontend);

export default class AuthService extends WorkerEntrypoint<Env> {
    async fetch(request: Request): Promise<Response> {
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
