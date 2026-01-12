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
    <header className="mb-16 w-full flex flex-col gap-4">
      <div className="w-fill flex flex-wrap gap-3">
        <h1 className="text-3xl text-[var(--primary)]">analemma</h1>
        {session && (
          <div className="flex items-center justify-center gap-4 text-lg ml-auto">
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
