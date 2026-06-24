import "server-only";
import type { Session } from "next-auth";

export const MAX_PROJECTS_PER_OWNER = 10;
export const MAX_USERS_PER_OWNER = 10;
export const MAX_EDIT_USERS_PER_OWNER = 5;
export const MAX_VIEW_USERS_PER_OWNER = 5;



export type WorkspacePermission = "edit" | "view";

function parseEnvArray(value?: string) {
    if (!value) return [];

    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[")) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed
                    .map((item) => String(item).trim())
                    .filter(Boolean);
            }
        } catch {
            // Fall through to comma-splitting below.
        }
    }

    return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

export function getSuperadminCredentials() {
    const usernames = parseEnvArray(
        process.env.AUTH_USERNAMES ??
            process.env.AUTH_USERNAME ??
            process.env.NEXT_PUBLIC_AUTH_USERNAME,
    );
    const passwords = parseEnvArray(
        process.env.AUTH_PASSWORDS ??
            process.env.AUTH_PASSWORD ??
            process.env.NEXT_PUBLIC_AUTH_PASSWORD,
    );

    return usernames
        .map((username, index) => ({
            username,
            password: passwords[index],
        }))
        .filter((entry) => entry.username && entry.password);
}

export function findSuperadmin(username?: string, password?: string) {
    return getSuperadminCredentials().find(
        (entry) => entry.username === username && entry.password === password,
    );
}

export function isReservedSuperadminUsername(username: string) {
    return getSuperadminCredentials().some((entry) => entry.username === username);
}

export function canEditWorkspace(
    session: Pick<Session, "user"> | null,
) {
    return session?.user?.permission === "edit";
}

export function getOwnerUsername(session: Pick<Session, "user"> | null) {
    return session?.user?.ownerUsername ?? null;
}
