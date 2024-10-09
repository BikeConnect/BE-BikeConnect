const JWT = require("jsonwebtoken");
const { responseReturn } = require("./response");

module.exports.createToken = async (id) => {
  const accessToken = await JWT.sign(id, process.env.SECRET_ACCESS_TOKEN, {
    expiresIn: "30s",
  });
  const refreshToken = await JWT.sign(id, process.env.SECRET_REFRESH_TOKEN, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

module.exports.verifyAccessToken = (req, res, next) => {
  if (!req.headers["authorization"]) {
    responseReturn(res, 401, { status: "error", message: "Unauthorized" });
  }
  const authHeader = req.headers["authorization"];
  const bearerToken = authHeader.split(" ");
  const token = bearerToken[1];

  JWT.verify(token, process.env.SECRET_ACCESS_TOKEN, (err, payload) => {
    if (err) {
      return responseReturn(res, 403, { status: "error", message: "Forbidden" });
    }
    req.payload = payload;
    next();
  });
};
