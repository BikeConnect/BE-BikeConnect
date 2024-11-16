const JWT = require("jsonwebtoken");

module.exports.createToken = async (user) => {
  const payload = {
    id: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  };
  const accessToken = await JWT.sign(payload, process.env.SECRET_ACCESS_TOKEN, {
    expiresIn: "1h",
  });
  const refreshToken = await JWT.sign(payload, process.env.SECRET_REFRESH_TOKEN, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};
