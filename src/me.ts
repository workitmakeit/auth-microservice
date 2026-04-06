import { parseCookie } from "cookie";

import { verify_token } from "./util";

export const handle_me = async (request: Request, env: Env) => {
    // extract token from cookie (or Authorization header for API access)
    const cookies = parseCookie(request.headers.get("Cookie") || "");
    const auth_header = request.headers.get("Authorization");

    const token = cookies["sso_token"] || auth_header?.replace("Bearer ", "");

    if (!token) {
        return new Response(JSON.stringify({ authenticated: false }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    const verification = await verify_token(token, env);
    if (verification.valid) {
        const { payload } = verification;

        // TODO: refresh D1 data

        return new Response(JSON.stringify({
            authenticated: true,
            user: {
                id: payload.sub,
                username: payload.username,
                discriminator: payload.discriminator,
                email: payload.email,
                avatar: payload.avatar
            }
        }), {
            headers: { "Content-Type": "application/json" }
        });
    } else {
        return new Response(JSON.stringify({ authenticated: false, error: "Invalid session" }), {
            status: 401
        });
    }
};
