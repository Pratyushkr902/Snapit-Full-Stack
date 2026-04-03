import { io } from "socket.io-client";
import { useEffect } from "react";

// 1. UPDATED: Connect to your NEW Render Tracking Server
// We use the Render URL instead of localhost to make it live for users
const socket = io("https://snapit-full-stack-2.onrender.com", {
    transports: ["websocket", "polling"],
    withCredentials: true
}); 

const RiderGPS = ({ orderId }) => {

  useEffect(() => {
    if (!orderId) return;

    // 2. Start watching the GPS hardware on the phone/Mac
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        console.log("Rider sending location:", latitude, longitude);

        // 3. EMIT: Send the location to the server
        // Keeping your exact event name "update_location"
        socket.emit("update_location", {
          orderId: orderId,
          latitude: latitude,
          longitude: longitude
        });
      },
      (error) => console.error("GPS Error:", error),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        distanceFilter: 10 // Only send update if moved 10 meters
      }
    );

    // Cleanup when the delivery is done
    return () => navigator.geolocation.clearWatch(watchId);
  }, [orderId]);

  return (
    <div className="bg-green-100 p-2 text-xs rounded text-green-700 font-bold">
      GPS Tracking Active for Order: {orderId}
    </div>
  );
};

export default RiderGPS;