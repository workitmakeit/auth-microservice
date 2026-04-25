import { Discord, Google } from "arctic";

export type Provider = Discord | Google;

export const provider_names = ["discord", "google"] as const;
export type ProviderName = typeof provider_names[number];

export const get_provider = (provider: string, env: Env): Provider | null => {
    const redirect_uri = new URL(`/callback/${provider}`, env.BASE_URL).toString();

    switch (provider) {
        case "discord":
            return new Discord(env.DISCORD_CLIENT_ID, env.DISCORD_CLIENT_SECRET, redirect_uri);
        case "google":
            return new Google(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirect_uri);
        default:
            return null;
    }
};

export const get_scopes = (provider: string): string[] => {
    switch (provider) {
        case "discord":
            return ["identify", "email"];
        case "google":
            return ["openid", "email", "profile"];
        default:
            return [];
    }
};

// generic user info interface that all providers will conform to
interface UserInfo {
    id: string;
    username: string;
    discriminator?: string;
    email?: string;
    avatar?: string;
}

export const get_user_info = async (provider: string, access_token: string): Promise<UserInfo> => {
    switch (provider) {
        case "discord": {
            const response = await fetch("https://discord.com/api/users/@me", {
                headers: {
                    "Authorization": `Bearer ${access_token}`
                }
            });

            if (!response.ok) {
                throw new Error("Failed to fetch user info from Discord");
            }

            const data = await response.json() as {
                id: string;
                username: string;
                discriminator: string;
                email?: string;
                avatar?: string;
            };

            return {
                id: data.id,
                username: data.username,
                discriminator: data.discriminator,
                email: data.email,
                avatar: data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : undefined
            };
        }
        case "google": {
            const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
                headers: {
                    Authorization: `Bearer ${access_token}`
                }
            });

            if (!response.ok) {
                throw new Error("Failed to fetch user info from Google");
            }

            const data = await response.json() as {
                sub: string;
                name: string;
                email?: string;
                picture?: string;
            };

            return {
                id: data.sub,
                username: data.name,
                email: data.email,
                avatar: data.picture
            };
        }
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
};

export const handle_provider_names = async (request: Request, env: Env) => {
    return new Response(JSON.stringify({ providers: provider_names }), {
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*", // TODO: should this be restricted to allowed origins?
            "Access-Control-Allow-Methods": "GET",
            "Access-Control-Allow-Headers": "Authorization, Content-Type"
        }
    });
};

export const provider_friendly_names: Record<ProviderName, string> = {
    discord: "Discord",
    google: "Google"
};
