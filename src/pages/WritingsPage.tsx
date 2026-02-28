import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { SITE } from "../config";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const BASE = import.meta.env.BASE_URL;

const GIF_FILES = [
  "hibike-euphonium-kumiko-oumae.gif",
  "anime-fri.gif",
  "anime-friere.gif",
  "anime-frieren.gif",
  "anime-frieren-2.gif",
  "anime-one-punch-man.gif",
  "black-clover-anime.gif",
  "black-clover-anime2.gif",
  "hanamaru-kindergarten-anime.gif",
  "natusko-hirose-hirose-natsuko.gif",
];

function ToggleButton({
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
      className={`font-pixel text-[6px] sm:text-[7px] px-2 py-1.5 border-2 transition-all duration-150 cursor-pointer select-none
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

export default function WritingsPage() {
  const navigate = useNavigate();
  const [nightMode, setNightMode] = useState(true);
  const [crtOn, setCrtOn] = useState(false);
  const [einkOn, setEinkOn] = useState(false);
  const [gifIdx, setGifIdx] = useState(0);

  const bgClass = nightMode ? "bg-pixel-dark" : "bg-[#e8e0d0]";
  const textClass = nightMode ? "text-gray-200" : "text-[#2a2a2a]";
  const subTextClass = nightMode ? "text-gray-400" : "text-[#5a5a5a]";
  const mutedClass = nightMode ? "text-gray-500" : "text-[#8a8a8a]";
  const cardBorder = nightMode ? "" : "border-[#b0a890]/60";
  const cardBg = nightMode ? "" : "bg-[#f5f0e4]/90";

  const wrapperClasses = [
    crtOn ? "crt-effect" : "",
    einkOn ? "eink-effect" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`${wrapperClasses} min-h-screen ${bgClass} ${textClass}`}>
      {/* Controls */}
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-end gap-1 sm:gap-2 px-3 py-2"
      >
        <ToggleButton
          active={!nightMode}
          onClick={() => setNightMode((n) => !n)}
          label={nightMode ? "NIGHT" : "DAY"}
          title="Toggle day/night"
        />
        <ToggleButton
          active={crtOn}
          onClick={() => setCrtOn((c) => !c)}
          label="CRT"
          title="Toggle CRT scanlines"
        />
        <ToggleButton
          active={einkOn}
          onClick={() => setEinkOn((e) => !e)}
          label="E-INK"
          title="Toggle e-ink / black & white"
        />
      </motion.div>

      <div className="max-w-3xl mx-auto px-4 pt-16 pb-12 sm:pt-20 sm:pb-20">
        <motion.button
          onClick={() => navigate("/")}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className={`font-pixel text-[8px] sm:text-[9px] text-pixel-green hover:text-pixel-gold transition-colors mb-10 sm:mb-14 cursor-pointer flex items-center gap-2 ${
            !nightMode ? "text-[#2a6a4a] hover:text-[#8a6a20]" : ""
          }`}
        >
          <span aria-hidden="true">&larr;</span> BACK TO WORLD
        </motion.button>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className={`font-pixel text-xl sm:text-3xl text-shadow-pixel mb-3 ${
            nightMode ? "text-pixel-gold" : "text-[#6a5020]"
          }`}
        >
          ATHENAEUM
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.3 }}
          className={`font-pixel text-[7px] sm:text-[8px] mb-12 sm:mb-16 ${mutedClass}`}
        >
          Writings &amp; personal views
        </motion.p>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-4"
        >
          {SITE.writings.map((w) => (
            <motion.a
              key={w.slug}
              href={w.url}
              target="_blank"
              rel="noopener noreferrer"
              variants={item}
              whileHover={{ x: 6, scale: 1.01 }}
              className={`pixel-card p-4 sm:p-6 block no-underline group cursor-pointer ${cardBorder} ${cardBg}`}
            >
              <span
                className={`font-pixel text-[7px] block mb-2 ${
                  nightMode ? "text-pixel-green/70" : "text-[#4a8a5a]"
                }`}
              >
                {w.date.replace(/-/g, ".")}
              </span>
              <span
                className={`font-pixel text-[10px] sm:text-xs group-hover:text-white transition-colors block mb-2 ${
                  nightMode
                    ? "text-pixel-gold"
                    : "text-[#6a5020] group-hover:text-[#2a2a2a]"
                }`}
              >
                {w.title}
              </span>
              <span
                className={`font-pixel text-[7px] sm:text-[8px] leading-relaxed block ${subTextClass}`}
              >
                {w.oneLiner}
              </span>
            </motion.a>
          ))}
        </motion.div>

        {SITE.writings.length === 0 && (
          <p className={`font-pixel text-[9px] text-center mt-20 ${mutedClass}`}>
            No writings yet. Check back soon.
          </p>
        )}

        {/* GIF carousel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-16 sm:mt-20 flex flex-col items-center"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setGifIdx((i) => (i + 1) % GIF_FILES.length)}
            className={`pixel-card p-2 cursor-pointer select-none ${cardBorder} ${cardBg}`}
            title="Click for next"
          >
            <img
              src={`${BASE}gifs/${GIF_FILES[gifIdx]}`}
              alt="Anime reading GIF"
              className="w-48 h-48 sm:w-56 sm:h-56 object-cover"
              draggable={false}
            />
          </motion.div>
          <p className={`font-pixel text-[6px] mt-3 ${mutedClass}`}>
            CLICK TO CHANGE
          </p>
        </motion.div>
      </div>
    </div>
  );
}
