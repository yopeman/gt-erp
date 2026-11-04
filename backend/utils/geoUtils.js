/**
 * Haversine formula to calculate distance between two coordinates in meters
 */
export const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  if (
    lat1 === undefined || lat1 === null ||
    lon1 === undefined || lon1 === null ||
    lat2 === undefined || lat2 === null ||
    lon2 === undefined || lon2 === null
  ) {
    return null;
  }

  const R = 6371e3; // Earth's radius in meters
  const toRad = (value) => (Number(value) * Math.PI) / 180;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

/**
 * Check if given coordinates are within allowed office radius
 */
export const checkGeofence = (
  employeeLat,
  employeeLon,
  officeLat,
  officeLon,
  radiusMeters = 200
) => {
  const distance = getDistanceInMeters(employeeLat, employeeLon, officeLat, officeLon);
  if (distance === null) {
    return {
      isValid: false,
      distance: null,
      message: 'Coordinates missing or invalid'
    };
  }

  const isWithin = distance <= radiusMeters;
  return {
    isValid: isWithin,
    distance,
    allowedRadius: radiusMeters,
    message: isWithin
      ? `Within permitted work perimeter (${distance}m)`
      : `Outside permitted office radius (${distance}m > ${radiusMeters}m limit)`
  };
};

export default {
  getDistanceInMeters,
  checkGeofence
};

