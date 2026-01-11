"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import type { SignedVideo } from "@/features/videos/services/getSignedVideos";
import VideoGallery from "@/features/videos/components/VideoGallery";
import FavoritesGallery from "@/features/videos/components/FavoritesGallery";

export type SunsetsPageContentProps = {
  videos: SignedVideo[];
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

export function SunsetsPageContent({ videos }: SunsetsPageContentProps) {
  const [query, setQuery] = useState("");

  const filteredVideos = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();

    if (!trimmedQuery) {
      return videos;
    }

    // Normalize query: remove slashes, dashes, commas, ordinal suffixes
    const normalizedQuery = trimmedQuery
      .replace(/[\s,\-\/]+/g, "")
      .replace(/(\d+)(st|nd|rd|th)/g, "$1");

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

      // Simple contains check
      return searchableString.includes(normalizedQuery);
    });
  }, [query, videos]);

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
            placeholder="Search by date (e.g., 10, ja, jan 18th, 2026)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="text-center"
          />
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
