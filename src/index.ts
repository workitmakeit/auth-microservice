import { AutoRouter } from "itty-router";

import { handle_login } from "./login";
import { handle_callback } from "./callback";
import { handle_frontend } from "./frontend";

const router = AutoRouter();

router.get("/login/:provider", handle_login)
    .get("/callback/:provider", handle_callback)
    .get("/", handle_frontend);

export default router;
