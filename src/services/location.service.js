const axios = require("axios");

const GOMAPS_API_KEY = process.env.GOMAPS_API_KEY;

const calculateDistance = async (
  customerAddress,
  ownerAddress,
  retries = 3
) => {
  for (let i = 0; i < retries; i++) {
    try {
      const url = `https://maps.gomaps.pro/maps/api/distancematrix/json?origins=${encodeURIComponent(
        customerAddress
      )}&destinations=${encodeURIComponent(
        ownerAddress
      )}&key=${GOMAPS_API_KEY}`;

      console.log("Request URL:", url);
      const response = await axios.get(url, { timeout: 10000 });
      console.log("API Response:", JSON.stringify(response.data, null, 2));

      if (
        response.data &&
        response.data.rows &&
        response.data.rows.length > 0 &&
        response.data.rows[0].elements &&
        response.data.rows[0].elements.length > 0 &&
        response.data.rows[0].elements[0].distance
      ) {
        const distance = response.data.rows[0].elements[0].distance;
        return distance;
      }
      console.log("Invalid response structure:", response.data);
      throw new Error("No distance data found");
    } catch (error) {
      console.error("API Error:", error);
      if (i === retries - 1) throw error;
      if (error.code === "ECONNRESET") {
        console.error(`Retry attempt ${i + 1} of ${retries}`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
};

module.exports = {
  calculateDistance,
};
