import { useEffect } from 'react';
import { socket } from '../utils/socket'; 
import toast from 'react-hot-toast';

// Assuming you have a state like: const [riderPos, setRiderPos] = useState([25.4775, 84.7344]);

useEffect(() => {
    // 1. Safety Check: Don't run if orderId isn't loaded yet
    if (!orderId) return;

    console.log("Connecting to Tracking Room for Order:", orderId);

    // 2. Join the specific order room
    socket.emit("join_order", orderId);

    // 3. Listen for the 'rider_moved' broadcast from the server
    const handleRiderMovement = (data) => {
        console.log("Rider Position Received:", data);
        
        // Ensure data has the correct format before updating state
        if (data.latitude && data.longitude) {
            setRiderPos([data.latitude, data.longitude]);
        }
    };

    socket.on("rider_moved", handleRiderMovement);

    // 4. Re-join room if the socket disconnects and reconnects (MacBook sleep/wake)
    socket.on("connect", () => {
        socket.emit("join_order", orderId);
    });

    // 5. Cleanup: Critical to prevent memory leaks and duplicate listeners
    return () => {
        console.log("Cleaning up socket listeners for:", orderId);
        socket.off("rider_moved", handleRiderMovement);
        socket.off("connect");
    };
}, [orderId]); // Runs whenever orderId is assigned or changed