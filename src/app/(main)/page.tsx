import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
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
import { Button } from "@/components/ui/button";

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
      <div className="flex h-full w-full flex-col gap-10">
        <SunsetCountdown
          location={locationEnv}
          sunsetIso={sunsetTime.toISOString()}
        />
        <div className="flex flex-col gap-10">
          <div className="w-full text-center">
            <h1 className="text-2xl mb-3">Favorite Sunsets</h1>
            <FavoritesGallery videos={signedVideos} maxCount={20} />
          </div>
          <div className="w-full text-center">
            <h1 className="text-2xl mb-3">Recent Sunsets</h1>
            <VideoGallery videos={signedVideos.slice(0, 5)} />
          </div>
          <div className="w-full flex justify-center">
            <Button
              asChild
              variant="accent"
              className="group flex flex-wrap w-full max-w-sm gap-1.5 justify-center items-center cursor-pointer h-12"
            >
              <Link href="/sunsets">
                <p className="text-lg text-center text-wrap">
                  View All Sunsets
                </p>
                <ArrowRight
                  aria-hidden
                  className="size-5 shrink-0 transition-transform duration-150 group-hover:translate-x-1 text-[var(--bg)]"
                />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </FavoritesProvider>
  );
}
