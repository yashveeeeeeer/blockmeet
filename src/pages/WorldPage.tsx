import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { SITE } from "../config";
import {
  initWorld,
  resizeWorld,
  renderFrame,
  destroyWorld,
  WorldState,
  isNightTime,
} from "../canvas/world";
import Hud from "../components/Hud";
import CTAButtons from "../components/CTAButtons";
import PixelCard from "../components/PixelCard";
import Modal from "../components/Modal";

const KONAMI = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];

const ATHENAEUM_VARIANT = 3;

function getTimeOfDayXp(): number {
  const now = new Date();
  const hours = now.getHours() + now.getMinutes() / 60;
  if (hours >= 6 && hours <= 18) {
    const t = (hours - 6) / 12;
    return Math.round(Math.sin(t * Math.PI) * 100);
  }
  return Math.round(
    Math.max(5, 15 - Math.abs(hours > 18 ? hours - 24 : hours) * 2)
  );
}

export default function WorldPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<WorldState | null>(null);
  const lastTimeRef = useRef(0);
  const navigate = useNavigate();

  const [soundOn, setSoundOn] = useState(true);
  const [crtOn, setCrtOn] = useState(false);
  const [perfMode, setPerfMode] = useState(false);
  const [xp, setXp] = useState(() => getTimeOfDayXp());
  const [modalOpen, setModalOpen] = useState(false);
  const [nightMode, setNightMode] = useState(() => isNightTime());

  const konamiRef = useRef<string[]>([]);
  const spawnBufRef = useRef("");

  const handleShopClick = useCallback(
    (variant: number) => {
      if (variant === ATHENAEUM_VARIANT) {
        navigate("/athenaeum");
      }
    },
    [navigate],
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setPerfMode(true);
      setCrtOn(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setXp(getTimeOfDayXp()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const world = initWorld(canvas);
    if (!world) return;
    worldRef.current = world;
    world.onShopClick = handleShopClick;

    let running = true;
    const loop = (time: number) => {
      if (!running) return;
      const dt = lastTimeRef.current ? time - lastTimeRef.current : 16;
      lastTimeRef.current = time;
      renderFrame(world, time, Math.min(dt, 50));
      world.animFrame = requestAnimationFrame(loop);
    };
    world.animFrame = requestAnimationFrame(loop);

    let resizeTimeout: number;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        if (worldRef.current) resizeWorld(worldRef.current);
      }, 150);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      running = false;
      window.removeEventListener("resize", handleResize);
      destroyWorld(world);
      worldRef.current = null;
    };
  }, [handleShopClick]);

  useEffect(() => {
    if (worldRef.current) worldRef.current.onShopClick = handleShopClick;
  }, [handleShopClick]);

  useEffect(() => {
    if (worldRef.current) worldRef.current.nightMode = nightMode;
  }, [nightMode]);

  useEffect(() => {
    if (worldRef.current) worldRef.current.soundEnabled = soundOn;
  }, [soundOn]);

  useEffect(() => {
    if (worldRef.current) worldRef.current.performanceMode = perfMode;
  }, [perfMode]);

  useEffect(() => {
    const handleScroll = () => {
      if (worldRef.current) worldRef.current.scrollY = window.scrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      konamiRef.current.push(e.key);
      if (konamiRef.current.length > KONAMI.length) {
        konamiRef.current = konamiRef.current.slice(-KONAMI.length);
      }
      if (
        konamiRef.current.length === KONAMI.length &&
        konamiRef.current.every((k, i) => k === KONAMI[i])
      ) {
        setNightMode((prev) => !prev);
        konamiRef.current = [];
      }

      if (e.key === "Escape") setModalOpen(false);

      if (e.key === "/") {
        spawnBufRef.current = "/";
      } else if (spawnBufRef.current.startsWith("/")) {
        spawnBufRef.current += e.key;
        if (spawnBufRef.current === "/spawn") {
          setModalOpen(true);
          spawnBufRef.current = "";
        } else if (!"/spawn".startsWith(spawnBufRef.current)) {
          spawnBufRef.current = "";
        }
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className={crtOn ? "crt-effect" : ""}>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0"
        style={{ touchAction: "none" }}
        aria-hidden="true"
      />

      <Hud
        soundOn={soundOn}
        crtOn={crtOn}
        perfMode={perfMode}
        nightMode={nightMode}
        xp={xp}
        onToggleSound={() => setSoundOn((s) => !s)}
        onToggleCrt={() => setCrtOn((c) => !c)}
        onTogglePerf={() => setPerfMode((p) => !p)}
        onToggleNight={() => setNightMode((n) => !n)}
      />

      <div className="relative z-10 pointer-events-none">
        {/* HERO */}
        <section className="min-h-screen flex flex-col items-center justify-center px-4 pt-16">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            drag
            dragMomentum={false}
            dragElastic={0.08}
            whileTap={{ scale: 0.995 }}
            className="pixel-card p-6 sm:p-10 text-center max-w-lg w-full pointer-events-auto cursor-grab active:cursor-grabbing touch-none select-none"
            aria-label="Draggable BLOCKMeet card"
          >
            <motion.h1
              className="font-pixel text-2xl sm:text-4xl text-pixel-gold text-shadow-pixel mb-4"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2, type: "spring" }}
            >
              {SITE.title}
            </motion.h1>
            <motion.p
              className="font-pixel text-[9px] sm:text-xs text-gray-300 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {SITE.subtitle}
            </motion.p>
            <CTAButtons />
            <motion.div
              className="mt-6 flex justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              transition={{ delay: 1.2 }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M18 11V6a2 2 0 0 0-4 0v1" />
                <path d="M14 10V4a2 2 0 0 0-4 0v6" />
                <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
                <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.7-2.4L3.2 15a1.5 1.5 0 0 1 2.4-1.8L8 16" />
              </svg>
            </motion.div>
          </motion.div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-20 px-4 pointer-events-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-pixel text-sm sm:text-lg text-pixel-gold text-center text-shadow-pixel mb-12"
          >
            How It Works
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
            <PixelCard delay={0}>
              <div className="text-center">
                <StepIcon step={1} />
                <h3 className="font-pixel text-[10px] sm:text-xs text-pixel-green mt-4 mb-2">
                  Pick a Slot
                </h3>
                <p className="font-pixel text-[7px] text-gray-400 leading-relaxed">
                  Choose 15 or 30 minutes. Browse open times that work for you.
                </p>
              </div>
            </PixelCard>
            <PixelCard delay={0.15}>
              <div className="text-center">
                <StepIcon step={2} />
                <h3 className="font-pixel text-[10px] sm:text-xs text-pixel-green mt-4 mb-2">
                  Confirm on Cal.com
                </h3>
                <p className="font-pixel text-[7px] text-gray-400 leading-relaxed">
                  Fill in your details. You get instant calendar confirmation.
                </p>
              </div>
            </PixelCard>
            <PixelCard delay={0.3}>
              <div className="text-center">
                <StepIcon step={3} />
                <h3 className="font-pixel text-[10px] sm:text-xs text-pixel-green mt-4 mb-2">
                  Join Google Meet
                </h3>
                <p className="font-pixel text-[7px] text-gray-400 leading-relaxed">
                  A Meet link arrives in your email. Show up and let's build!
                </p>
              </div>
            </PixelCard>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="py-12 px-4 border-t-4 border-pixel-green/20 bg-pixel-dark/80 backdrop-blur-sm pointer-events-auto">
          <div className="max-w-4xl mx-auto text-center">
            <p className="font-pixel text-[8px] sm:text-[9px] text-gray-400 mb-5 leading-relaxed">
              Or reach out on social media if you want to follow what I'm doing.
            </p>
            <div className="flex justify-center gap-4 mb-6">
              <a
                href={SITE.socials.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="font-pixel text-[7px] text-gray-500 hover:text-pixel-green transition-colors px-3 py-1.5 border border-gray-700 hover:border-pixel-green/40 no-underline"
              >
                Twitter / X
              </a>
              <a
                href={SITE.socials.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="font-pixel text-[7px] text-gray-500 hover:text-pixel-green transition-colors px-3 py-1.5 border border-gray-700 hover:border-pixel-green/40 no-underline"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </footer>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

function StepIcon({ step }: { step: number }) {
  return (
    <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 border-4 border-pixel-green/50 bg-pixel-mid/80 relative">
      <span className="font-pixel text-xl sm:text-2xl text-pixel-green text-shadow-pixel">
        {step}
      </span>
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-pixel-gold" />
    </div>
  );
}
