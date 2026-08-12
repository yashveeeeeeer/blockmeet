import { useEffect, useRef } from "react";

export interface BookingSelection {
  minutes: 15 | 30;
  href: string;
  label: string;
}

interface BookingModalProps {
  booking: BookingSelection | null;
  onClose: () => void;
}

export default function BookingModal({ booking, onClose }: BookingModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!booking) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [booking, onClose]);

  if (!booking) return null;

  const separator = booking.href.includes("?") ? "&" : "?";
  const embedUrl = `${booking.href}${separator}embed=true&theme=dark`;

  return (
    <div
      className="booking-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="booking-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-dialog-title"
      >
        <header className="booking-dialog-header">
          <div>
            <p className="booking-dialog-kicker">BOOK INSIDE THE VILLAGE</p>
            <h2 id="booking-dialog-title">{booking.label}</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="booking-close"
            onClick={onClose}
            aria-label="Close booking calendar"
          >
            Close
          </button>
        </header>

        <iframe
          className="booking-frame"
          src={embedUrl}
          title={`${booking.minutes} minute BLOCKMeet booking calendar`}
          allow="camera; microphone; fullscreen; payment"
        />

        <p className="booking-fallback">
          Calendar not loading?{" "}
          <a href={booking.href} target="_blank" rel="noopener noreferrer">
            Open this booking on Cal.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
