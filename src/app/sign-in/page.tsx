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
    <div className="w-full h-full flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-5xl">
        Welcome to <span className="text-[var(--primary)]">analemma</span>
      </h1>
      {showDenied ? (
        <p className="text-red-500">
          Access denied. Please use an allowed account.
        </p>
      ) : null}
      <div className="w-full max-w-xs">
        <GoogleSignInButton />
      </div>
    </div>
  );
}
