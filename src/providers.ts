import { Discord } from "arctic";

export type Provider = Discord;

export const get_provider = (provider: string, env: Env): Provider | null => {
    const redirect_uri = new URL(`/callback/${provider}`, env.BASE_URL).toString();

    switch (provider) {
        case "discord":
            return new Discord(env.DISCORD_CLIENT_ID, env.DISCORD_CLIENT_SECRET, redirect_uri);
        default:
            return null;
    }
};

export const get_scopes = (provider: string): string[] => {
    switch (provider) {
        case "discord":
            return ["identify", "email"];
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
        case "discord":
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
                avatar: data.avatar
            };
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
};
