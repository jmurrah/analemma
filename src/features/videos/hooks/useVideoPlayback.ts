import { type RefObject, type ChangeEvent, useCallback } from "react";
import type { SignedVideo } from "@/features/videos/services/getSignedVideos";
import { fetchAndCacheVideo } from "@/features/videos/utils/videoBlobCache";

type UseVideoPlaybackParams = {
  videoRef: RefObject<HTMLVideoElement | null>;
  video: SignedVideo;
  hasTriggeredCache: boolean;
  setHasTriggeredCache: (value: boolean) => void;
  setDuration: (value: number) => void;
  setCurrentTime: (value: number) => void;
};

export const useVideoPlayback = ({
  videoRef,
  video,
  hasTriggeredCache,
  setHasTriggeredCache,
  setDuration,
  setCurrentTime,
}: UseVideoPlaybackParams) => {
  const togglePlayback = useCallback(() => {
    const element = videoRef.current;
    if (!element) return;

    if (element.paused) {
      if (!hasTriggeredCache) {
        setHasTriggeredCache(true);
        void fetchAndCacheVideo(video.key, video.signedUrl, video.etag);
      }

      void element.play().catch((error) => {
        console.error("Unable to start playback", error);
      });
    } else {
      element.pause();
    }
  }, [
    videoRef,
    video.key,
    video.signedUrl,
    video.etag,
    hasTriggeredCache,
    setHasTriggeredCache,
  ]);

  const handleLoadedMetadata = useCallback(() => {
    const element = videoRef.current;
    if (!element) return;
    setDuration(element.duration || 0);
  }, [videoRef, setDuration]);

  const handleTimeUpdate = useCallback(() => {
    const element = videoRef.current;
    if (!element) return;
    setCurrentTime(element.currentTime);
  }, [videoRef, setCurrentTime]);

  const handleSeek = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const element = videoRef.current;
      if (!element) return;

      const newTime = Number(event.target.value);
      element.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [videoRef, setCurrentTime],
  );

  return {
    togglePlayback,
    handleLoadedMetadata,
    handleTimeUpdate,
    handleSeek,
  };
};
