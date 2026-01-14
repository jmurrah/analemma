"use client";

import { useEffect, useMemo, useState } from "react";
import { CLOCK_TICK_MS } from "@/constants/time";
import type { LocationEnv } from "@/types/domain/location";
import { Info } from "lucide-react";
import {
  formatSunset,
  formatSunsetDate,
  formatCountdownCompact,
} from "@/features/sunlight/utils/sunsetFormatters";
import { useSunsetCalculations } from "@/features/sunlight/hooks/useSunsetCalculations";

type SunsetCountdownProps = {
  location: LocationEnv;
  sunsetIso: string;
};

export default function SunsetCountdown({
  location,
  sunsetIso,
}: SunsetCountdownProps) {
  const { latitude, longitude } = location;
  const [now, setNow] = useState<Date>(() => new Date());

  const sunsetTime = useSunsetCalculations(sunsetIso, latitude, longitude, now);

  useEffect(() => {
    const intervalId = window.setInterval(
      () => setNow(new Date()),
      CLOCK_TICK_MS,
    );
    return () => window.clearInterval(intervalId);
  }, []);

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
    <div className="flex flex-col gap-2 items-center">
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
        <div className="text-[var(--text-muted)] flex items-center justify-center gap-2">
          <Info size={16} className="self-end mb-1" />
          <span>Videos upload daily around 9:00 PM ET</span>
        </div>
      </div>
    </div>
  );
}
