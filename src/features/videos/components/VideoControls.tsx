import { type ChangeEvent } from "react";
import { Maximize2, Pause, Play } from "lucide-react";

type VideoControlsProps = {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlayback: () => void;
  onSeek: (event: ChangeEvent<HTMLInputElement>) => void;
  onFullscreen: () => void;
};

export function VideoControls({
  isPlaying,
  currentTime,
  duration,
  onTogglePlayback,
  onSeek,
  onFullscreen,
}: VideoControlsProps) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-2"
      style={{
        background:
          "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--surface) 80%, transparent) 40%, var(--surface) 100%)",
        zIndex: 20,
        transform: "translateZ(2px)",
      }}
    >
      <div
        onPointerUp={onTogglePlayback}
        className="flex shrink-0 items-center justify-center rounded-full text-[var(--text)] hover:text-[var(--primary)] cursor-pointer"
        style={{
          width: "32px",
          height: "40px",
        }}
        role="button"
        tabIndex={0}
        aria-label={isPlaying ? "Pause video" : "Play video"}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
      </div>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={currentTime}
        onChange={onSeek}
        className="w-full cursor-pointer"
        style={{ accentColor: "var(--primary)" }}
      />
      <div
        onPointerUp={onFullscreen}
        className="flex shrink-0 items-center justify-center rounded-full text-[var(--text)] hover:text-[var(--primary)] cursor-pointer"
        style={{
          width: "32px",
          height: "40px",
        }}
        role="button"
        tabIndex={0}
        aria-label="Toggle fullscreen"
      >
        <Maximize2 size={18} />
      </div>
    </div>
  );
}
