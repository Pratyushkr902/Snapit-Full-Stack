import { io } from "socket.io-client";
import { useEffect, useState, useRef } from "react";

const RiderGPS = ({ orderId = "SNAP-ORDER-9921" }) => {
  const [status, setStatus] = useState("waiting"); // waiting | active | error
  const [coords, setCoords] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [broadcastCount, setBroadcastCount] = useState(0);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!orderId) return;

    // ✅ FIX: Socket initialized INSIDE useEffect — prevents stale closure
    //         and avoids module-level socket that never gets cleaned up
    const socket = io(
      import.meta.env.VITE_API_URL || "https://snapit-backend-bn8r.onrender.com",
      {
        path: "/socket.io/",
        transports: ["websocket", "polling"],
        withCredentials: true,
      }
    );
    socketRef.current = socket;

    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy: acc } = position.coords;
        setCoords({ latitude, longitude });
        setAccuracy(Math.round(acc));
        setStatus("active");

        socket.emit("send_location", {
          orderId,
          latitude,
          longitude,
        });

        setBroadcastCount((c) => c + 1);
      },
      (error) => {
        console.error("❌ GPS Error:", error.message);
        setStatus("error");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    // ✅ FIX: Both clearWatch AND socket.disconnect in cleanup
    return () => {
      navigator.geolocation.clearWatch(watchId);
      socket.disconnect();
    };
  }, [orderId]);

  const statusConfig = {
    waiting: {
      bg: "#fef9ee",
      border: "#f5c84a",
      dot: "#f5c84a",
      ping: "#fde68a",
      label: "Acquiring GPS signal…",
      badge: "Connecting",
      badgeBg: "#f5c84a",
      badgeColor: "#713f12",
    },
    active: {
      bg: "#f0fdf4",
      border: "#4ade80",
      dot: "#16a34a",
      ping: "#86efac",
      label: `Broadcasting · ${broadcastCount} updates sent`,
      badge: "Live",
      badgeBg: "#16a34a",
      badgeColor: "#fff",
    },
    error: {
      bg: "#fff5f5",
      border: "#fc8181",
      dot: "#e53e3e",
      ping: "#fed7d7",
      label: "GPS unavailable — check browser permissions",
      badge: "Error",
      badgeBg: "#e53e3e",
      badgeColor: "#fff",
    },
  };

  const cfg = statusConfig[status];

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        borderRadius: "16px",
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        maxWidth: "460px",
        margin: "12px auto",
        fontFamily: "system-ui, -apple-system, sans-serif",
        transition: "all 0.3s ease",
      }}
    >
      {/* Left: pulse dot + info */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Pulse dot */}
        <div style={{ position: "relative", width: "14px", height: "14px", flexShrink: 0 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: cfg.ping,
              animation: status === "active" ? "gps-ping 1.4s ease-out infinite" : "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "3px",
              borderRadius: "50%",
              background: cfg.dot,
            }}
          />
        </div>

        {/* Text */}
        <div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: "700",
              color: "#1a202c",
              letterSpacing: "-0.01em",
            }}
          >
            Snapit Rider GPS
          </div>
          <div style={{ fontSize: "11px", color: "#4a5568", marginTop: "1px", fontFamily: "monospace" }}>
            {cfg.label}
          </div>
          {coords && status === "active" && (
            <div style={{ fontSize: "10px", color: "#718096", marginTop: "2px", fontFamily: "monospace" }}>
              {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
              {accuracy && ` · ±${accuracy}m`}
            </div>
          )}
          <div style={{ fontSize: "10px", color: "#718096", marginTop: "1px", fontFamily: "monospace" }}>
            ID: {orderId}
          </div>
        </div>
      </div>

      {/* Badge */}
      <div
        style={{
          background: cfg.badgeBg,
          color: cfg.badgeColor,
          fontSize: "10px",
          fontWeight: "800",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          padding: "4px 10px",
          borderRadius: "8px",
          flexShrink: 0,
        }}
      >
        {cfg.badge}
      </div>

      <style>{`
        @keyframes gps-ping {
          0%   { transform: scale(1); opacity: 0.8; }
          70%  { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default RiderGPS;