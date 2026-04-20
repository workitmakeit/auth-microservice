import { SignJWT } from "jose";
import { get_user_info, provider_friendly_names } from "./providers";
import type { IRequest } from "itty-router";

export const handle_discord_activity_auth = async (request: IRequest, env: Env) => {
    const { activity } = request.query as { activity?: string };

    if (!activity) {
        return new Response(JSON.stringify({ error: "Missing 'from' parameter" }), { status: 400 });
    }

    // resolve the from address, client id, and secret from the env dynamically
    const env_prefix = `DISCORD_ACTIVITY_${activity.toUpperCase()}`;
    const dyn_env = env as unknown as Record<string, string>;

    const redirect_uri = dyn_env[`${env_prefix}_REDIRECT_URI`];
    const client_id = dyn_env[`${env_prefix}_CLIENT_ID`];
    const client_secret = dyn_env[`${env_prefix}_CLIENT_SECRET`];

    if (!redirect_uri || !client_id || !client_secret) {
        return new Response(JSON.stringify({ error: "Missing activity configuration" }), { status: 500 });
    }

    // if defined in the env then its fine!
    // const {is_allowed, pass_token_via_url} = validate_origin(new URL(from as string).origin, env);
    // if (!is_allowed) {
    //     return new Response(JSON.stringify({ error: "Unauthorised origin" }), { status: 403 });
    // }

    const { code } = await request.json() as { code: string };

    if (!code) {
        return new Response(JSON.stringify({ error: "Missing code" }), { status: 400 });
    }

    try {
        const token_res = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id,
                client_secret,
                grant_type: "authorization_code",
                code,
                redirect_uri,
            }),
        });

        const tokens = await token_res.json() as { access_token: string };

        const user_info = await get_user_info("discord", tokens.access_token);

        const jwt = await new SignJWT({
            provider: provider_friendly_names["discord"],
            sub: `discord:${user_info.id}`,
            username: user_info.username,
            discriminator: user_info.discriminator,
            email: user_info.email,
            avatar: user_info.avatar
        })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("30d")
            .sign(new TextEncoder().encode(env.JWT_SECRET));

        return new Response(JSON.stringify({ token: jwt, discord_access_token: tokens.access_token }), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*.discordsays.com",
            }
        });
    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "Auth failed" }), { status: 500 });
    }
}
