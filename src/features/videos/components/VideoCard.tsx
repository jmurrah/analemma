"use client";

import { useState } from "react";
import type { SignedVideo } from "@/features/videos/services/getSignedVideos";
import { VideoPlayer } from "@/features/videos/components/VideoPlayer";
import { VideoCardMeta } from "@/features/videos/components/VideoCardMeta";
import { VideoCardActions } from "@/features/videos/components/VideoCardActions";

type VideoCardProps = {
  video: SignedVideo;
  isFavorited: boolean;
  onToggleFavorite: () => void;
};

export function VideoCard({
  video,
  isFavorited,
  onToggleFavorite,
}: VideoCardProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);

  return (
    <div className="w-full max-w-xs overflow-hidden">
      <VideoPlayer video={video} onSourceReady={setResolvedSrc} />
      <div
        className="flex items-center justify-between px-2 pt-1 pb-2 border-t border-[var(--primary)]"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--primary) 10%, transparent) 30%, color-mix(in srgb, var(--bg) 80%, transparent) 100%)",
        }}
      >
        <VideoCardMeta videoKey={video.key} videoSize={video.size} />
        <VideoCardActions
          video={video}
          resolvedSrc={resolvedSrc}
          isFavorited={isFavorited}
          onToggleFavorite={onToggleFavorite}
        />
      </div>
    </div>
  );
}
