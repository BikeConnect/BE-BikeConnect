const JWT = require("jsonwebtoken");
<<<<<<< HEAD
const { responseReturn } = require("./response");

module.exports.createToken = async (id) => {
  const accessToken = await JWT.sign(id, process.env.SECRET_ACCESS_TOKEN, {
    expiresIn: "1h",
  });
  const refreshToken = await JWT.sign(id, process.env.SECRET_REFRESH_TOKEN, {
=======

module.exports.createToken = async (owner) => {
  const accessToken = await JWT.sign(owner, process.env.SECRET_ACCESS_TOKEN, {
    expiresIn: "1h",
  });
  const refreshToken = await JWT.sign(owner, process.env.SECRET_REFRESH_TOKEN, {
>>>>>>> Asset
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};



