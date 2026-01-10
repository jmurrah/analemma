"use client";

import { useMemo } from "react";
import { useFavorites } from "@/features/favorites/components/FavoritesProvider";
import VideoGallery from "@/features/videos/components/VideoGallery";
import type { SignedVideo } from "@/features/videos/services/getSignedVideos";

type FavoritesGalleryProps = {
  videos: SignedVideo[];
  maxCount?: number;
};

export default function FavoritesGallery({
  videos,
  maxCount,
}: FavoritesGalleryProps) {
  const { favorites } = useFavorites();

  const favoriteVideos = useMemo(() => {
    const filtered = videos.filter((v) => favorites.has(v.key));
    return maxCount ? filtered.slice(0, maxCount) : filtered;
  }, [videos, favorites, maxCount]);

  return (
    <VideoGallery
      videos={favoriteVideos}
      emptyMessage="No favorite videos yet."
    />
  );
}
