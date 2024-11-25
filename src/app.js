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
const contractRoutes = require("./routes/home/contractRoutes");
const reviewRoutes = require("./routes/home/reviewRoutes");
const bookingRoutes = require("./routes/home/bookingRoutes");


app.use(morgan("dev"));
app.use(compression());
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Authorization",
    ],
    methods: "GET, POST, PUT, DELETE",
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
dbConnect();

app.use("/api/post", postOwer);
app.use("/api", authRoutes);
app.use("/api", ownerRoutes);
app.use("/api", customerRoutes);
app.use("/api", reviewRoutes);
app.use("/api", contractRoutes);
app.use("/api", bookingRoutes);
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
