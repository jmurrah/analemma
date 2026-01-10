import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AUTH_ROUTES } from "@/constants/auth";
import { FavoritesProvider } from "@/features/favorites/components/FavoritesProvider";
import VideoGallery from "@/features/videos/components/VideoGallery";
import FavoritesGallery from "@/features/videos/components/FavoritesGallery";
import { getSignedVideos } from "@/features/videos/services/getSignedVideos";
import { fetchFavorites } from "@/lib/favorites/favoritesApi";

export const dynamic = "force-dynamic";

export default async function SunsetsPage() {
  const session = await auth();
  if (!session) {
    redirect(AUTH_ROUTES.signIn);
  }

  const [signedVideos, favoritesResult] = await Promise.all([
    getSignedVideos({ pageSize: 50 }),
    fetchFavorites().catch(() => ({ keys: [] as string[] })),
  ]);

  return (
    <FavoritesProvider initialFavorites={favoritesResult.keys}>
      <div className="flex h-full w-full flex-col gap-10">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl">Sunsets</h1>
          <p className="text-gray-400">
            Browse the archive of captured sunsets.
          </p>
        </div>

        <div className="flex flex-col gap-12">
          <div className="w-full text-center">
            <h2 className="text-2xl">Favorite Sunsets</h2>
            <FavoritesGallery videos={signedVideos} maxCount={50} />
          </div>
          <div className="w-full text-center">
            <h2 className="text-2xl">All Sunsets</h2>
            <VideoGallery videos={signedVideos} />
          </div>
        </div>
      </div>
    </FavoritesProvider>
  );
}
