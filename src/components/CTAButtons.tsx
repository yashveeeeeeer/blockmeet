import { SITE } from "../config";
import type { BookingSelection } from "./BookingModal";

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
  return (
    <div className="meeting-signs" aria-label="Choose a meeting length">
      {OPTIONS.map((option) => (
        <button
          key={option.minutes}
          type="button"
          className={`meeting-sign meeting-sign-${option.minutes}`}
          onClick={() => onBook(option)}
          aria-label={`Book a ${option.minutes} minute ${option.label.toLowerCase()} with ${SITE.owner}`}
        >
          <span className="sign-lights" aria-hidden="true" />
          <span className="meeting-sign-time">{option.minutes} min</span>
          <span className="meeting-sign-label">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
