export const handle_frontend = async () => new Response(`
        <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">

              <script>
                  if (document.cookie.includes("sso_logged_in=true")) {
                      // if ui state cookie set, hide providers and show logout as well as fetching user details to show in logout button
                      const user_promise = fetch("/me").then(res => res.json());

                      document.addEventListener("DOMContentLoaded", () => {
                         document.getElementById("providers").style.display = "none";

                         const logout_btn = document.getElementById("logout");
                         logout_btn.style.display = "block";

                         const provider_el = document.getElementById("provider");
                         provider_el.style.display = "block";

                         user_promise.then(data => {
                             let button_text = \`Log out from \${data.user.username}\`;
                             if (data.user.discriminator && data.user.discriminator !== "0") {
                                 button_text += \`#\${data.user.discriminator}\`;
                             }
                             logout_btn.innerText = button_text;

                             provider_el.innerText =  \`Logged in with \${data.provider}\`;
                         });
                     });
                  }
              </script>

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

                  .link-from {
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
                    <h1 class="font-bold text-2xl mb-8">Log in to ollieg.codes</h1>

                    <div id="providers">
                      <a href="/login/discord" class="link-from">
                         <img src="https://cdn.simpleicons.org/discord/ffffff" class="icon" />
                         Log in with Discord
                      </a>
                    </div>

                    <p id="provider" style="display: none"></p>
                    <a id="logout" style="display: none" href="/logout" class="link-from">Logout</a>
                </div>
            </body>

            <script>
                // if there is a from param in the url, append it to the links
                document.addEventListener("DOMContentLoaded", () => {
                    const url_params = new URLSearchParams(window.location.search);
                    const from = url_params.get("from");

                    if (from) {
                        document.querySelectorAll(".link-from").forEach(link => {
                            link.href += \`?from=\${encodeURIComponent(from)}\`;
                        });
                    }
                });
            </script>
        </html>
    `,
    {
        headers: { "Content-Type": "text/html" }
    }
);

// TODO: maybe serve a little prebuilt react app or serve from github pages? this works for now though, just uses a request!
// TODO: use providers list to dynamically generate login options instead of hardcoding in HTML
