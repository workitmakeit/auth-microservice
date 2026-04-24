import { IRequest } from "itty-router";
import { validate_origin } from "./util";
import { parseCookie } from "cookie";

export const handle_frame_exchange_frontend = (request: IRequest, env: Env) => {
    const {from} = request.query as {from?: string};

    if (!from) {
        return new Response("Missing 'from' query parameter", { status: 400 });
    }

    const from_origin = new URL(from).origin;

    const {is_allowed, pass_token_via_frame} = validate_origin(from_origin, env);

    if (!is_allowed || !pass_token_via_frame) {
        return new Response("Origin not allowed to receive token via frame exchange", { status: 403 });
    }

    // read the sso cookie
    const sso_token = parseCookie(request.headers.get("Cookie") || "")["sso_token"];

    // exchange via iframe postMessage
    // TODO: possible xss from cookie val
    const response_body = `
        <script>
            window.onload = function() {
                window.parent.postMessage({ type: "token", token: "${sso_token || ""}" }, "${from_origin}");
            }
        </script>
    `;

    return new Response(response_body, {
        headers: {
            "Content-Type": "text/html",

                // allow iframing only in the authorised origin
                "Content-Security-Policy": `frame-ancestors ${from_origin};`,
                "X-Frame-Options": `ALLOW-FROM ${from_origin}`
        }
    });
}
