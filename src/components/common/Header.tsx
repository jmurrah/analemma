import Link from "next/link";
import { APP_TIME_ZONE, TIME_LOCALE } from "@/constants/time";
import { locationEnv } from "@/config/env.server";
import { auth } from "@/auth";
import SignOutButton from "@/features/auth/components/SignOutButton";

const formatCurrentTime = (): string =>
  new Intl.DateTimeFormat(TIME_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: APP_TIME_ZONE,
    timeZoneName: "short",
  }).format(new Date());

export default async function Header() {
  const session = await auth();
  const timeLabel = formatCurrentTime();

  return (
    <header className="mb-8 w-full flex flex-col gap-4">
      <div className="w-fill flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-3xl text-[var(--primary)]">
            <h1>analemma</h1>
          </Link>
        </div>
        {session && (
          <div className="flex items-center justify-center gap-10 text-lg">
            <Link href="/" className="link-underline">
              Home
            </Link>
            <Link href="/sunsets" className="link-underline">
              Sunsets
            </Link>
            <SignOutButton />
          </div>
        )}
      </div>
      <div className="w-full flex justify-between text-[var(--text-muted)]">
        <p>
          {`\u{1F4CD}`} {locationEnv.label}
        </p>
        <span className="text-sm" suppressHydrationWarning>
          {timeLabel}
        </span>
      </div>
    </header>
  );
}
