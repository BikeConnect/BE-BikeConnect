const JWT = require("jsonwebtoken");
const { responseReturn } = require("./response");

module.exports.createToken = async (id) => {
  const accessToken = await JWT.sign(id, process.env.SECRET_ACCESS_TOKEN, {
    expiresIn: "1h",
  });
  const refreshToken = await JWT.sign(id, process.env.SECRET_REFRESH_TOKEN, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};



