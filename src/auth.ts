import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { authEnv } from "@/config/env.server";
import { AUTH_ROUTES } from "@/constants/auth";
import { parseAllowlist } from "@/types/auth";

const allowedEmails = parseAllowlist(authEnv.ALLOWED_EMAILS);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: authEnv.GOOGLE_CLIENT_ID,
      clientSecret: authEnv.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: AUTH_ROUTES.signIn,
    error: AUTH_ROUTES.signIn,
  },
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email) return false;
      return allowedEmails.includes(email);
    },
  },
  secret: authEnv.NEXTAUTH_SECRET,
});
