"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import type { SignedVideo } from "@/features/videos/services/getSignedVideos";
import { parseQueryToYYYYMMDD } from "@/features/videos/utils/parseDateQuery";
import VideoGallery from "@/features/videos/components/VideoGallery";
import FavoritesGallery from "@/features/videos/components/FavoritesGallery";

export type SunsetsPageContentProps = {
  videos: SignedVideo[];
};

export function SunsetsPageContent({ videos }: SunsetsPageContentProps) {
  const [query, setQuery] = useState("");

  // Extract just the filename from keys (handles folder prefixes like "2025/January/...")
  const getFilename = (key: string) => {
    const lastSlash = key.lastIndexOf("/");
    return lastSlash >= 0 ? key.slice(lastSlash + 1) : key;
  };

  const filenames = useMemo(
    () => videos.map((v) => getFilename(v.key)),
    [videos],
  );

  const { filteredVideos, parseError } = useMemo(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return { filteredVideos: videos, parseError: false };
    }

    const datePrefix = parseQueryToYYYYMMDD(trimmedQuery, filenames);

    if (!datePrefix) {
      return { filteredVideos: [], parseError: true };
    }

    // Match against the filename portion of the key
    const filtered = videos.filter((video) =>
      getFilename(video.key).startsWith(datePrefix),
    );

    return { filteredVideos: filtered, parseError: false };
  }, [query, videos, filenames]);

  const showingFiltered = query.trim().length > 0;

  return (
    <div className="flex h-full w-full flex-col gap-10">
      <div className="text-center">
        <h1 className="text-3xl">Sunsets</h1>
        <p className="text-[var(--text-muted)]">
          Browse your archive of captured sunsets.
        </p>
        <div className="mx-auto mt-4 w-full max-w-md">
          <Input
            type="text"
            placeholder="Search by date (e.g., 20250115, 2025-01-15, Jan 15)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="text-center"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Try: 20250115, 2025-01-15, 1/15/2025, January 15th
          </p>
          {parseError && (
            <p className="mt-2 text-sm text-destructive">
              Could not parse date. Try 20250115 or Jan 15
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-10">
        {!showingFiltered && (
          <div className="w-full text-center">
            <h2 className="mb-3 text-2xl">Favorite Sunsets</h2>
            <FavoritesGallery videos={videos} maxCount={50} />
          </div>
        )}
        <div className="w-full text-center">
          <h2 className="mb-3 text-2xl">
            {showingFiltered ? "Search Results" : "All Sunsets"}
          </h2>
          <VideoGallery
            videos={filteredVideos}
            emptyMessage={
              showingFiltered
                ? "No sunsets found for this date."
                : "No videos to display."
            }
          />
        </div>
      </div>
    </div>
  );
}
