// Function to calculate distance between two points in KM
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
};

// Key Landmarks for Snapit
export const LANDMARKS = {
    ACHHUA: { lat: 25.3509, lon: 84.8178, name: "Achhua (P.N.K College)" },
    AKHTIYARPUR: { lat: 25.3621, lon: 84.8165, name: "Akhtiyarpur Market" },
    PALIGANJ_HUB: { lat: 25.2921, lon: 84.8170, name: "Snapit Central Hub" }
};