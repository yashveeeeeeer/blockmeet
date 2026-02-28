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

export default function WritingsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-pixel-dark text-gray-200">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-20">
        <motion.button
          onClick={() => navigate("/")}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="font-pixel text-[8px] sm:text-[9px] text-pixel-green hover:text-pixel-gold transition-colors mb-10 sm:mb-14 cursor-pointer flex items-center gap-2"
        >
          <span aria-hidden="true">&larr;</span> BACK TO WORLD
        </motion.button>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-pixel text-xl sm:text-3xl text-pixel-gold text-shadow-pixel mb-3"
        >
          ATHENAEUM
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.3 }}
          className="font-pixel text-[7px] sm:text-[8px] text-gray-500 mb-12 sm:mb-16"
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
              className="pixel-card p-4 sm:p-6 block no-underline group cursor-pointer"
            >
              <span className="font-pixel text-[7px] text-pixel-green/70 block mb-2">
                {w.date.replace(/-/g, ".")}
              </span>
              <span className="font-pixel text-[10px] sm:text-xs text-pixel-gold group-hover:text-white transition-colors block mb-2">
                {w.title}
              </span>
              <span className="font-pixel text-[7px] sm:text-[8px] text-gray-400 leading-relaxed block">
                {w.oneLiner}
              </span>
            </motion.a>
          ))}
        </motion.div>

        {SITE.writings.length === 0 && (
          <p className="font-pixel text-[9px] text-gray-600 text-center mt-20">
            No writings yet. Check back soon.
          </p>
        )}
      </div>
    </div>
  );
}
