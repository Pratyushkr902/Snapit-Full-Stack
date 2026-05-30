import { io } from "socket.io-client";
import { useEffect, useState } from "react";

const socket = io(import.meta.env.VITE_API_URL);

// 👇 Your shop's coordinates (update these)
const SHOP_LAT = 25.4775;
const SHOP_LNG = 84.7344;

// Haversine distance formula
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
  return Math.round(distance * 3 + 5); // 3 min/km + 5 min prep
}

const TrackingScreen = ({ orderId, order }) => {
  const [riderLocation, setRiderLocation] = useState(null);
  const [eta, setEta] = useState(null);

  useEffect(() => {
    // Calculate initial ETA from shop → customer before rider moves
    if (order?.deliveryLocation) {
      const mins = getEstimatedMinutes(
        SHOP_LAT,
        SHOP_LNG,
        order.deliveryLocation.lat,
        order.deliveryLocation.lng
      );
      setEta(mins);
    }

    socket.emit("join_order", orderId);

    socket.on("rider_moved", (data) => {
      console.log("Rider is moving:", data);
      setRiderLocation({ lat: data.latitude, lng: data.longitude });

      // Recalculate ETA from rider's live position → customer
      if (order?.deliveryLocation) {
        const mins = getEstimatedMinutes(
          data.latitude,
          data.longitude,
          order.deliveryLocation.lat,
          order.deliveryLocation.lng
        );
        setEta(mins);
      }
    });

    return () => {
      socket.off("rider_moved");
    };
  }, [orderId, order]);

  return (
    <div>
      {/* ETA Banner */}
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

      {/* Map */}
      <PaliganjMapTracker riderPos={riderLocation} />

      {/* ... rest of your status steps */}
    </div>
  );
};