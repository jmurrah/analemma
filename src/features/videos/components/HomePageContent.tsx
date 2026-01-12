"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { SignedVideo } from "@/features/videos/services/getSignedVideos";
import VideoGallery from "@/features/videos/components/VideoGallery";
import FavoritesGallery from "@/features/videos/components/FavoritesGallery";
import SunsetCountdown from "@/features/sunlight/components/SunsetCountdown";
import type { LocationEnv } from "@/types/domain/location";

export type HomePageContentProps = {
  videos: SignedVideo[];
  location: LocationEnv;
  sunsetIso: string;
};

// Month names for search matching
const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

export function HomePageContent({
  videos,
  location,
  sunsetIso,
}: HomePageContentProps) {
  const [query, setQuery] = useState("");

  const filteredVideos = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();

    if (!trimmedQuery) {
      return videos;
    }

    // Split query by spaces to create multiple filter terms
    const queryTerms = trimmedQuery
      .split(/\s+/)
      .map((term) =>
        // Normalize each term: remove slashes, dashes, commas, ordinal suffixes
        term.replace(/[,\-\/]+/g, "").replace(/(\d+)(st|nd|rd|th)/g, "$1"),
      )
      .filter((term) => term.length > 0);

    if (queryTerms.length === 0) {
      return videos;
    }

    return videos.filter((video) => {
      // Video keys are just filenames like "20260110_sunset.mp4"
      const fileDate = video.key.slice(0, 8); // YYYYMMDD

      if (fileDate.length !== 8 || !/^\d{8}$/.test(fileDate)) {
        return false;
      }

      const year = fileDate.slice(0, 4);
      const month = fileDate.slice(4, 6);
      const day = fileDate.slice(6, 8);
      const monthIndex = Number.parseInt(month, 10) - 1;
      const monthName = MONTH_NAMES[monthIndex] || "";

      // Build a searchable string containing all representations of this date
      const searchableString = [
        fileDate, // 20260110
        year, // 2026
        month, // 01
        day, // 10
        monthName, // january
        `${month}${day}${year}`, // 01102026 (MM/DD/YYYY without slashes)
        `${year}${month}${day}`, // 20260110 (YYYY-MM-DD without slashes)
        `${month}${day}`, // 0110 (MM/DD)
        `${day}${month}`, // 1001 (DD/MM)
      ]
        .join(" ")
        .toLowerCase();

      // All query terms must match (AND logic)
      return queryTerms.every((term) => searchableString.includes(term));
    });
  }, [query, videos]);

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
