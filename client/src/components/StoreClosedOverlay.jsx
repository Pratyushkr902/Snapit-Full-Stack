import { useEffect, useState } from "react";

/**
 * StoreClosedOverlay
 * Bold, full-width "closed" banner shown between CLOSE_HOUR (9pm) and
 * OPEN_HOUR (8am) IST — regardless of the visitor's own timezone, so
 * this matches the store's actual local hours in India.
 *
 * Pattern matched to Flipkart Minutes' closed-store screen: a dark
 * full-width section with a large bold headline, plus a simple branded
 * shop-shutter illustration underneath. The header (search, cart, login,
 * user menu) stays fully visible and functional above this at all times,
 * and the rest of the page (categories, banners) still renders normally
 * below it — this is a banner, not a blocker.
 *
 * Usage:
 *   <StoreClosedOverlay />   // that's it — no allowBrowse prop needed
 *                            // anymore, since this never blocks anything
 *
 * Also exports:
 *   isStoreOpen(): boolean — for lightweight checks elsewhere.
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

// Named export used by HomeBanner.jsx and anywhere else that just needs
// a boolean without mounting the banner.
export function isStoreOpen() {
  return !getStoreStatus().isClosed;
}

function formatHour(h) {
  const display = h % 12 === 0 ? 12 : h % 12;
  return h >= 12 ? `${display} PM` : `${display} AM`;
}

export default function StoreClosedOverlay() {
  const [status, setStatus] = useState(getStoreStatus);

  useEffect(() => {
    const interval = setInterval(() => setStatus(getStoreStatus()), 60000);
    return () => clearInterval(interval);
  }, []);

  if (!status.isClosed) return null;

  return (
    <div
      style={{
        width: "100%",
        background: "linear-gradient(180deg, #12162B 0%, #191E38 100%)",
        padding: "36px 20px 0",
        overflow: "hidden",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <h2
          style={{
            fontSize: "clamp(28px, 6vw, 40px)",
            fontWeight: 800,
            color: "#FFFFFF",
            margin: "0 0 4px",
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
          }}
        >
          Closed for the night!
        </h2>
        <p
          style={{
            fontSize: "clamp(18px, 4vw, 24px)",
            fontWeight: 600,
            color: "#B7BEDB",
            margin: 0,
          }}
        >
          We'll be back at {formatHour(OPEN_HOUR)}.
        </p>
      </div>

      <ShopIllustration />
    </div>
  );
}

function ShopIllustration() {
  return (
    <div style={{ maxWidth: 420, margin: "24px auto 0", display: "block" }}>
      <svg viewBox="0 0 420 300" width="100%" height="auto" role="img" aria-label="Snapit store, shutter closed">
        {/* Awning band */}
        <rect x="20" y="40" width="380" height="30" fill="#1E7D3B" />
        {/* Striped scalloped awning edge */}
        {Array.from({ length: 10 }).map((_, i) => (
          <path
            key={i}
            d={`M ${20 + i * 38} 70 L ${58 + i * 38} 70 L ${68 + i * 38} 96 Q ${39 + i * 38} 108 ${10 + i * 38} 96 Z`}
            fill={i % 2 === 0 ? "#1E7D3B" : "#F5E5AB"}
          />
        ))}

        {/* Shutter body */}
        <rect x="30" y="106" width="360" height="160" fill="#2A2F58" />
        {Array.from({ length: 13 }).map((_, i) => (
          <rect key={i} x="30" y={106 + i * 12} width="360" height="10" fill={i % 2 === 0 ? "#343A66" : "#242A4E"} />
        ))}

        {/* Wordmark painted on the shutter, Flipkart-style */}
        <text
          x="210"
          y="200"
          textAnchor="middle"
          fontFamily="'Baloo 2', sans-serif"
          fontWeight="800"
          fontSize="46"
          fill="#F5E5AB"
          letterSpacing="1"
        >
          SNAPIT
        </text>

        {/* Base ledge */}
        <rect x="20" y="266" width="380" height="12" rx="2" fill="#12162B" />
      </svg>
    </div>
  );
}