"use client";

import { useEffect, useMemo, useState } from "react";
import { APP_TIME_ZONE, TIME_LOCALE } from "@/constants/time";

type SunsetCountdownProps = {
  locationLabel: string;
  sunsetIso: string;
};

const CLOCK_TICK_MS = 1000;

const formatClock = (date: Date): string =>
  new Intl.DateTimeFormat(TIME_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: APP_TIME_ZONE,
  }).format(date);

const getTimeZoneName = (): string => {
  const formatter = new Intl.DateTimeFormat(TIME_LOCALE, {
    timeZone: APP_TIME_ZONE,
    timeZoneName: "short",
  });
  const part = formatter
    .formatToParts(new Date())
    .find((item) => item.type === "timeZoneName");
  return part?.value ?? "";
};

const formatSunset = (date: Date): string => {
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat(TIME_LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: APP_TIME_ZONE,
  }).format(date);
};

const formatCountdownCompact = (target: Date, now: Date): string => {
  if (Number.isNaN(target.getTime())) {
    return "--:--:--";
  }

  const diffMs = target.getTime() - now.getTime();
  const remainingMs = Math.max(diffMs, 0);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
};

export default function SunsetCountdown({
  locationLabel,
  sunsetIso,
}: SunsetCountdownProps) {
  const [now, setNow] = useState<Date>(() => new Date());
  const sunsetTime = useMemo(() => new Date(sunsetIso), [sunsetIso]);
  const timeZoneName = useMemo(getTimeZoneName, []);

  useEffect(() => {
    const intervalId = window.setInterval(
      () => setNow(new Date()),
      CLOCK_TICK_MS,
    );
    return () => window.clearInterval(intervalId);
  }, []);

  const clock = useMemo(() => formatClock(now), [now]);
  const sunsetLabel = useMemo(() => formatSunset(sunsetTime), [sunsetTime]);
  const countdownCompact = useMemo(
    () => formatCountdownCompact(sunsetTime, now),
    [sunsetTime, now],
  );

  return (
    <>
      <div className="w-full flex justify-between">
        <p>
          {`\u{1F4CD}`} {locationLabel}
        </p>
        <div className="flex items-center gap-1.5 text-sm text-[var(--text)]">
          <span>{clock}</span>
          <span>{timeZoneName}</span>
        </div>
      </div>
      <div className="w-full flex flex-col gap-2 items-center">
        <p className="text-xl">
          Sunset at {sunsetLabel} {timeZoneName}
        </p>
        <div className="w-full flex justify-center items-center gap-2 text-2xl bg-[var(--accent)] p-2 rounded-lg">
          <span aria-hidden className="icon-clock-count" />
          <div className="text-center">
            <p className="text-[var(--bg)] font-semibold">
              {countdownCompact} until sunset.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
