const app = require("./app");
const port = process.env.PORT || 8000;
const socket = require("socket.io");
const http = require("http");
const serverIO = http.createServer(app);

const io = socket(serverIO, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

var allCustomers = [];
var allOwners = [];

const addCustomer = (customerId, socketId, userInfo) => {
  const checkCustomer = allCustomers.some(
    (customer) => customer.customerId === customerId
  );
  if (checkCustomer) {
    allCustomers.push({ customerId, socketId, userInfo });
  }
};

const addOwner = (ownerId, socketId, userInfo) => {
  const checkOwner = allOwners.some((owner) => owner.ownerId === ownerId);
  if (!checkOwner) {
    allOwners.push({ ownerId, socketId, userInfo });
  }
};

const findCustomer = (customerId) => {
  return allCustomers.find((customer) => customer.customerId === customerId);
}

const findOwner = (ownerId) => {
  return allOwners.find((owner) => owner.ownerId === ownerId);
} 

const remove = (socketId) => {
  allCustomers = allCustomers.filter((customer) => customer.socketId !== socketId);
  allOwners = allOwners.filter((owner) => owner.socketId !== socketId);
}

io.on("connection", (soc) => {
  console.log("Socket Server Is Running...");
});

const server = serverIO.listen(port, () => {
  console.log(`Serving at port ${port}`);
});

process.on("SIGINT", () => {
  server.close(() => {
    console.log("Server has been closed");
  });
});
