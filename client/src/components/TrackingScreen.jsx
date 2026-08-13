import { io } from "socket.io-client";
import { io } from "socket.io-client";
import { useEffect, useState, useRef } from "react";

const SHOP_LAT = 25.2921;
const SHOP_LNG = 84.8170;

function getEstimatedMinutes(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(distance * 3 + 5);
}

const TrackingScreen = ({ orderId, order }) => {
  const [riderLocation, setRiderLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!orderId) return;

    // Initial ETA from shop → customer
    if (order?.deliveryLocation?.lat && order?.deliveryLocation?.lng) {
      const mins = getEstimatedMinutes(
        SHOP_LAT, SHOP_LNG,
        order.deliveryLocation.lat,
        order.deliveryLocation.lng
      );
      setEta(mins);
    }

    // ✅ Socket created INSIDE useEffect
    const socket = io(
      import.meta.env.VITE_API_URL || "https://snapit-full-stack-production.up.railway.app",
      {
        path: "/socket.io/",
        transports: ["websocket", "polling"],
        withCredentials: true,
      }
    );
    socketRef.current = socket;

    socket.emit("join_order", orderId);
    socket.on("connect", () => socket.emit("join_order", orderId));

    socket.on("rider_moved", (data) => {
      if (!data?.latitude || !data?.longitude) return;
      setRiderLocation({ lat: data.latitude, lng: data.longitude });

      if (order?.deliveryLocation?.lat && order?.deliveryLocation?.lng) {
        const mins = getEstimatedMinutes(
          data.latitude, data.longitude,
          order.deliveryLocation.lat,
          order.deliveryLocation.lng
        );
        setEta(mins);
      }
    });

    return () => {
      socket.emit("leave_order", orderId);
      socket.disconnect();
    };
  }, [orderId, order]);

  return (
    <div>
      {eta && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <span className="text-2xl">🛵</span>
          <div>
            <p className="text-green-700 font-bold text-lg">
              Arriving in ~{eta} mins
            </p>
            <p className="text-xs text-neutral-500">
              {riderLocation
                ? "Based on rider's current location"
                : "Estimated from store"}
            </p>
          </div>
        </div>
      )}
      <PaliganjMapTracker riderPos={riderLocation} />
    </div>
  );
};

export default TrackingScreen;