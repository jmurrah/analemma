"use client";

import { useEffect, useMemo, useState } from "react";
import { APP_TIME_ZONE, TIME_LOCALE } from "@/constants/time";
import type { LocationEnv } from "@/types/domain/location";
import { getTimes } from "@/utils/astronomy/solarLunar";

type SunsetCountdownProps = {
  location: LocationEnv;
  sunsetIso: string;
};

const CLOCK_TICK_MS = 1000;
const DAY_MS = 86_400_000;

const isValidDate = (value: Date | null): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

const parseSunsetIso = (value: string): Date | null => {
  const parsed = new Date(value);
  return isValidDate(parsed) ? parsed : null;
};

const getSunsetForDate = (
  date: Date,
  latitude: number,
  longitude: number,
): Date | null => {
  const sunTimes = getTimes(date, latitude, longitude);
  const sunset = sunTimes.sunset;
  return sunset instanceof Date && isValidDate(sunset) ? sunset : null;
};

const findNextSunset = (
  reference: Date,
  latitude: number,
  longitude: number,
): Date | null => {
  const todaySunset = getSunsetForDate(reference, latitude, longitude);
  if (todaySunset && todaySunset.getTime() > reference.getTime()) {
    return todaySunset;
  }

  const tomorrow = new Date(reference.getTime() + DAY_MS);
  return getSunsetForDate(tomorrow, latitude, longitude);
};

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

const formatSunset = (date: Date | null): string => {
  if (!isValidDate(date)) return "Unavailable";
  return new Intl.DateTimeFormat(TIME_LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: APP_TIME_ZONE,
  }).format(date);
};

const formatCountdownCompact = (target: Date | null, now: Date): string => {
  if (!isValidDate(target)) {
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
  location,
  sunsetIso,
}: SunsetCountdownProps) {
  const { label, latitude, longitude } = location;
  const [now, setNow] = useState<Date>(() => new Date());
  const [sunsetTime, setSunsetTime] = useState<Date | null>(() =>
    parseSunsetIso(sunsetIso),
  );
  const timeZoneName = useMemo(getTimeZoneName, []);

  useEffect(() => {
    setSunsetTime(parseSunsetIso(sunsetIso));
  }, [sunsetIso]);

  useEffect(() => {
    const intervalId = window.setInterval(
      () => setNow(new Date()),
      CLOCK_TICK_MS,
    );
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    if (sunsetTime && sunsetTime.getTime() > now.getTime()) {
      return;
    }

    const upcomingSunset = findNextSunset(now, latitude, longitude);
    if (
      upcomingSunset &&
      (!sunsetTime || upcomingSunset.getTime() !== sunsetTime.getTime())
    ) {
      setSunsetTime(upcomingSunset);
    }
  }, [latitude, longitude, now, sunsetTime]);

  const clock = useMemo(() => formatClock(now), [now]);
  const sunsetLabel = useMemo(() => formatSunset(sunsetTime), [sunsetTime]);
  const countdownCompact = useMemo(
    () => formatCountdownCompact(sunsetTime, now),
    [sunsetTime, now],
  );

  return (
    <>
      <div className="w-full flex justify-between text-[var(--text-muted)]">
        <p>
          {`\u{1F4CD}`} {label}
        </p>
        <div className="flex items-center gap-1.5 text-sm">
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
              {countdownCompact} until next sunset.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
