import { generateCodeVerifier, generateState } from "arctic";
import { parseCookie, serialize } from "cookie";

import { get_provider, get_scopes } from "./providers";
import { validate_origin, verify_token } from "./util";
import { IRequest } from 'itty-router';

export const handle_login = async (request: IRequest, env: Env) => {
    const { provider } = request.params;
    let { from, extra_scopes } = request.query as { from?: string; extra_scopes?: string | string[] };

    if (!from) {
        from = env.BASE_URL;
    }

    // check for existing login session
    const cookies = parseCookie(request.headers.get("Cookie") || "");
    const existing_token = cookies["sso_token"];

    if (existing_token) {
        const session = await verify_token(existing_token, env);

        // if the session is valid and either we don't care about provider or it matches
        if (session.valid && (!provider || session.payload.sub?.startsWith(provider))) {
            const { is_allowed, pass_token_via_url } = validate_origin(new URL(from).origin, env);

            if (is_allowed) {
                const redirect_url = new URL(from);

                if (pass_token_via_url) {
                    redirect_url.searchParams.set("token", existing_token);
                }

                return Response.redirect(redirect_url.toString(), 302);
            }
        }
    }

    // if at this point provider is undefined, redirect to base url (which has uri to choose provider)
    // TODO: or should that ui be on /login when provider not specified, and root redirects here (its just for vanity)
    if (!provider) {
        // be sure to preserve the from and extra_scopes params if present
        const redirect_url = new URL(env.BASE_URL);
        if (from) {
            redirect_url.searchParams.set("from", from);
        }
        if (extra_scopes) {
            if (Array.isArray(extra_scopes)) {
                for (const scope of extra_scopes) {
                    redirect_url.searchParams.append("extra_scopes", scope);
                }
            } else {
                redirect_url.searchParams.set("extra_scopes", extra_scopes);
            }
        }

        return Response.redirect(redirect_url.toString(), 302);
    }

    const oauth = get_provider(provider, env);
    if (!oauth) {
        return new Response(`Unknown provider: ${provider}`, { status: 400 });
    }

    if (extra_scopes) {
        if (typeof extra_scopes === "string") {
            extra_scopes = extra_scopes.split(",").map(s => s.trim()).filter(s => s.length > 0);
        }
    } else {
        extra_scopes = [];
    }

    // instantiate the provider to get the auth url
    const state = generateState();
    const code_verifier = generateCodeVerifier();
    const url = oauth.createAuthorizationURL(state, code_verifier, [...get_scopes(provider), ...extra_scopes]);

    // store auth state in cookie
    const cookie = serialize("auth_state", JSON.stringify({ state, from, provider, code_verifier }), {
        httpOnly: true,
        secure: true,
        maxAge: 60 * 10, // 10 minutes
        path: "/",
        sameSite: "lax"
    });

    // redirect to oauth provider
    return new Response(null, {
        status: 302,
        headers: {
            "Location": url.toString(),
            "Set-Cookie": cookie
        }
    });
};
