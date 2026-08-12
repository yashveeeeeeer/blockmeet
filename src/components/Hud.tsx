import { motion } from "framer-motion";

interface HudProps {
  soundOn: boolean;
  crtOn: boolean;
  perfMode: boolean;
  nightMode: boolean;
  xp: number;
  onToggleSound: () => void;
  onToggleCrt: () => void;
  onTogglePerf: () => void;
  onToggleNight: () => void;
}

export default function Hud({
  soundOn,
  crtOn,
  perfMode,
  nightMode,
  xp,
  onToggleSound,
  onToggleCrt,
  onTogglePerf,
  onToggleNight,
}: HudProps) {
  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="world-hud fixed top-0 left-0 right-0 z-50 flex items-center justify-end gap-3 px-3 py-2 pointer-events-none"
    >
      <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto">
        <HudButton
          active={soundOn}
          onClick={onToggleSound}
          label={soundOn ? "SOUND ON" : "SOUND OFF"}
          title="Toggle ambient music"
        />
        <HudButton
          active={nightMode}
          onClick={onToggleNight}
          label={nightMode ? "NIGHT" : "DAY"}
          title="Toggle day/night"
        />
        <HudButton
          active={crtOn}
          onClick={onToggleCrt}
          label="CRT"
          title="Toggle CRT effect"
        />
        <HudButton
          active={perfMode}
          onClick={onTogglePerf}
          label="PERF"
          title="Toggle performance mode"
        />
      </div>

      <div className="hud-xp flex items-center gap-2 min-w-[80px] sm:min-w-[120px] pointer-events-auto">
        <span className="text-[9px] sm:text-[10px] font-pixel text-pixel-green">
          XP
        </span>
        <div className="xp-bar-bg flex-1">
          <motion.div
            className="xp-bar-fill"
            initial={{ width: 0 }}
            animate={{ width: `${xp}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function HudButton({
  active,
  onClick,
  label,
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`font-pixel text-[9px] sm:text-[10px] px-2 py-2 border-2 transition-all duration-150 cursor-pointer select-none
        ${
          active
            ? "bg-pixel-green/30 border-pixel-green text-pixel-green"
            : "bg-pixel-dark/50 border-pixel-green/20 text-gray-400 hover:border-pixel-green/50 hover:text-gray-200"
        }`}
      style={{
        boxShadow: active
          ? "2px 2px 0px rgba(0,0,0,0.5)"
          : "1px 1px 0px rgba(0,0,0,0.3)",
      }}
    >
      {label}
    </button>
  );
}
