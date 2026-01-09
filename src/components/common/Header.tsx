import SignOutButton from "@/features/auth/components/SignOutButton";

export default function Header() {
  return (
    <header className="w-full mb-4">
      <div className="w-fill flex justify-between">
        <h1 className="text-[var(--primary)] text-3xl">analemma</h1>
        <SignOutButton />
      </div>
    </header>
  );
}
