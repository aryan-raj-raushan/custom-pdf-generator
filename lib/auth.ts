import "server-only";
import type { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getDb } from "@/lib/mongodb";
import { findSuperadmin } from "@/lib/access";
import type { AppUser } from "@/types/app-user";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                // Check superadmin array first
                const superadmin = findSuperadmin(
                    credentials?.username,
                    credentials?.password,
                );
                if (superadmin) {
                    return {
                        id: `superadmin:${superadmin.username}`,
                        name: superadmin.username,
                        username: superadmin.username,
                        ownerUsername: superadmin.username,
                        role: "superadmin",
                        permission: "edit",
                    } as User;
                }

                // Workspace users
                const db = await getDb();
                const user = await db.collection<AppUser>("users").findOne({
                    username: credentials?.username,
                    password: credentials?.password,
                });

                if (user?._id) {
                    return {
                        id: user._id.toString(),
                        name: user.username,
                        username: user.username,
                        ownerUsername: user.ownerUsername,
                        role: "user",
                        permission: user.permission,
                    } as User;
                }

                return null;
            },
        }),
    ],

    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60,
    },

    pages: {
        signIn: "/login",
    },

    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                const u = user as User & {
                    role: "superadmin" | "user";
                    username: string;
                    ownerUsername: string;
                    permission: "edit" | "view";
                };
                token.id = u.id;
                token.role = u.role;
                token.username = u.username;
                token.ownerUsername = u.ownerUsername;
                token.permission = u.permission;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as "superadmin" | "user";
                session.user.username = token.username as string;
                session.user.ownerUsername = token.ownerUsername as string;
                session.user.permission = token.permission as "edit" | "view";
            }
            return session;
        },
    },
};