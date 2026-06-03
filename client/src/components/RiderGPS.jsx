import { io } from "socket.io-client";
import { useEffect } from "react";

const RiderGPS = ({ orderId = "SNAP-ORDER-9921" }) => {

  useEffect(() => {
    if (!orderId) return;

    const socket = io(import.meta.env.VITE_API_URL || "https://snapit-backend-bn8r.onrender.com", {
      path: '/socket.io/',
      transports: ["websocket", "polling"],
      withCredentials: true
    });

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log(`[Rider App] Broadcasting location for ${orderId}:`, latitude, longitude);
        socket.emit("send_location", { orderId, latitude, longitude });
      },
      (error) => console.error("❌ GPS Hardware Access Error:", error.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      socket.disconnect();
    };
  }, [orderId]);

  return (
    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between shadow-sm max-w-md mx-auto my-4">
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
        <div>
          <h4 className="text-sm font-bold text-emerald-900">Rider GPS Engine Active</h4>
          <p className="text-xs text-emerald-600 font-mono mt-0.5">Tracking ID: {orderId}</p>
        </div>
      </div>
      <span className="text-xs bg-emerald-600 text-white px-2 py-1 rounded font-bold uppercase tracking-wider">
        Live
      </span>
    </div>
  );
};

export default RiderGPS;
