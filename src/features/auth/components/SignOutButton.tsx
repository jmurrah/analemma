"use client";

import { signOutFromApp } from "../services/authClient";

type SignOutButtonProps = {
  label?: string;
};

export default function SignOutButton({
  label = "Sign out",
}: SignOutButtonProps) {
  const handleClick = async () => {
    try {
      await signOutFromApp();
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  return (
    <button type="button" onClick={handleClick} className="link-underline">
      <h2>{label}</h2>
    </button>
  );
}
