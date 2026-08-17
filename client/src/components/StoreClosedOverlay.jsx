import { useEffect, useState } from "react";

/**
 * StoreClosedOverlay
 * Minimal, on-brand "closed" state shown between CLOSE_HOUR (9pm) and
 * OPEN_HOUR (8am) IST — regardless of the visitor's own timezone, so
 * this matches the store's actual local hours in India.
 *
 * Deliberately plain: a light card, a clock icon, and clear copy — the
 * same pattern used by Blinkit/Zepto/Swiggy Instamart for closed states.
 * No illustration, no dark theme switch, so it doesn't clash with the
 * rest of the app's UI when it appears under the header.
 *
 * Usage:
 *   <StoreClosedOverlay />                            // full blocker
 *   <StoreClosedOverlay allowBrowse onDismiss={fn} />  // dismissible banner
 *
 * Also exports:
 *   isStoreOpen(): boolean — for lightweight checks elsewhere (e.g. HomeBanner)
 *   that just need a yes/no without rendering the overlay.
 */

const CLOSE_HOUR = 21; // 9 PM
const OPEN_HOUR = 8; // 8 AM

// Store hours are IST-based, not the visitor's local time.
function getISTNow() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istMs = utcMs + 5.5 * 3600000;
  return new Date(istMs);
}

function getStoreStatus() {
  const nowIST = getISTNow();
  const hour = nowIST.getHours();
  const isClosed = hour >= CLOSE_HOUR || hour < OPEN_HOUR;

  if (!isClosed) return { isClosed: false, msUntilOpen: 0 };

  const opensAt = new Date(nowIST);
  if (hour >= CLOSE_HOUR) {
    opensAt.setDate(opensAt.getDate() + 1);
  }
  opensAt.setHours(OPEN_HOUR, 0, 0, 0);

  return { isClosed: true, msUntilOpen: opensAt.getTime() - nowIST.getTime() };
}

// Named export used by HomeBanner.jsx (and anywhere else that just
// needs a boolean without mounting the full overlay).
export function isStoreOpen() {
  return !getStoreStatus().isClosed;
}

function formatCountdown(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatHour(h) {
  const period = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

export default function StoreClosedOverlay({ allowBrowse = false, onDismiss }) {
  const [status, setStatus] = useState(getStoreStatus);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setStatus(getStoreStatus()), 60000);
    return () => clearInterval(interval);
  }, []);

  if (!status.isClosed || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (allowBrowse) {
    return <ClosedBanner status={status} onDismiss={handleDismiss} />;
  }

  return (
    <div
      role="dialog"
      aria-label="Store closed for the night"
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "56px 20px",
        background: "#F8FAF9",
        borderBottom: "1px solid #EDEFEE",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#EAF7EE",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <ClockIcon />
      </div>

      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "#14171A",
          margin: "0 0 6px",
          textAlign: "center",
        }}
      >
        We're closed right now
      </h2>

      <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 20px", textAlign: "center" }}>
        Ordering resumes at {formatHour(OPEN_HOUR)}. Store hours: {formatHour(OPEN_HOUR)} – {formatHour(CLOSE_HOUR)}.
      </p>

      <div
        role="status"
        aria-live="polite"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "#14171A",
          borderRadius: 8,
          padding: "9px 16px",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>
          Opens in {formatCountdown(status.msUntilOpen)}
        </span>
      </div>
    </div>
  );
}

function ClosedBanner({ status, onDismiss }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "#F8FAF9",
        border: "1px solid #EDEFEE",
        borderRadius: 12,
        padding: "12px 16px",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "#EAF7EE",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ClockIcon size={16} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: "#14171A", margin: 0 }}>
          Snapit is closed right now
        </p>
        <p style={{ fontSize: 12.5, color: "#6B7280", margin: "2px 0 0" }}>
          Opens in {formatCountdown(status.msUntilOpen)} · back at {formatHour(OPEN_HOUR)}
        </p>
      </div>

      <button
        onClick={onDismiss}
        aria-label="Dismiss and browse anyway"
        style={{
          flexShrink: 0,
          background: "transparent",
          border: "1px solid #D1D5DB",
          borderRadius: 8,
          color: "#374151",
          fontSize: 12.5,
          fontWeight: 600,
          padding: "7px 12px",
          cursor: "pointer",
        }}
      >
        Browse anyway
      </button>
    </div>
  );
}

function ClockIcon({ size = 26, color = "#16A34A" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
      <path d="M12 7v5l3.5 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}