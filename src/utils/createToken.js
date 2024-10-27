const JWT = require("jsonwebtoken");

module.exports.createToken = async (owner) => {
  const accessToken = await JWT.sign(owner, process.env.SECRET_ACCESS_TOKEN, {
    expiresIn: "1h",
  });
  const refreshToken = await JWT.sign(owner, process.env.SECRET_REFRESH_TOKEN, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};



