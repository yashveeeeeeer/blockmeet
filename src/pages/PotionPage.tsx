import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./potion.css";

const MP3_URL = import.meta.env.BASE_URL + "music/potion.mp3";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function PotionArtwork() {
  return (
    <svg className="potion-artwork" viewBox="0 0 64 64" role="img" aria-label="Pixel art bottle of green music potion" shapeRendering="crispEdges">
      <rect width="64" height="64" fill="#b9ddca" />
      <rect x="4" y="4" width="56" height="56" fill="#d9edda" />
      <rect x="8" y="9" width="4" height="4" fill="#f5c75b" />
      <rect x="53" y="41" width="4" height="4" fill="#f5c75b" />
      <rect x="44" y="10" width="3" height="3" fill="#4b8e6c" />
      <rect x="49" y="10" width="3" height="13" fill="#315d4b" />
      <rect x="45" y="22" width="7" height="3" fill="#315d4b" />
      <rect x="25" y="7" width="14" height="6" fill="#8d5933" />
      <rect x="23" y="12" width="18" height="5" fill="#d3a45c" />
      <rect x="26" y="17" width="12" height="9" fill="#28473d" />
      <rect x="21" y="24" width="22" height="5" fill="#28473d" />
      <rect x="17" y="29" width="30" height="25" fill="#28473d" />
      <rect x="21" y="30" width="22" height="20" fill="#eef3d9" />
      <rect x="21" y="37" width="22" height="13" fill="#61b07c" />
      <rect x="25" y="41" width="5" height="5" fill="#b8e7a3" />
      <rect x="31" y="39" width="4" height="4" fill="#d7f0ad" />
      <rect x="22" y="54" width="20" height="3" fill="#1d3c32" />
      <rect x="13" y="56" width="38" height="3" fill="#6fa281" opacity=".45" />
    </svg>
  );
}

function PlayIcon({ active }: { active: boolean }) {
  if (active) {
    return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 8h4v16h-4zm8 0h4v16h-4z" fill="currentColor" /></svg>;
  }
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 7v18l14-9z" fill="currentColor" /></svg>;
}

export default function PotionPage() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);

  useEffect(() => {
    document.title = "Potion · BLOCKMeet";
    window.scrollTo(0, 0);
    return () => { document.title = "BLOCKMeet"; };
  }, []);

  const togglePlayer = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try { await audio.play(); } catch { setAudioError(true); }
    } else {
      audio.pause();
    }
  };

  return (
    <div className="potion-page">
      <header className="potion-header">
        <Link className="potion-back" to="/"><span aria-hidden="true">←</span> Back to world</Link>
        <span className="potion-site-name">BLOCKMeet <span aria-hidden="true">/</span> Potion</span>
      </header>

      <main className="potion-main">
        <div className="potion-top-row">
          <p className="potion-eyebrow">A little shelf for focus</p>
          <select className="potion-picker" aria-label="Choose a potion" defaultValue="music">
            <option value="music">♫ Music</option>
          </select>
        </div>

        <section className="potion-section" aria-label="Music">
          <h1 className="potion-sr-only">Music</h1>

          <div className="potion-track">
            <div className="potion-track-row">
              <div className="potion-art-frame"><PotionArtwork /></div>
              <div className="potion-track-copy">
                <span className="potion-track-label">ON THE WORKBENCH</span>
                <h3>Om Namah Shivaya</h3>
                <p>Krishna Das · Live</p>
              </div>
              <button
                className="potion-play"
                type="button"
                disabled={audioError}
                aria-label={audioPlaying ? "Pause Om Namah Shivaya" : "Play Om Namah Shivaya"}
                aria-pressed={audioPlaying}
                onClick={togglePlayer}
              >
                <PlayIcon active={audioPlaying} />
              </button>
            </div>

            <audio
              ref={audioRef}
              src={MP3_URL}
              preload="metadata"
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
              onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
              onPlay={() => setAudioPlaying(true)}
              onPause={() => setAudioPlaying(false)}
              onEnded={() => { setAudioPlaying(false); setPosition(0); }}
              onError={() => setAudioError(true)}
            />
            <div className="potion-audio-controls">
              <label className="potion-sr-only" htmlFor="potion-seek">Seek through Om Namah Shivaya</label>
              <input id="potion-seek" type="range" min="0" max={duration || 1} value={Math.min(position, duration || 1)} step="0.1" disabled={audioError || !duration} onChange={(event) => { if (audioRef.current) audioRef.current.currentTime = Number(event.target.value); }} />
              <span>{formatTime(position)} / {formatTime(duration)}</span>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}
