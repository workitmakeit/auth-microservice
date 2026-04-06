import { generateCodeVerifier, generateState } from "arctic";
import { serialize } from "cookie";

import { get_provider, get_scopes } from "./providers";

export const handle_login = async (request: Request & {params: {provider: string}}, env: Env) => {
    const { provider } = request.params;

    const from = new URL(request.url).searchParams.get("from") || env.BASE_URL;

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
