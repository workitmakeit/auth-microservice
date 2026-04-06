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
        // TODO: persist to cookie to share SSO-style

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
        const allowed_origins = env.ALLOWED_REDIRECT_ORIGINS.split(",").map(s => s.trim()).filter(s => s.length > 0);

        const is_allowed = allowed_origins.includes(target_origin);
        const final_redirect = is_allowed ? state_data.from : env.BASE_URL;

        const redirect_url = new URL(final_redirect);
        redirect_url.searchParams.set("token", jwt);

        // redirect back to frontend with token in query params
        return new Response(null, {
            status: 302,
            headers: {
                "Location": redirect_url.toString(),

                // delete the temporary auth_state cookie
                "Set-Cookie": serialize("auth_state", "", { maxAge: 0, path: "/", expires: new Date(0) })
            }
        });

    } catch (e) {
        console.error(e);
        return new Response("Authentication failed during token exchange", { status: 500 });
    }
}
