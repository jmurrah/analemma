"use client";

import { use } from "react";
import GoogleSignInButton from "@/features/auth/components/GoogleSignInButton";

export default function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const resolvedParams = searchParams ? use(searchParams) : undefined;
  const showDenied = resolvedParams?.error === "AccessDenied";

  return (
    <main className="h-full w-full flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-semibold">
        Sign in to <span className="font-bold">analemma</span>
      </h1>
      {showDenied ? (
        <p className="text-sm text-red-600">
          Access denied. Please use an allowed account.
        </p>
      ) : null}
      <div className="w-full max-w-xs">
        <GoogleSignInButton />
      </div>
    </main>
  );
}
