import { useMemo } from "react";
import type { SignedVideo } from "@/features/videos/services/getSignedVideos";
import { MONTH_NAMES_LOWERCASE } from "@/constants/date";

export const useVideoSearch = (videos: SignedVideo[], query: string) => {
  return useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();

    if (!trimmedQuery) {
      return videos;
    }

    const queryTerms = trimmedQuery
      .split(/\s+/)
      .map((term) =>
        term.replace(/[,\-\/]+/g, "").replace(/(\d+)(st|nd|rd|th)/g, "$1"),
      )
      .filter((term) => term.length > 0);

    if (queryTerms.length === 0) {
      return videos;
    }

    return videos.filter((video) => {
      const fileDate = video.key.slice(0, 8);

      if (fileDate.length !== 8 || !/^\d{8}$/.test(fileDate)) {
        return false;
      }

      const year = fileDate.slice(0, 4);
      const month = fileDate.slice(4, 6);
      const day = fileDate.slice(6, 8);
      const monthIndex = Number.parseInt(month, 10) - 1;
      const monthName = MONTH_NAMES_LOWERCASE[monthIndex] || "";

      const searchableString = [
        fileDate,
        year,
        month,
        day,
        monthName,
        `${month}${day}${year}`,
        `${year}${month}${day}`,
        `${month}${day}`,
        `${day}${month}`,
      ]
        .join(" ")
        .toLowerCase();

      return queryTerms.every((term) => searchableString.includes(term));
    });
  }, [query, videos]);
};
