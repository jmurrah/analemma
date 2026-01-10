import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AUTH_ROUTES } from "@/constants/auth";
import { locationEnv } from "@/config/env.server";
import { FavoritesProvider } from "@/features/favorites/components/FavoritesProvider";
import SunsetCountdown from "@/features/sunlight/components/SunsetCountdown";
import VideoGallery from "@/features/videos/components/VideoGallery";
import FavoritesGallery from "@/features/videos/components/FavoritesGallery";
import { getSignedVideos } from "@/features/videos/services/getSignedVideos";
import { fetchFavorites } from "@/lib/favorites/favoritesApi";
import { getTimes } from "@/utils/astronomy/solarLunar";

export const dynamic = "force-dynamic";

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

  const [signedVideos, favoritesResult] = await Promise.all([
    getSignedVideos({ pageSize: 20 }),
    fetchFavorites().catch(() => ({ keys: [] as string[] })),
  ]);

  return (
    <FavoritesProvider initialFavorites={favoritesResult.keys}>
      <div className="flex h-full w-full flex-col gap-12">
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
        <div className="flex flex-col gap-12">
          <div className="w-full text-center">
            <h1 className="text-2xl">Favorite Sunsets</h1>
            <FavoritesGallery videos={signedVideos} maxCount={20} />
          </div>
          <div className="w-full text-center">
            <h1 className="text-2xl">Recent Sunsets</h1>
            <VideoGallery videos={signedVideos.slice(0, 5)} />
          </div>
        </div>
      </div>
    </FavoritesProvider>
  );
}
