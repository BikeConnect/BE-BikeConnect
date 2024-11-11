const express = require("express");
const cors = require("cors");
const app = express();
const cookieParser = require("cookie-parser");
const compression = require("compression");
const morgan = require("morgan");
const { dbConnect } = require("./database/dbConnect");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/home/customerRoutes");
const postOwer = require("./routes/post");
const portal = require("./routes/portal");
const ownerRoutes = require("./routes/ownerRoutes");

app.use(morgan("dev"));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
dbConnect();

app.use("/api/post", postOwer);
app.use("/api", authRoutes);
app.use("/api",ownerRoutes);
app.use("/api", customerRoutes);
app.use("/api", portal);

app.use((req, res, next) => {
  const error = new Error("Not Found");
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  const statusCode = error.status || 500;
  return res.status(statusCode).json({
    status: "error",
    code: statusCode,
    stack: error.stack,
    message: error.message || "Internal Server Error",
  });
});

module.exports = app;
