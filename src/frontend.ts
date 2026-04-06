export const handle_frontend = async () => new Response(`
        <html>
            <head>
              <script>
                  if (document.cookie.includes("sso_logged_in=true")) {
                      // if ui state cookie set, hide providers and show logout as well as fetching user details to show in logout button
                      const user_promise = fetch("/me").then(res => res.json());

                      document.addEventListener("DOMContentLoaded", () => {
                         document.getElementById("providers").style.display = "none";

                         const logout_btn = document.getElementById("logout");
                         logout_btn.style.display = "block";

                         user_promise.then(data => {
                             let button_text = \`Log out from \${data.user.username}\`;
                             if (data.user.discriminator && data.user.discriminator !== "0") {
                                 button_text += \`#\${data.user.discriminator}\`;
                             }
                             logout_btn.innerText = button_text;
                         });
                     });
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
        headers: { "Content-Type": "text/html" }
    }
);

// TODO: make this way prettier, maybe serve a little prebuilt react app or serve from github pages
