import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AUTH_ROUTES } from "@/constants/auth";
import { FavoritesProvider } from "@/features/favorites/components/FavoritesProvider";
import { SunsetsPageContent } from "@/features/videos/components/SunsetsPageContent";
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
      <SunsetsPageContent videos={signedVideos} />
    </FavoritesProvider>
  );
}
