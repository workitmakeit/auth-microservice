export const validate_origin = (target_origin: string, env: Env) => {
    // extract origin from cookie domain (which may start with a dot for subdomain wildcarding)
    let cookie_origin: string;
    let is_wildcard = false;
    if (env.COOKIE_DOMAIN.startsWith(".")) {
        cookie_origin = `https://${env.COOKIE_DOMAIN.substring(1)}`;
        is_wildcard = true;
    } else {
        cookie_origin = `https://${env.COOKIE_DOMAIN}`;
    }

    // check if allowed, by either being an exact match or a subdomain if wildcarding is enabled
    // or is in the EXTRA_REDIRECT_ORIGINS list in env
    let pass_token_via_url = false;
    let is_allowed = false;
    if (target_origin === cookie_origin) {
        is_allowed = true;
    } else if (is_wildcard && target_origin.endsWith(`.${cookie_origin.substring(8)}`)) {
        is_allowed = true;
    } else if (env.EXTRA_REDIRECT_ORIGINS.split(",").map(s => s.trim()).includes(target_origin)) {
        is_allowed = true;
        pass_token_via_url = true;
    }

    return {
        is_allowed,
        pass_token_via_url
    }
}
