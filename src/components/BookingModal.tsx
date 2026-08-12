import { useEffect, useRef, useState } from "react";

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
  const dialogRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [calendarReady, setCalendarReady] = useState(false);

  useEffect(() => {
    if (!booking) return;

    setCalendarReady(false);
    openerRef.current = document.activeElement as HTMLElement | null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, a[href], iframe, [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.setTimeout(() => openerRef.current?.focus(), 0);
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
        ref={dialogRef}
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

        <div className="booking-frame-wrap">
          {!calendarReady && (
            <div className="booking-loader" role="status">
              <span className="pixel-calendar" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>Opening calendar…</span>
            </div>
          )}
          <iframe
            className={`booking-frame ${calendarReady ? "is-ready" : ""}`}
            src={embedUrl}
            title={`${booking.minutes} minute BLOCKMeet booking calendar`}
            allow="camera; microphone; fullscreen; payment"
            onLoad={() => setCalendarReady(true)}
          />
        </div>

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
