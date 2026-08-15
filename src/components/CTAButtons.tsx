import { useEffect, useRef, useState } from "react";
import { SITE } from "../config";
import type { BookingSelection } from "./BookingModal";
import SignGarland from "./SignGarland";

interface CTAButtonsProps {
  onBook: (booking: BookingSelection) => void;
}

const OPTIONS: BookingSelection[] = [
  {
    minutes: 15,
    label: "Quick chat",
    href: SITE.links.min15,
  },
  {
    minutes: 30,
    label: "Deep dive",
    href: SITE.links.min30,
  },
];

export default function CTAButtons({ onBook }: CTAButtonsProps) {
  const [launching, setLaunching] = useState<number | null>(null);
  const launchTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (launchTimer.current !== null) window.clearTimeout(launchTimer.current);
    },
    [],
  );

  const handleBook = (option: BookingSelection) => {
    if (launchTimer.current !== null) return;
    setLaunching(option.minutes);
    launchTimer.current = window.setTimeout(() => {
      onBook(option);
      setLaunching(null);
      launchTimer.current = null;
    }, 180);
  };

  return (
    <div className="meeting-signs" aria-label="Choose a meeting length">
      {OPTIONS.map((option) => (
        <button
          key={option.minutes}
          type="button"
          className={`meeting-sign meeting-sign-${option.minutes}${
            launching === option.minutes ? " is-launching" : ""
          }`}
          onClick={() => handleBook(option)}
          aria-label={`Book a ${option.minutes} minute ${option.label.toLowerCase()} with ${SITE.owner}`}
        >
          <SignGarland />
          <span className="meeting-sign-time">{option.minutes} min</span>
          <span className="meeting-sign-label">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
