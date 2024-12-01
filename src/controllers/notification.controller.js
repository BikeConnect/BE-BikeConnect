"use strict";

const { SuccessResponse } = require("../core/success.response");
const { listNotiByCus, getAllNotifications } = require("../services/notification.service");

class NotificationController {
  listNotiByCus = async (req, res, next) => {
    new SuccessResponse({
      message: "create new listNotiByCus",
      metadata: await listNotiByCus(req.query),
    }).send(res);
  };

  getAllNotifications = async (req, res, next) => {
    try {
      const { sort } = req.query;

      const result = await getAllNotifications({
        sort: sort || "desc",
      });

      new SuccessResponse({
        message: "Get all notifications successfully",
        metadata: result,
      }).send(res);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new NotificationController();
