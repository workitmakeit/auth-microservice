import { jwtVerify } from "jose";
import { parseCookie } from "cookie";

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

    try {
        const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(env.JWT_SECRET)
        );

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
    } catch (e) {
        return new Response(JSON.stringify({ authenticated: false, error: "Invalid session" }), {
            status: 401
        });
    }
};
