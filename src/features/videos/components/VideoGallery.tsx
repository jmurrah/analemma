"use client";

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import type { SignedVideo } from "@/features/videos/services/getSignedVideos";
import { useFavorites } from "@/features/favorites/components/FavoritesProvider";
import {
  getCachedVideoBlob,
  fetchAndCacheVideo,
} from "@/features/videos/utils/videoBlobCache";

export type VideoGalleryProps = {
  videos: SignedVideo[];
  emptyMessage?: string;
};

const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

type VideoCardProps = {
  video: SignedVideo;
  isFavorited: boolean;
  onToggleFavorite: () => void;
};

function VideoCard({ video, isFavorited, onToggleFavorite }: VideoCardProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasTriggeredCache, setHasTriggeredCache] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let cancelled = false;

    const initializeSrc = async () => {
      const cachedUrl = await getCachedVideoBlob(video.key);
      if (cancelled) return;

      if (cachedUrl) {
        setSrc(cachedUrl);
        setHasTriggeredCache(true);
      } else {
        setSrc(video.signedUrl);
      }
      setIsReady(true);
    };

    void initializeSrc();

    return () => {
      cancelled = true;
    };
  }, [video.key, video.signedUrl]);

  const handlePlay = () => {
    if (hasTriggeredCache) return;
    setHasTriggeredCache(true);

    void fetchAndCacheVideo(video.key, video.signedUrl).then((blobUrl) => {
      if (blobUrl.startsWith("blob:")) {
        setSrc(blobUrl);
      }
    });
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60">
      <div
        className="relative w-full bg-black"
        style={{ aspectRatio: "16 / 9" }}
      >
        {isReady && src ? (
          <video
            ref={videoRef}
            className="block h-full w-full bg-black object-contain"
            src={src}
            controls
            preload="metadata"
            onPlay={handlePlay}
          />
        ) : (
          <div className="h-full w-full" />
        )}
      </div>
      <div className="flex items-center justify-between px-3 py-3">
        <div className="text-xs text-gray-400">
          {formatDateTime(video.lastModified)}
        </div>
        <button
          type="button"
          onClick={onToggleFavorite}
          className="rounded p-1 transition-colors hover:bg-slate-800"
          aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            size={18}
            className={
              isFavorited
                ? "fill-red-500 text-red-500"
                : "text-gray-400 hover:text-gray-300"
            }
          />
        </button>
      </div>
    </div>
  );
}

export default function VideoGallery({
  videos,
  emptyMessage = "No videos to display.",
}: VideoGalleryProps) {
  const { isFavorite, toggleFavorite } = useFavorites();

  if (videos.length === 0) {
    return <div className="text-sm text-gray-400">{emptyMessage}</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {videos.map((video) => (
        <VideoCard
          key={video.key}
          video={video}
          isFavorited={isFavorite(video.key)}
          onToggleFavorite={() => toggleFavorite(video.key)}
        />
      ))}
    </div>
  );
}
