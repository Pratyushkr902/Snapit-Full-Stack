export const sendSellerNotification = async (productName, currentStock) => {
    // In a real app, you'd use Firebase or OneSignal here.
    // For now, we will log it and you can trigger a Toast on the Admin Panel.
    console.log(`[ALERT] Seller Notification: ${productName} is low on stock (${currentStock} left)`);
    
    // You could also save this to a "Notifications" collection in MongoDB
};