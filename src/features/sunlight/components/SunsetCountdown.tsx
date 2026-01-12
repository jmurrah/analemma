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

const formatSunset = (date: Date | null): string => {
  if (!isValidDate(date)) return "Unavailable";
  return new Intl.DateTimeFormat(TIME_LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: APP_TIME_ZONE,
  }).format(date);
};

const formatSunsetDate = (date: Date | null): string => {
  if (!isValidDate(date)) return "Unavailable";
  return new Intl.DateTimeFormat(TIME_LOCALE, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
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
  const { latitude, longitude } = location;
  const [now, setNow] = useState<Date>(() => new Date());
  const [sunsetTime, setSunsetTime] = useState<Date | null>(() =>
    parseSunsetIso(sunsetIso),
  );

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

  const sunsetLabel = useMemo(() => formatSunset(sunsetTime), [sunsetTime]);
  const sunsetDateLabel = useMemo(
    () => formatSunsetDate(sunsetTime),
    [sunsetTime],
  );
  const countdownCompact = useMemo(
    () => formatCountdownCompact(sunsetTime, now),
    [sunsetTime, now],
  );

  return (
    <div className="w-full border-[var(--accent)] bg-[var(--surface)] px-4 py-1 border-t-4 text-center">
      <p className="text-[var(--text-muted)]">
        Sunset at {sunsetLabel} on {sunsetDateLabel}
      </p>
      <p
        className="text-3xl font-semibold tracking-tight tabular-nums"
        suppressHydrationWarning
      >
        {countdownCompact}
      </p>
    </div>
  );
}
