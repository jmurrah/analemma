"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "../services/authClient";

type GoogleSignInButtonProps = {
  onStarted?: () => void;
  onSettled?: () => void;
};

export default function GoogleSignInButton({
  onStarted,
  onSettled,
}: GoogleSignInButtonProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClick = async () => {
    try {
      setErrorMessage(null);
      onStarted?.();
      await signInWithGoogle();
      router.replace("/");
    } catch (error) {
      setErrorMessage("Failed to sign in with Google. Please try again.");
      console.error("Google sign-in failed", error);
    } finally {
      onSettled?.();
    }
  };

  return (
    <div className="w-full">
      <Button
        onClick={handleClick}
        className="flex w-full gap-2 justify-center items-center h-12"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 18 18"
          aria-hidden="true"
          focusable="false"
        >
          <path
            fill="#4285f4"
            d="M17.64 9.2q-.002-.956-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
          />
          <path
            fill="#34a853"
            d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.26c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18"
          />
          <path
            fill="#fbbc05"
            d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042z"
          />
          <path
            fill="#ea4335"
            d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71"
          />
        </svg>
        <span className="text-base">Sign in with Google</span>
      </Button>
      {errorMessage ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
