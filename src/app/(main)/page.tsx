import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AUTH_ROUTES } from "@/constants/auth";
import { locationEnv } from "@/config/env.server";
import { FavoritesProvider } from "@/features/favorites/components/FavoritesProvider";
import { HomePageContent } from "@/features/videos/components/HomePageContent";
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
    getSignedVideos({ pageSize: 50 }),
    fetchFavorites().catch(() => ({ keys: [] as string[] })),
  ]);

  return (
    <FavoritesProvider initialFavorites={favoritesResult.keys}>
      <HomePageContent
        videos={signedVideos}
        location={locationEnv}
        sunsetIso={sunsetTime.toISOString()}
      />
    </FavoritesProvider>
  );
}
