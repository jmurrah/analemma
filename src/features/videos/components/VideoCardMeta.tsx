import { extractDateFromFilename } from "@/utils/date/extractDateFromFilename";
import { formatFileSize } from "@/utils/date/formatFileSize";

type VideoCardMetaProps = {
  videoKey: string;
  videoSize: number;
};

export function VideoCardMeta({ videoKey, videoSize }: VideoCardMetaProps) {
  return (
    <div className="text-sm text-[var(--text-muted)]">
      <span>{extractDateFromFilename(videoKey)}</span>
      <span className="mx-2">•</span>
      <span className="text-xs">{formatFileSize(videoSize)}</span>
    </div>
  );
}
