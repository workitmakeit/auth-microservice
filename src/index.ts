import { WorkerEntrypoint } from "cloudflare:workers";

import { AutoRouter } from "itty-router";

import { handle_login } from "./login";
import { handle_callback } from "./callback";
import { handle_frontend } from "./frontend";
import { handle_logout } from "./logout";
import { handle_me } from "./me";

import { verify_token } from "./util";

const router = AutoRouter();

router.get("/login/:provider", handle_login)
    .get("/callback/:provider", handle_callback)
    .get("/logout", handle_logout)
    .get("/me", handle_me)
    .get("/", handle_frontend);

export default class AuthService extends WorkerEntrypoint<Env> {
    async fetch(request: Request): Promise<Response> {
        return router.fetch(request, this.env, this.ctx);
    }

    // rpc methods

    async verify_token(token: string): ReturnType<typeof verify_token> {
        return verify_token(token, this.env);
    }

    // TODO: get details from D1 when implemented
}
