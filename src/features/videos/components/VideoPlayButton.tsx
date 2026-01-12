import { Play } from "lucide-react";

type VideoPlayButtonProps = {
  onPlay: () => void;
  isPlaying: boolean;
};

export function VideoPlayButton({ onPlay, isPlaying }: VideoPlayButtonProps) {
  if (isPlaying) return null;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ zIndex: 20, transform: "translateZ(2px)" }}
    >
      <div
        onPointerUp={onPlay}
        className="pointer-events-auto flex items-center justify-center rounded-full p-4 text-[var(--text)] hover:text-[var(--primary)] cursor-pointer"
        style={{
          backgroundColor: "var(--surface2)",
          transform: "translateZ(1px)",
        }}
        role="button"
        tabIndex={0}
        aria-label="Play video"
      >
        <Play size={28} />
      </div>
    </div>
  );
}
