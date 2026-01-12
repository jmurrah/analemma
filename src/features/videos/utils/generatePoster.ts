/**
 * Generates a poster image (thumbnail) from a video blob.
 * This is particularly useful for iOS Safari which doesn't reliably
 * render video previews from blob URLs.
 *
 * @param videoBlob - The video blob to extract a frame from
 * @returns Promise that resolves to a data URL of the poster image, or empty string on failure
 */
export const generatePosterFromVideo = (videoBlob: Blob): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(videoBlob);

    video.src = objectUrl;
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => URL.revokeObjectURL(objectUrl);

    // Timeout to prevent hanging if video fails to load
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve("");
    }, 2000);

    video.onloadedmetadata = () => {
      // Seek to 0.1 seconds to get first frame
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      clearTimeout(timeoutId);
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const poster = canvas.toDataURL("image/jpeg");
        cleanup();
        resolve(poster);
      } else {
        cleanup();
        resolve("");
      }
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      cleanup();
      resolve("");
    };
  });
};
