"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { SignedVideo } from "@/features/videos/services/getSignedVideos";
import VideoGallery from "@/features/videos/components/VideoGallery";
import FavoritesGallery from "@/features/videos/components/FavoritesGallery";
import SunsetCountdown from "@/features/sunlight/components/SunsetCountdown";
import type { LocationEnv } from "@/types/domain/location";
import { useVideoSearch } from "@/features/videos/hooks/useVideoSearch";

export type HomePageContentProps = {
  videos: SignedVideo[];
  location: LocationEnv;
  sunsetIso: string;
};

export function HomePageContent({
  videos,
  location,
  sunsetIso,
}: HomePageContentProps) {
  const [query, setQuery] = useState("");
  const filteredVideos = useVideoSearch(videos, query);
  const showingFiltered = query.trim().length > 0;

  return (
    <div className="flex h-full w-full flex-col gap-16">
      <SunsetCountdown location={location} sunsetIso={sunsetIso} />
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <div className="mx-auto w-full max-w-md relative border-[var(--accent)]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              size={18}
            />
            <Input
              type="text"
              placeholder="Search by date..."
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
