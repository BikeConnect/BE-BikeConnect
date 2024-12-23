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
  if (!checkCustomer) {
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
};

const findOwner = (ownerId) => {
  return allOwners.find((owner) => owner.ownerId === ownerId);
};

const remove = (socketId) => {
  allCustomers = allCustomers.filter(
    (customer) => customer.socketId !== socketId
  );
  allOwners = allOwners.filter((owner) => owner.socketId !== socketId);
};

io.on("connection", (soc) => {
  console.log("Socket Server Is Running...");

  // add customer
  soc.on("add_user", (customerId, userInfo) => {
    addCustomer(customerId, soc.id, userInfo);
    io.emit("active_owner", allOwners);
  });
  // add owner
  soc.on("add_owner", (ownerId, userInfo) => {
    addOwner(ownerId, soc.id, userInfo);
    io.emit("active_owner", allOwners);
  });

  // notifications
  soc.on("join_notifications", (userId, userRole) => {
    const room = `${userRole}_${userId}`;
    soc.join(room);
    console.log(`User joined room: ${room}`);
  });

  //contract notifications
  soc.on(
    "contract_notification",
    ({ senderId, receiverId, receiverRole, notification }) => {
      const receiverRoom = `${receiverRole}_${receiverId}`;
      soc.to(receiverRoom).emit("new_notification", notification);
    }
  );

  //booking notifications
  soc.on(
    "booking_notification",
    ({ senderId, receiverId, receiverRole, notification }) => {
      const receiverRoom = `${receiverRole}_${receiverId}`;
      soc.to(receiverRoom).emit("new_notification", notification);
    }
  );

  //review notifications
  soc.on(
    "review_notification",
    ({ senderId, receiverId, receiverRole, notification }) => {
      const receiverRoom = `${receiverRole}_${receiverId}`;
      soc.to(receiverRoom).emit("new_notification", notification);
    }
  );

  //gui message tu phia owner
  soc.on("send_owner_message", (msg) => {
    const customer = findCustomer(msg.receiverId);
    if (customer !== undefined) {
      soc.to(customer.socketId).emit("owner_message", msg);
    }
  });

  // gui message tu phia customer
  soc.on("send_customer_message", (msg) => {
    const owner = findOwner(msg.receiverId);
    if (owner !== undefined) {
      soc.to(owner.socketId).emit("customer_message", msg);
    }
  });

  soc.on("disconnect", () => {
    console.log("User disconnected");
    remove(soc.id);
    io.emit("active_owner", allOwners);
  });
});

const server = serverIO.listen(port, () => {
  console.log(`Serving at port ${port}`);
});

process.on("SIGINT", () => {
  server.close(() => {
    console.log("Server has been closed");
  });
});

module.exports = { io, server: serverIO };
