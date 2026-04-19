import { parseCookie, serialize } from "cookie";
import { SignJWT } from "jose";

import { get_provider, get_user_info, provider_friendly_names, ProviderName } from './providers';
import { validate_origin } from "./util";
import { IRequest } from "itty-router";

export const handle_callback = async (request: IRequest, env: Env) => {
    const { provider, code, state } = request.params;

    const oauth = get_provider(provider, env);
    if (!oauth) {
        return new Response(`Unknown provider: ${provider}`, { status: 400 });
    }

    // retrieve auth state from cookie
    const cookies = parseCookie(request.headers.get("Cookie") || "");
    const auth_state = cookies["auth_state"];
    if (!auth_state) {
        return new Response("Missing auth state cookie", { status: 400 });
    }

    let state_data;
    try {
        state_data = JSON.parse(auth_state);
    } catch (e) {
        return new Response("Invalid auth state cookie", { status: 400 });
    }

    if (!code || !state || state !== state_data.state) {
        return new Response("State mismatch", { status: 400 });
    }

    try {
        const tokens = await oauth.validateAuthorizationCode(code, state_data.code_verifier);

        const user_info = await get_user_info(provider, tokens.accessToken());

        // TODO: persist to D1

        // convert to jwt
        const jwt = await new SignJWT({
            provider: provider_friendly_names[provider as ProviderName],
            sub: `${provider}:${user_info.id}`,
            username: user_info.username,
            discriminator: user_info.discriminator,
            email: user_info.email,
            avatar: user_info.avatar
        })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("30d")
            .sign(new TextEncoder().encode(env.JWT_SECRET));

        // only redirect to authorised origins
        const target_origin = new URL(state_data.from || env.BASE_URL).origin;
        const { is_allowed, pass_token_via_url } = validate_origin(target_origin, env);

        const final_redirect = is_allowed ? state_data.from : env.BASE_URL;

        const redirect_url = new URL(final_redirect);

        if (pass_token_via_url) {
            redirect_url.searchParams.set("token", jwt);
        }

        // delete temporary auth_state cookie
        const delete_auth_cookie = serialize("auth_state", "", {
            maxAge: 0,
            path: "/",
            expires: new Date(0)
        });

        // persist to sso cookie
        const sso_cookie = serialize("sso_token", jwt, {
            domain: env.COOKIE_DOMAIN,
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: "/"
        });

        // also persist ui state cookie
        const sso_ui_cookie = serialize("sso_logged_in", "true", {
            domain: env.COOKIE_DOMAIN,
            httpOnly: false,
            secure: true,
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: "/"
        });

        const res = new Response(null, {
            status: 302,
            headers: {
                "Location": redirect_url.toString(),
            }
        });

        res.headers.append("Set-Cookie", delete_auth_cookie);
        res.headers.append("Set-Cookie", sso_cookie);
        res.headers.append("Set-Cookie", sso_ui_cookie);

        return res;
    } catch (e) {
        console.error(e);
        return new Response("Authentication failed during token exchange", { status: 500 });
    }
}
