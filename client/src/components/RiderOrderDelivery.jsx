import { io } from "socket.io-client";
import { useEffect } from "react";

// 1. Connect to your 8080 Tracking Server
const socket = io("http://localhost:8080"); 

const RiderGPS = ({ orderId }) => {

  useEffect(() => {
    if (!orderId) return;

    // 2. Start watching the GPS hardware on the phone/Mac
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        console.log("Rider sending location:", latitude, longitude);

        // 3. EMIT: Send the location to the server
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