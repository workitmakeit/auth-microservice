export const handle_frontend = async (request: Request) => {
    return new Response(`
        <html>
            <head>
              <script>
                  const hide_providers = () => {
                     document.addEventListener("DOMContentLoaded", () => {
                         document.getElementById("providers").style.display = "none";
                         document.getElementById("logout").style.display = "block";
                     });
                  }

                  // if token in url params, store in localStorage and remove from url
                  const url_params = new URLSearchParams(window.location.search);
                  const token = url_params.get("token");
                  if (token) {
                      localStorage.setItem("token", token);
                      url_params.delete("token");
                      const new_url = window.location.pathname + "?" + url_params.toString();
                      window.history.replaceState({}, "", new_url);

                      hide_providers();
                  }

                  // if token already in localStorage, show logout button and hide providers
                  if (localStorage.getItem("token")) {
                      hide_providers();
                  }

                  const logout = () => {
                      localStorage.removeItem("token");
                      window.location.reload();
                  };
              </script>
            </head>
            <body>
                <h1>Login</h1>

                <div id="providers">
                  <a href="/login/discord">Login with Discord</a><br>
                </div>

                <button id="logout" style="display: none" onclick="logout()">Logout</button>
            </body>
        </html>
    `, {
        headers: { "Content-Type": "text/html" }
    });
}
