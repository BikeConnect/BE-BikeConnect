const { responseReturn } = require("../utils/response");
const jwt = require("jsonwebtoken");
module.exports.verifyToken = (req, res, next) => {
  const accessToken =
    req.cookies.accessToken ||
    (req.headers.authorization && req.headers.authorization.split(" ")[1]);

  if (!accessToken) {
    console.log("accessToken::::", accessToken);
    return res.status(401).json({ message: "You are not authenticated" });
  } else {
    try {
      const decodeAccessToken = jwt.verify(
        accessToken,
        process.env.SECRET_ACCESS_TOKEN
      );
      const ownerId = decodeAccessToken.id;
      req.ownerId = ownerId;

      req.accessToken = { value: accessToken, exp: decodeAccessToken.exp };
      req.id = decodeAccessToken.id;
      req.role = decodeAccessToken.role;
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        responseReturn(res, 401, {
          message: "Access token expired",
          code: "AccessTokenExpired",
        });
      } else if (error instanceof jwt.JsonWebTokenError) {
        responseReturn(res, 401, {
          message: "Invalid access token",
          code: "InvalidAccessToken",
        });
      } else {
        responseReturn(res, 500, { message: error.message });
      }
    }
  }
};
