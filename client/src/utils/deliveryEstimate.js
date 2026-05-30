// Haversine formula — straight line distance between two lat/lng points
export function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 3 min/km + 5 min prep time
export function getEstimatedMinutes(lat1, lng1, lat2, lng2) {
  const distance = getDistanceKm(lat1, lng1, lat2, lng2);
  return Math.round(distance * 3 + 5);
}