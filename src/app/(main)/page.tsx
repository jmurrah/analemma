import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AUTH_ROUTES } from "@/constants/auth";
import { locationEnv } from "@/config/env.server";
import SunsetCountdown from "@/features/sunlight/components/SunsetCountdown";
import VideoGallery from "@/features/videos/components/VideoGallery";
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
        location={locationEnv}
        sunsetIso={sunsetTime.toISOString()}
      />
      <div className="w-full text-center">
        <h1 className="text-3xl">Live View</h1>
        <div>
          <p>this is where the live view is</p>
        </div>
      </div>
      <div>
        <div className="w-full flex justify-between">
          <h1 className="text-2xl">Favorite Sunsets</h1>
          <p>View all sunsets</p>
        </div>
        <div></div>
      </div>
      <div>
        <div className="w-full flex justify-between">
          <h1 className="text-2xl">Recent Sunsets</h1>
          <p>View all sunsets</p>
        </div>
        <div></div>
      </div>
      <div>
        <VideoGallery />
      </div>
    </div>
  );
}
