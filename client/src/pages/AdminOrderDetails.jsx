// Inside AdminOrderDetails.jsx
import RiderSimulator from '../components/RiderSimulator'; // Path to the simulator component

// Find where you display the order info and add:
<div className="mt-4 border-t pt-4">
    <h2 className="font-bold text-lg">Order Tracking Control</h2>
    <RiderSimulator orderId={orderData._id} /> 
</div>