const findReplyIndex = ({ replies, replyId, userId, userRole }) => {
  return replies.findIndex(
    (reply) =>
      reply._id.toString() === replyId &&
      reply.userId.toString() === userId &&
      reply.userType === userRole
  );
};

module.exports = { findReplyIndex };
