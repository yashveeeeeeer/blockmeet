import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { SITE } from "../config";
import {
  destroyWorld,
  initWorld,
  isNightTime,
  renderFrame,
  resizeWorld,
  setWorldSoundEnabled,
  type WorldState,
} from "../canvas/world";
import Hud from "../components/Hud";
import CTAButtons from "../components/CTAButtons";
import Modal from "../components/Modal";
import BookingModal, {
  type BookingSelection,
} from "../components/BookingModal";
import SignGarland from "../components/SignGarland";
import HdrStarfield from "../components/HdrStarfield";

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

const ATHENAEUM_VARIANT = 3;

function getTimeOfDayXp(): number {
  const now = new Date();
  const hours = now.getHours() + now.getMinutes() / 60;
  if (hours >= 6 && hours <= 18) {
    return Math.round(Math.sin(((hours - 6) / 12) * Math.PI) * 100);
  }
  return Math.round(
    Math.max(5, 15 - Math.abs(hours > 18 ? hours - 24 : hours) * 2),
  );
}

export default function WorldPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<WorldState | null>(null);
  const lastTimeRef = useRef(0);
  const navigate = useNavigate();

  const [soundOn, setSoundOn] = useState(false);
  const [crtOn, setCrtOn] = useState(false);
  const [perfMode, setPerfMode] = useState(false);
  const [xp, setXp] = useState(() => getTimeOfDayXp());
  const [modalOpen, setModalOpen] = useState(false);
  const [booking, setBooking] = useState<BookingSelection | null>(null);
  const [nightMode, setNightMode] = useState(() => isNightTime());

  const konamiRef = useRef<string[]>([]);
  const spawnBufRef = useRef("");
  const closeBooking = useCallback(() => setBooking(null), []);

  const handleShopClick = useCallback(
    (variant: number) => {
      if (variant === ATHENAEUM_VARIANT) navigate("/athenaeum");
    },
    [navigate],
  );

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPerfMode(true);
      setCrtOn(false);
    }
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && worldRef.current?.animFrame) {
        cancelAnimationFrame(worldRef.current.animFrame);
        worldRef.current.animFrame = 0;
      } else if (!document.hidden && worldRef.current && !worldRef.current.animFrame) {
        const world = worldRef.current;
        lastTimeRef.current = 0;
        const loop = (time: number) => {
          if (document.hidden || worldRef.current !== world) return;
          const dt = lastTimeRef.current ? time - lastTimeRef.current : 16;
          lastTimeRef.current = time;
          renderFrame(world, time, Math.min(dt, 50));
          world.animFrame = requestAnimationFrame(loop);
        };
        world.animFrame = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
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
    if (worldRef.current) {
      worldRef.current.nightMode = nightMode;
      worldRef.current.particles = [];
    }
  }, [nightMode]);

  useEffect(() => {
    if (worldRef.current) setWorldSoundEnabled(worldRef.current, soundOn);
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
    const handleKey = (event: KeyboardEvent) => {
      konamiRef.current.push(event.key);
      if (konamiRef.current.length > KONAMI.length) {
        konamiRef.current = konamiRef.current.slice(-KONAMI.length);
      }
      if (
        konamiRef.current.length === KONAMI.length &&
        konamiRef.current.every((key, index) => key === KONAMI[index])
      ) {
        setNightMode((previous) => !previous);
        konamiRef.current = [];
      }

      if (event.key === "Escape") setModalOpen(false);
      if (event.key === "/") {
        spawnBufRef.current = "/";
      } else if (spawnBufRef.current.startsWith("/")) {
        spawnBufRef.current += event.key;
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
    <div
      className={`${crtOn ? "crt-effect " : ""}${nightMode ? "scene-night" : "scene-day"}`}
    >
      <a className="skip-link" href="#booking">
        Skip to booking
      </a>

      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0"
        style={{ touchAction: "pan-y" }}
        aria-hidden="true"
      />

      <HdrStarfield performanceMode={perfMode} />

      <Hud
        soundOn={soundOn}
        crtOn={crtOn}
        perfMode={perfMode}
        nightMode={nightMode}
        xp={xp}
        onToggleSound={() => setSoundOn((current) => !current)}
        onToggleCrt={() => setCrtOn((current) => !current)}
        onTogglePerf={() => setPerfMode((current) => !current)}
        onToggleNight={() => setNightMode((current) => !current)}
      />

      <main className="relative z-10 pointer-events-none">
        <section
          className="village-hero"
          aria-labelledby="hero-title"
        >
          <motion.article
            id="booking"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="village-board pointer-events-auto"
          >
            <h1 id="hero-title" className="hero-brand">
              <SignGarland />
              {SITE.title}
            </h1>
            <CTAButtons onBook={setBooking} />
          </motion.article>
        </section>
      </main>

      <BookingModal booking={booking} onClose={closeBooking} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
