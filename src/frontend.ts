import type { IRequest } from "itty-router";
import { parseCookie } from "cookie";

import { validate_origin, verify_token } from './util';
import { provider_names, provider_friendly_names } from "./providers";

export const handle_frontend = async (request: IRequest, env: Env) => {
    const from = request.query.from || env.BASE_URL;

    // if the from is not allowed, stop here
    if (!validate_origin(new URL(from).origin, env).is_allowed) {
        return new Response("Unauthorised from origin", { status: 403 });
    }

    const cookies = parseCookie(request.headers.get("Cookie") || "");

    let show_logout = false;

    let provider: string | null = null;
    let username_with_discrim: string | null = null;

    if (cookies["sso_token"]) {
        const verification = await verify_token(cookies["sso_token"], env);

        if (verification.valid) {
            const { payload } = verification;

            show_logout = true;

            provider = payload.provider;

            username_with_discrim = payload.username as string;
            if (payload.discriminator && payload.discriminator !== "0") {
                username_with_discrim += `#${payload.discriminator}`;
            }
        }
    }

    return new Response(`
        <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">

              <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
              <style type="text/tailwindcss">
                  @theme {
                     --color-background: #cecece;
                     --color-foreground: #111111;
                     --color-background-variant: #f5f5f5;
                     --color-primary: #5865f2;
                     --color-on-primary: #ffffff;
                  }

                  @media (prefers-color-scheme: dark) {
                      @theme {
                          --color-background: #111111;
                          --color-foreground: #cecece;
                          --color-background-variant: #1e1e1e;
                      }
                  }

                  .link {
                      @apply bg-primary text-on-primary p-4 rounded-xl flex items-center gap-4 transition-transform transform hover:scale-[1.02] active:scale-[0.98];
                  }

                  .icon {
                      @apply w-6 h-6;
                  }

                  * {
                      user-select: none;
                  }
              </style>
            </head>
            <body class="bg-background text-foreground flex flex-col items-center justify-center h-screen">
                <div class="bg-background-variant/80 backdrop-blur-md border border-foreground/20 p-8 rounded-xl shadow-lg flex flex-col items-center gap-4">
                    <h1 class="font-bold text-2xl mb-8">ollieg.codes Account</h1>

                    ${!show_logout ?
                        `<div id="providers" class="flex flex-col items-stretch gap-4">
                          ${provider_names.map((provider) => {
                                const friendly_name = provider_friendly_names[provider] || provider;
                                return `<a target="_parent" href="/login/${provider}?from=${from}" class="link"><img src="https://cdn.simpleicons.org/${provider}/ffffff" class="icon" />Log in with ${friendly_name}</a>`;
                            }).join("")}
                      </div>`
                    : ''}

                    ${provider ? `<p id="provider" class="text-sm text-foreground/70">Logged in with ${provider}</p>` : ''}
                    ${show_logout ? `<a id="logout" href="/logout?from=${from}" class="link">Log out from ${username_with_discrim}</a>` : ''}
                </div>
            </body>
        </html>
    `,
        {
            headers: {
                "Content-Type": "text/html",

                // allow iframing only in the authorised origin
                "Content-Security-Policy": `frame-ancestors ${from};`,
                "X-Frame-Options": `ALLOW-FROM ${from}`
            }
        }
    );
}

// TODO: maybe serve a little prebuilt react app or serve from github pages? this works for now though, just uses a request!
