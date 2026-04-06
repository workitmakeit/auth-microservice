import { serialize } from "cookie";

import { validate_origin } from "./util";

export const handle_logout = async (request: Request, env: Env) => {
    const from = new URL(request.url).searchParams.get("from") || env.BASE_URL;

    const target_origin = new URL(from).origin;
    const { is_allowed } = validate_origin(target_origin, env);

    const final_redirect = is_allowed ? from : env.BASE_URL;

    // delete sso cookie
    const cookie = serialize("sso_token", "", {
        domain: env.COOKIE_DOMAIN,
        path: "/",
        maxAge: 0,
        expires: new Date(0),
        httpOnly: true,
        secure: true,
        sameSite: "lax"
    });

    // as well as ui state cookie
    const ui_cookie = serialize("sso_logged_in", "", {
        domain: env.COOKIE_DOMAIN,
        path: "/",
        maxAge: 0,
        expires: new Date(0),
        httpOnly: true,
        secure: true,
        sameSite: "lax"
    });

    const res = new Response(null, {
        status: 302,
        headers: {
            "Location": final_redirect,
        }
    });

    res.headers.append("Set-Cookie", cookie);
    res.headers.append("Set-Cookie", ui_cookie);

    return res;
};
