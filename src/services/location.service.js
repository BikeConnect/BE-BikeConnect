const axios = require("axios");

const GOMAPS_API_KEY = process.env.GOMAPS_API_KEY;

const calculateDistance = async (customerAddress, ownerAddress) => {
  const url = `https://maps.gomaps.pro/maps/api/distancematrix/json?origins=${encodeURIComponent(
    customerAddress
  )}&destinations=${encodeURIComponent(ownerAddress)}&key=${GOMAPS_API_KEY}`;

  try {
    const response = await axios.get(url);
    if (response.data && response.data.rows && response.data.rows.length > 0) {
      const distance = response.data.rows[0].elements[0].distance;
      return distance;
    }
    throw new Error("No distance data found");
  } catch (error) {
    throw new Error(`Error calculating distance: ${error.message}`);
  }
};

module.exports = {
  calculateDistance,
};
