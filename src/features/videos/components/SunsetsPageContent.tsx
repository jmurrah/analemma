"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { SignedVideo } from "@/features/videos/services/getSignedVideos";
import VideoGallery from "@/features/videos/components/VideoGallery";
import FavoritesGallery from "@/features/videos/components/FavoritesGallery";

export type SunsetsPageContentProps = {
  videos: SignedVideo[];
};

export function SunsetsPageContent({ videos }: SunsetsPageContentProps) {
  const [query, setQuery] = useState("");

  const filteredVideos = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();

    if (!trimmedQuery) {
      return videos;
    }

    return videos.filter((video) => {
      // Video keys are like "20260110_sunset.mp4"
      const filename = video.key.toLowerCase();

      // Try to extract date components from filename (YYYYMMDD format)
      const dateMatch = filename.match(/^(\d{4})(\d{2})(\d{2})/);

      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        const restOfFilename = filename.slice(8); // Everything after YYYYMMDD

        // Match if query matches any of these components:
        // - Year (e.g., "2026")
        // - Month (e.g., "01")
        // - Day (e.g., "10")
        // - Rest of filename (e.g., "_sunset.mp4")
        return (
          year.includes(trimmedQuery) ||
          month === trimmedQuery ||
          day === trimmedQuery ||
          restOfFilename.includes(trimmedQuery)
        );
      }

      // Fallback: if filename doesn't match expected format, search entire filename
      return filename.includes(trimmedQuery);
    });
  }, [query, videos]);

  const showingFiltered = query.trim().length > 0;

  return (
    <div className="flex h-full w-full flex-col gap-16">
      <div className="text-center">
        <h1 className="text-3xl">Sunsets</h1>
        <div className="mx-auto mt-2 w-full max-w-md relative border-[var(--accent)]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            size={18}
          />
          <Input
            type="text"
            placeholder="Search videos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-10 text-[var(--text)]"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text)] cursor-pointer"
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-16">
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
              showingFiltered ? "No sunsets found." : "No videos to display."
            }
          />
        </div>
      </div>
    </div>
  );
}
