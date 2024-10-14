const app = require("./app");
const port = process.env.PORT || 8000;

const server = app.listen(port, () => {
  console.log(`Serving at port ${port}`);
});

process.on("SIGINT", () => {
  server.close(() => {
    console.log("Server has been closed");
  });
});