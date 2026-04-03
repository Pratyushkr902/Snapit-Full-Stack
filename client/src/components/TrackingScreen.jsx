import { io } from "socket.io-client";
import { useEffect, useState } from "react";

// Connect to your Node.js server
const socket = io("https://snapit-full-stack-2.onrender.com"); 

const TrackingScreen = ({ orderId }) => {
  const [riderLocation, setRiderLocation] = useState(null);

  useEffect(() => {
    // 1. Join the specific order room
    socket.emit("join_order", orderId);

    // 2. Listen for the 'rider_moved' event we defined in index.js
    socket.on("rider_moved", (data) => {
      console.log("Rider is moving:", data);
      setRiderLocation({
        lat: data.latitude,
        lng: data.longitude
      });
    });

    return () => {
      socket.off("rider_moved");
    };
  }, [orderId]);

  return (
    <div>
      {/* Pass the dynamic riderLocation to your Map component */}
      <PaliganjMapTracker riderPos={riderLocation} />
      
      {/* ... rest of your status steps (Pending, Packing, etc.) */}
    </div>
  );
};