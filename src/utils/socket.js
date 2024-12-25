let io;

const socketUtils = {
  init: (socketIo) => {
    io = socketIo;
  },
  
  emitNotification: (userId, notification) => {
    if (io) {
      io.to(userId.toString()).emit('notification', notification);
    }
  },
  
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  }
};

module.exports = { socketUtils };