import { signIn } from "next-auth/react";

export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { callbackUrl: "/" });
}
