import { generateCodeVerifier, generateState } from "arctic";
import { parseCookie, serialize } from "cookie";

import { get_provider, get_scopes } from "./providers";
import { validate_origin, verify_token } from "./util";

export const handle_login = async (request: Request & {params: {provider: string}}, env: Env) => {
    const { provider } = request.params;

    const from = new URL(request.url).searchParams.get("from") || env.BASE_URL;

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
        // be sure to preserve the from param if present
        const redirect_url = new URL(env.BASE_URL);
        if (from) {
            redirect_url.searchParams.set("from", from);
        }

        return Response.redirect(redirect_url.toString(), 302);
    }

    const oauth = get_provider(provider, env);
    if (!oauth) {
        return new Response(`Unknown provider: ${provider}`, { status: 400 });
    }

    // instantiate the provider to get the auth url
    const state = generateState();
    const code_verifier = generateCodeVerifier();
    const url = oauth.createAuthorizationURL(state, code_verifier, get_scopes(provider));

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
