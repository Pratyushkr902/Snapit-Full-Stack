import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import logo from "../assets/snapit.png";

/**
 * StoreClosedOverlay (Flipkart Minutes & Zepto Style)
 * Shows a realistic rolling shutter scene between CLOSE_HOUR (9:00 PM)
 * and OPEN_HOUR (9:00 AM) IST — based on Indian Standard Time.
 */

export const CLOSE_HOUR = 21; // 9:00 PM IST (21:00)
export const OPEN_HOUR = 9;   // 9:00 AM IST (09:00)

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

  if (!isClosed) return { isClosed: false, msUntilOpen: 0, openHour: OPEN_HOUR, closeHour: CLOSE_HOUR };

  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth();
  let date = istDate.getUTCDate();

  if (hour >= CLOSE_HOUR) {
    date += 1;
  }

  const opensAtUtcMs = Date.UTC(year, month, date, OPEN_HOUR, 0, 0, 0) - istOffsetMs;
  const msUntilOpen = Math.max(0, opensAtUtcMs - nowUtcMs);

  return { isClosed: true, msUntilOpen, openHour: OPEN_HOUR, closeHour: CLOSE_HOUR };
}

/**
 * Named export used by CheckoutPage.jsx, AddToCartButton.jsx, ProductDisplayPage.jsx, etc.
 * Admins, sellers, and riders bypass closing hours.
 */
export function isStoreOpen(role) {
  if (role && ADMIN_LIKE_ROLES.includes(role)) return true;
  return !getStoreStatus().isClosed;
}

export function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

export default function StoreClosedOverlay({ allowBrowse = false, onDismiss }) {
  const user = useSelector((state) => state?.user);
  const [status, setStatus] = useState(getStoreStatus);
  const [dismissed, setDismissed] = useState(false);

  // Update countdown smoothly every second
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getStoreStatus());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Only bypass store closed overlay when actively inside admin dashboard panels (/dashboard)
  const isDashboardRoute = typeof window !== 'undefined' && (
    window.location.hash.includes('/dashboard') || 
    window.location.pathname.includes('/dashboard')
  );
  if (isDashboardRoute) {
    return null;
  }

  if (!status.isClosed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  // If dismissed or in browse mode, return null so no top bar obstructs the header/user menu
  if (allowBrowse || dismissed) {
    return null;
  }

  return (
    <div className="snapit-shutter-overlay" role="dialog" aria-label="Store closed for the night">
      <style>{`
        .snapit-shutter-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 50% 20%, #151932 0%, #0c0e1d 60%, #070811 100%);
          padding: 24px 16px;
        }

        .snapit-stars-layer {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .snapit-star {
          position: absolute;
          border-radius: 50%;
          background: #E4E8FF;
          animation: snapit-twinkle 3s ease-in-out infinite;
        }

        .snapit-shutter-stage {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 420px;
          animation: snapit-drop-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .snapit-ambient-glow {
          position: absolute;
          top: 40px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245, 166, 35, 0.18) 0%, rgba(245, 166, 35, 0) 70%);
          pointer-events: none;
        }

        .snapit-shutter-box {
          width: 100%;
          max-width: 340px;
          height: 200px;
          background: #191c33;
          border-radius: 12px 12px 0 0;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.6), inset 0 0 0 2px #2f3458;
          margin-top: 16px;
        }

        .snapit-shutter-slats {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            180deg,
            #3e456c 0px,
            #3e456c 14px,
            #2a2f4d 14px,
            #2a2f4d 16px,
            #1e223b 16px,
            #1e223b 17px
          );
          box-shadow: inset 0 10px 20px rgba(0,0,0,0.4);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .snapit-padlock-housing {
          background: rgba(14, 16, 31, 0.85);
          backdrop-filter: blur(4px);
          border: 2px solid #5a6396;
          border-radius: 50%;
          width: 68px;
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.1);
        }

        .snapit-pulse-pill {
          animation: snapit-pulse-glow 2.5s infinite;
        }

        @keyframes snapit-twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 0.95; transform: scale(1.2); }
        }

        @keyframes snapit-drop-in {
          from { opacity: 0; transform: translateY(-24px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes snapit-pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 166, 35, 0.35); }
          50% { box-shadow: 0 0 0 10px rgba(245, 166, 35, 0); }
        }
      `}</style>

      {/* Night Sky Background */}
      <div className="snapit-stars-layer">
        <Stars />
        <Moon />
      </div>

      {/* Main Shutter & Store Scene */}
      <div className="snapit-shutter-stage">
        <div className="snapit-ambient-glow" />

        {/* Illuminated Neon Signboard */}
        <Signboard />

        {/* Rolling Steel Shutter with Padlock */}
        <div className="snapit-shutter-box">
          <div className="snapit-shutter-slats">
            <div className="snapit-padlock-housing">
              <PadlockIcon />
            </div>
          </div>
        </div>

        {/* Bottom Shutter Handle Bar */}
        <div style={{
          width: "100%",
          maxWidth: 364,
          height: 14,
          background: "#111425",
          borderTop: "4px solid #3e456c",
          borderRadius: "0 0 6px 6px",
          boxShadow: "0 6px 12px rgba(0,0,0,0.5)"
        }} />

        {/* Store Closed Text & Information */}
        <div style={{ marginTop: 20, textAlign: "center", width: "100%", maxWidth: 360 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(245, 166, 35, 0.12)",
            border: "1px solid rgba(245, 166, 35, 0.3)",
            padding: "4px 12px",
            borderRadius: 999,
            marginBottom: 10
          }}>
            <span style={{ fontSize: 13 }}>🌙</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#F5A623", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Night Restocking Break
            </span>
          </div>

          <h2 style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontWeight: 900,
            fontSize: 22,
            color: "#FFFFFF",
            margin: "0 0 6px",
            letterSpacing: "-0.02em"
          }}>
            Store Closed for the Night
          </h2>

          <p style={{
            fontSize: 13,
            color: "#9CA3AF",
            margin: "0 0 16px",
            lineHeight: 1.5,
            padding: "0 8px"
          }}>
            Operating hours are <strong>9:00 AM – 9:00 PM IST</strong>. We are resting and packing fresh stock for tomorrow!
          </p>

          {/* Real-time Live Countdown Pill */}
          <div
            className="snapit-pulse-pill"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#1A1E38",
              border: "1px solid #3E456C",
              borderRadius: 999,
              padding: "10px 22px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
            }}
          >
            <ClockIcon size={16} color="#F5A623" />
            <span style={{ fontSize: 14, fontWeight: 800, color: "#F5A623", letterSpacing: "0.02em" }}>
              Opens in {formatCountdown(status.msUntilOpen)}
            </span>
          </div>

          {/* Opening Time Banner */}
          <div style={{
            marginTop: 12,
            fontSize: 12,
            fontWeight: 700,
            color: "#34D399",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4
          }}>
            <span>⚡</span>
            <span>10-Minute Deliveries Start at 9:00 AM Tomorrow</span>
          </div>

          {/* Actions: Browse Catalog Anyway */}
          <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={handleDismiss}
              aria-label="Browse store and build cart"
              style={{
                background: "linear-gradient(135deg, #16A34A 0%, #15803D 100%)",
                border: "none",
                borderRadius: 14,
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 800,
                padding: "12px 24px",
                cursor: "pointer",
                boxShadow: "0 8px 24px rgba(22, 163, 74, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "transform 0.15s ease"
              }}
            >
              <span>🛒</span>
              <span>Browse Catalog & Build Cart</span>
            </button>
            <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>
              You can add items now and check out when orders open at 9:00 AM!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Flipkart Minutes-style Top Sticky Bar
 * Appears when the customer taps "Browse Catalog" during closed hours.
 */
function ClosedBanner({ status, onReopenShutter }) {
  return (
    <div
      role="status"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 45,
        width: "100%",
        background: "linear-gradient(135deg, #161A34 0%, #0F1226 100%)",
        borderBottom: "2px solid #F5A623",
        padding: "10px 16px",
        boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "rgba(245, 166, 35, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }}>
          <span style={{ fontSize: 16 }}>🌙</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{
            fontSize: 13,
            fontWeight: 800,
            color: "#FFFFFF",
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}>
            Store Closed · Opens at 9:00 AM
          </p>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#F5A623", margin: "2px 0 0" }}>
            Deliveries resume in {formatCountdown(status.msUntilOpen)}
          </p>
        </div>
      </div>

      <button
        onClick={onReopenShutter}
        style={{
          background: "rgba(255, 255, 255, 0.08)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: 8,
          color: "#E5E7EB",
          fontSize: 11,
          fontWeight: 700,
          padding: "6px 10px",
          cursor: "pointer",
          flexShrink: 0
        }}
      >
        View Timings
      </button>
    </div>
  );
}

function Signboard() {
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2 }}>
      {/* Hanging chains */}
      <div style={{ display: "flex", gap: 110, marginBottom: -2 }}>
        <div style={{ width: 2, height: 16, background: "#5A6396" }} />
        <div style={{ width: 2, height: 16, background: "#5A6396" }} />
      </div>
      {/* Signboard box */}
      <div
        style={{
          background: "#FFF8E1",
          border: "2px solid #5A6396",
          borderRadius: 14,
          padding: "8px 24px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <img
          src={logo}
          alt="Snapit"
          style={{ height: 44, width: "auto", maxWidth: 160, display: "block", objectFit: "contain" }}
        />
      </div>
    </div>
  );
}

function ClockIcon({ size = 16, color = "#F5A623" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <path d="M12 7v5l3.5 2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PadlockIcon({ size = 28, color = "#F5A623" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="10" width="14" height="11" rx="2.5" stroke={color} strokeWidth="2" fill="rgba(245, 166, 35, 0.15)" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.5" fill={color} />
      <path d="M12 16.5v2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Moon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" style={{ position: "absolute", top: 24, right: 32 }} aria-hidden="true">
      <circle cx="24" cy="24" r="14" fill="#FEF3C7" opacity="0.9" />
      <circle cx="17" cy="19" r="14" fill="#0c0e1d" />
    </svg>
  );
}

function Stars() {
  const positions = [
    { top: "8%", left: "10%", size: 2, delay: "0s" },
    { top: "14%", left: "82%", size: 3, delay: "0.5s" },
    { top: "28%", left: "18%", size: 2, delay: "1.2s" },
    { top: "12%", left: "46%", size: 2, delay: "1.7s" },
    { top: "38%", left: "86%", size: 2, delay: "0.9s" },
    { top: "22%", left: "6%", size: 3, delay: "2.1s" },
  ];
  return positions.map((p, i) => (
    <div
      key={i}
      className="snapit-star"
      style={{ top: p.top, left: p.left, width: p.size, height: p.size, animationDelay: p.delay }}
    />
  ));
}