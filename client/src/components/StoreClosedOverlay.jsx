import { useEffect, useState } from "react";

/**
 * StoreClosedOverlay
 * Shows a "shutter closed" premium overlay on the homepage between
 * CLOSE_HOUR (9pm) and OPEN_HOUR (8am) IST — regardless of the visitor's
 * own timezone, so this matches the store's actual local hours in India.
 * Signboard uses a basket-icon + wordmark combo as the Snapit logo.
 *
 * Usage:
 *   <StoreClosedOverlay />                            // full-screen blocker
 *   <StoreClosedOverlay allowBrowse onDismiss={fn} />  // dismissible banner
 *
 * Also exports:
 *   isStoreOpen(): boolean — for lightweight checks elsewhere (e.g. HomeBanner)
 *   that just need a yes/no without rendering the overlay.
 *
 * Requires "Baloo 2" (or drop the fontFamily lines to use your default
 * sans) and Tabler icons for the clock glyph:
 *   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont/dist/tabler-icons.min.css" />
 *
 * Logo: drop snapit-logo-mark.png (icon + wordmark, no tagline — crops
 * cleanly at small sizes) into your client's /public folder, or import
 * it from /src/assets, and update LOGO_SRC below to match its path.
 */

const LOGO_SRC = "/snapit-logo-mark.png";

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

// ✅ Named export used by HomeBanner.jsx (and anywhere else that just
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

  return (
    <div
      style={{
        position: allowBrowse ? "relative" : "fixed",
        inset: allowBrowse ? "auto" : 0,
        zIndex: allowBrowse ? 1 : 1000,
        background: "#12162B",
        borderRadius: allowBrowse ? 16 : 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: allowBrowse ? "flex-start" : "center",
        padding: allowBrowse ? "28px 20px" : "0",
        minHeight: allowBrowse ? "auto" : "100vh",
      }}
    >
      {!allowBrowse && (
        <>
          <Stars />
          <Moon />
        </>
      )}

      <Signboard />
      <Shutter />

      <div style={{ marginTop: 24, textAlign: "center", padding: "0 24px", maxWidth: 360 }}>
        <p
          style={{
            fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 700,
            fontSize: 22,
            color: "#EDEBFA",
            margin: "0 0 6px",
          }}
        >
          Shhh, we're closed for the night
        </p>
        <p style={{ fontSize: 14, color: "#8B92B8", margin: "0 0 20px", lineHeight: 1.6 }}>
          Orders open back up at {OPEN_HOUR === 8 ? "8:00 am" : `${OPEN_HOUR}:00`}. We'll have everything ready.
        </p>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#1B2040",
            border: "1px solid #2E3350",
            borderRadius: 10,
            padding: "10px 18px",
          }}
        >
          <i className="ti ti-clock" style={{ fontSize: 16, color: "#F5A623" }} aria-hidden="true" />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#F5A623" }}>
            Opens in {formatCountdown(status.msUntilOpen)}
          </span>
        </div>
      </div>

      {allowBrowse && (
        <button
          onClick={handleDismiss}
          style={{
            marginTop: 20,
            marginBottom: 8,
            background: "transparent",
            border: "none",
            color: "#8B92B8",
            fontSize: 13,
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          Browse anyway
        </button>
      )}
    </div>
  );
}

function BasketIcon({ size = 30, color = "#12162B" }) {
  // Faint watermark pressed into the shutter itself, distinct from the real logo.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 8L6 21H18L20 8H4Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 8C8 5 9.5 3 12 3C14.5 3 16 5 16 8" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="4" y1="8" x2="20" y2="8" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

function Signboard() {
  return (
    <div style={{ marginTop: 38, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: 2, height: 22, background: "#464C72" }} />
      <div
        style={{
          background: "#F5E5AB",
          border: "1.5px solid #464C72",
          borderRadius: 12,
          padding: "10px 18px",
          boxShadow: "0 4px 0 rgba(0,0,0,0.15)",
        }}
      >
        <img
          src={LOGO_SRC}
          alt="Snapit"
          style={{ height: 60, width: "auto", display: "block", borderRadius: 6 }}
        />
      </div>
    </div>
  );
}

function Shutter() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <div
        style={{
          marginTop: 18,
          width: 300,
          height: 190,
          background: "#1B2040",
          borderRadius: "10px 10px 0 0",
          position: "relative",
          overflow: "hidden",
          boxShadow: "inset 0 0 0 1px #2E3350",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: open ? "100%" : "0%",
            background:
              "repeating-linear-gradient(180deg, #3A4066 0px, #3A4066 14px, #464C72 14px, #464C72 16px)",
            transition: "height 1.4s cubic-bezier(.4,0,.2,1)",
            borderBottom: "3px solid #262B4D",
          }}
        >
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0.5 }}>
            <BasketIcon size={30} color="#12162B" />
          </div>
          <div style={{ position: "absolute", bottom: 6, left: 0, right: 0, display: "flex", justifyContent: "space-evenly" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#12162B" }} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ width: 320, height: 10, background: "#12162B", borderTop: "4px solid #2E3350" }} />
    </>
  );
}

function Moon() {
  return (
    <svg width="60" height="40" viewBox="0 0 60 40" style={{ position: "absolute", top: 24, right: 32 }} aria-hidden="true">
      <circle cx="30" cy="20" r="12" fill="#E8E4F5" />
      <circle cx="24" cy="16" r="12" fill="#12162B" />
    </svg>
  );
}

function Stars() {
  const positions = [
    { top: 40, left: "10%" },
    { top: 90, left: "20%" },
    { top: 60, left: "70%" },
    { top: 130, left: "80%" },
    { top: 200, left: "15%" },
  ];
  return positions.map((p, i) => (
    <div
      key={i}
      style={{ position: "absolute", top: p.top, left: p.left, width: 3, height: 3, borderRadius: "50%", background: "#B9C2E0" }}
    />
  ));
}