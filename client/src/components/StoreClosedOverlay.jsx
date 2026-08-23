import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import logo from "../assets/snapit.png";

/**
 * StoreClosedOverlay
 * Shows a "shutter closed" scene on the homepage between CLOSE_HOUR (9pm)
 * and OPEN_HOUR (8am) IST — regardless of the visitor's own timezone, so
 * this matches the store's actual local hours in India.
 *
 * Usage:
 *   <StoreClosedOverlay />                            // full-screen blocker (with browse option)
 *   <StoreClosedOverlay allowBrowse />                // dismissible banner mode
 *   <StoreClosedOverlay allowBrowse onDismiss={fn} /> // banner with custom dismiss handler
 *
 * Also exports:
 *   isStoreOpen(userRole): boolean — for lightweight checks elsewhere (e.g. CheckoutPage, AddToCartButton)
 *   getStoreStatus(): { isClosed: boolean, msUntilOpen: number }
 */

export const CLOSE_HOUR = 21; // 9 PM IST
export const OPEN_HOUR = 8;   // 8 AM IST

export const ADMIN_LIKE_ROLES = ['ADMIN', 'SUPER_ADMIN', 'SELLER', 'RESTO_SELLER', 'RIDER'];

/**
 * Robust IST store status computation regardless of client device timezone.
 */
export function getStoreStatus() {
  const now = new Date();
  const nowUtcMs = now.getTime();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istMs = nowUtcMs + istOffsetMs;
  const istDate = new Date(istMs);

  const hour = istDate.getUTCHours();
  const isClosed = hour >= CLOSE_HOUR || hour < OPEN_HOUR;

  if (!isClosed) return { isClosed: false, msUntilOpen: 0 };

  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth();
  let date = istDate.getUTCDate();

  if (hour >= CLOSE_HOUR) {
    date += 1;
  }

  const opensAtUtcMs = Date.UTC(year, month, date, OPEN_HOUR, 0, 0, 0) - istOffsetMs;
  const msUntilOpen = Math.max(0, opensAtUtcMs - nowUtcMs);

  return { isClosed: true, msUntilOpen };
}

/**
 * Named export used by CheckoutPage.jsx, AddToCartButton.jsx, etc.
 * Admins, sellers, and riders bypass closing hours.
 */
export function isStoreOpen(userRole) {
  if (userRole) {
    const normalized = userRole.replace(/['"]/g, '').trim().toUpperCase();
    if (ADMIN_LIKE_ROLES.includes(normalized)) {
      return true;
    }
  }
  return !getStoreStatus().isClosed;
}

export function formatCountdown(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export default function StoreClosedOverlay({ allowBrowse = false, onDismiss }) {
  const user = useSelector((state) => state?.user);
  const [status, setStatus] = useState(getStoreStatus);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setStatus(getStoreStatus()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Admin-like roles bypass store closed banner/overlay
  const userRole = user?.role ? user.role.replace(/['"]/g, '').trim().toUpperCase() : '';
  if (ADMIN_LIKE_ROLES.includes(userRole)) {
    return null;
  }

  if (!status.isClosed || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (allowBrowse) {
    return <ClosedBanner status={status} onDismiss={handleDismiss} />;
  }

  return (
    <div className="snapit-closed" role="dialog" aria-label="Store closed for the night">
      <style>{`
        .snapit-closed { position: fixed; inset: 0; z-index: 30; overflow: hidden;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          background: linear-gradient(180deg, #0B0E1F 0%, #12162B 60%, #181C38 100%); }
        .snapit-closed__sky { position: absolute; inset: 0; pointer-events: none; }
        .snapit-closed__star { position: absolute; border-radius: 50%; background: #D8DCF2;
          animation: snapit-twinkle 3.2s ease-in-out infinite; }
        .snapit-closed__scene { position: relative; display: flex; flex-direction: column;
          align-items: center; animation: snapit-drop 0.6s cubic-bezier(.2,.8,.3,1) both; }
        .snapit-closed__glow { position: absolute; top: -10px; width: 220px; height: 220px;
          border-radius: 50%; background: radial-gradient(circle, rgba(245,214,163,0.16) 0%, rgba(245,214,163,0) 70%);
          pointer-events: none; }
        .snapit-closed__pill { animation: snapit-pulse 2.6s ease-in-out infinite; }
        @keyframes snapit-twinkle { 0%, 100% { opacity: 0.25; } 50% { opacity: 0.9; } }
        @keyframes snapit-drop { from { opacity: 0; transform: translateY(-14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes snapit-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(245,166,35,0.25); } 50% { box-shadow: 0 0 0 8px rgba(245,166,35,0); } }
        @media (prefers-reduced-motion: reduce) {
          .snapit-closed__star, .snapit-closed__scene, .snapit-closed__pill { animation: none !important; }
        }
      `}</style>

      <div className="snapit-closed__sky">
        <Stars />
        <Moon />
      </div>

      <div className="snapit-closed__scene">
        <div className="snapit-closed__glow" />
        <Signboard />
        <Shutter />

        <div style={{ marginTop: 22, textAlign: "center", padding: "0 24px", maxWidth: 340 }}>
          <p
            style={{
              fontFamily: "'Baloo 2', sans-serif",
              fontWeight: 700,
              fontSize: 21,
              color: "#EDEBFA",
              margin: "0 0 6px",
            }}
          >
            Shhh, we're closed for the night
          </p>
          <p style={{ fontSize: 14, color: "#949AC2", margin: "0 0 18px", lineHeight: 1.6 }}>
            Orders open back up at {OPEN_HOUR === 8 ? "8:00 am" : `${OPEN_HOUR}:00`}. We'll have everything ready.
          </p>
          <div
            className="snapit-closed__pill"
            role="status"
            aria-live="polite"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#1B2040",
              border: "1px solid #3A3F66",
              borderRadius: 999,
              padding: "10px 20px",
            }}
          >
            <ClockIcon size={16} color="#F5A623" />
            <span style={{ fontSize: 14, fontWeight: 500, color: "#F5A623" }}>
              Opens in {formatCountdown(status.msUntilOpen)}
            </span>
          </div>

          <div style={{ marginTop: 16 }}>
            <button
              onClick={handleDismiss}
              aria-label="Browse store anyway"
              style={{
                background: "transparent",
                border: "1px solid #3A3F66",
                borderRadius: 999,
                color: "#949AC2",
                fontSize: 13,
                fontWeight: 600,
                padding: "8px 18px",
                cursor: "pointer",
              }}
            >
              Browse anyway
            </button>
          </div>
        </div>
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
        gap: 14,
        background: "linear-gradient(135deg, #1B2040 0%, #12162B 100%)",
        border: "1px solid #2E3350",
        borderRadius: 16,
        padding: "14px 18px",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "rgba(245,166,35,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MoonIcon size={20} color="#F5A623" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 15, color: "#EDEBFA", margin: 0 }}>
          Snapit is closed right now
        </p>
        <p style={{ fontSize: 13, color: "#949AC2", margin: "2px 0 0" }}>
          Opens in {formatCountdown(status.msUntilOpen)} · back at {OPEN_HOUR === 8 ? "8:00 am" : `${OPEN_HOUR}:00`}
        </p>
      </div>

      <button
        onClick={onDismiss}
        aria-label="Dismiss and browse anyway"
        style={{
          flexShrink: 0,
          background: "transparent",
          border: "1px solid #3A3F66",
          borderRadius: 10,
          color: "#8B92B8",
          fontSize: 13,
          padding: "8px 12px",
          cursor: "pointer",
        }}
      >
        Browse anyway
      </button>
    </div>
  );
}

function Signboard() {
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
      <div style={{ display: "flex", gap: 96, marginBottom: -1 }}>
        <div style={{ width: 2, height: 16, background: "#4A5080" }} />
        <div style={{ width: 2, height: 16, background: "#4A5080" }} />
      </div>
      <div
        style={{
          background: "#F5E5AB",
          border: "1.5px solid #4A5080",
          borderRadius: 14,
          padding: "10px 22px",
          boxShadow: "0 6px 0 rgba(0,0,0,0.18)",
        }}
      >
        <img
          src={logo}
          alt="Snapit"
          style={{ height: 84, width: "auto", maxWidth: 220, display: "block", objectFit: "contain", borderRadius: 6 }}
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
    <div style={{ marginTop: 14, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Rivets />
      <div
        style={{
          width: 300,
          height: 176,
          background: "#20244A",
          borderRadius: "4px 4px 0 0",
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
              "repeating-linear-gradient(180deg, #3A4066 0px, #3A4066 12px, #2A2F58 12px, #2A2F58 13px, #1E2244 13px, #1E2244 14px)",
            transition: "height 1.1s cubic-bezier(.4,0,.2,1)",
            borderBottom: "3px solid #171A38",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.1) 100%)",
            }}
          />
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}>
            <PadlockIcon />
          </div>
        </div>
      </div>
      <div style={{ width: 322, height: 12, background: "#12162B", borderTop: "4px solid #2E3350", borderRadius: "0 0 2px 2px" }} />
      <Rivets />
    </div>
  );
}

function Rivets() {
  return (
    <div style={{ display: "flex", justifyContent: "space-evenly", width: 300, padding: "4px 0" }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "#464C72" }} />
      ))}
    </div>
  );
}

function ClockIcon({ size = 16, color = "#F5A623" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
      <path d="M12 7v5l3.5 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MoonIcon({ size = 20, color = "#F5A623" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8A9.042 9.042 0 0 0 12 3z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PadlockIcon({ size = 26, color = "#12162B" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" opacity={0.55}>
      <rect x="5" y="10" width="14" height="10" rx="2" stroke={color} strokeWidth="1.6" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.4" fill={color} />
    </svg>
  );
}

function Moon() {
  return (
    <svg width="52" height="36" viewBox="0 0 52 36" style={{ position: "absolute", top: 28, right: 40 }} aria-hidden="true">
      <circle cx="26" cy="18" r="11" fill="#E8E4F5" />
      <circle cx="20.5" cy="14.5" r="11" fill="#12162B" />
    </svg>
  );
}

function Stars() {
  const positions = [
    { top: "8%", left: "12%", size: 2, delay: "0s" },
    { top: "16%", left: "78%", size: 3, delay: "0.4s" },
    { top: "28%", left: "22%", size: 2, delay: "1.1s" },
    { top: "10%", left: "48%", size: 2, delay: "1.6s" },
    { top: "34%", left: "88%", size: 2, delay: "0.8s" },
    { top: "22%", left: "6%", size: 3, delay: "2s" },
  ];
  return positions.map((p, i) => (
    <div
      key={i}
      className="snapit-closed__star"
      style={{ top: p.top, left: p.left, width: p.size, height: p.size, animationDelay: p.delay }}
    />
  ));
}