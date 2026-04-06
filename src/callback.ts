import { parseCookie, serialize } from "cookie";
import { SignJWT } from "jose";

import { get_provider, get_user_info } from "./providers";

export const handle_callback = async (request: Request & {params: {provider: string}}, env: Env) => {
    const { provider } = request.params;

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

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

        // extract origin from cookie domain (which may start with a dot for subdomain wildcarding)
        let cookie_origin: string;
        let is_wildcard = false;
        if (env.COOKIE_DOMAIN.startsWith(".")) {
            cookie_origin = `https://${env.COOKIE_DOMAIN.substring(1)}`;
            is_wildcard = true;
        } else {
            cookie_origin = `https://${env.COOKIE_DOMAIN}`;
        }

        // check if allowed, by either being an exact match or a subdomain if wildcarding is enabled
        // or is in the EXTRA_REDIRECT_ORIGINS list in env
        let pass_token_via_url = false;
        let is_allowed = false;
        if (target_origin === cookie_origin) {
            is_allowed = true;
        } else if (is_wildcard && target_origin.endsWith(`.${cookie_origin.substring(8)}`)) {
            is_allowed = true;
        } else if (env.EXTRA_REDIRECT_ORIGINS.split(",").map(s => s.trim()).includes(target_origin)) {
            is_allowed = true;
            pass_token_via_url = true;
        }

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

        const res = new Response(null, {
            status: 302,
            headers: {
                "Location": redirect_url.toString(),
            }
        });

        res.headers.append("Set-Cookie", delete_auth_cookie);
        res.headers.append("Set-Cookie", sso_cookie);

        return res;
    } catch (e) {
        console.error(e);
        return new Response("Authentication failed during token exchange", { status: 500 });
    }
}
