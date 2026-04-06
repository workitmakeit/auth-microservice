export const handle_frontend = async () => new Response(`
        <html>
            <head>
              <script>
                  const hide_providers = () => {
                     document.addEventListener("DOMContentLoaded", () => {
                         document.getElementById("providers").style.display = "none";
                         document.getElementById("logout").style.display = "block";
                     });
                  }

                  // if ui state cookie set, hide providers and show logout
                  if (document.cookie.includes("sso_logged_in=true")) {
                      hide_providers();
                  }
              </script>
            </head>
            <body>
                <h1>Login</h1>

                <div id="providers">
                  <a href="/login/discord">Login with Discord</a><br>
                </div>

                <a id="logout" style="display: none" href="/logout">Logout</a>
            </body>
        </html>
    `,
    {
        headers: { 'Content-Type': 'text/html' }
    }
);
