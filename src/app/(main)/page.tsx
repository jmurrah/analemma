import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AUTH_ROUTES } from "@/constants/auth";
import { locationEnv } from "@/config/env.server";
import SunsetCountdown from "@/features/sunlight/components/SunsetCountdown";
import { getTimes } from "@/utils/astronomy/solarLunar";

export default async function HomePage() {
  const session = await auth();
  if (!session) {
    redirect(AUTH_ROUTES.signIn);
  }

  const sunTimes = getTimes(
    new Date(),
    locationEnv.latitude,
    locationEnv.longitude,
  );
  const sunsetTime = sunTimes.sunset;

  if (!(sunsetTime instanceof Date)) {
    throw new Error("Unable to determine today's sunset time");
  }

  return (
    <div className="w-full h-full flex flex-col gap-12">
      <SunsetCountdown
        locationLabel={locationEnv.label}
        sunsetIso={sunsetTime.toISOString()}
      />
      <div className="w-full">
        <p>Live View</p>
      </div>
    </div>
  );
}
