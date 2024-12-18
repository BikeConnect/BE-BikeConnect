"use strict";

const { SuccessResponse } = require("../core/success.response");
const NOTI = require("../models/notificationModel");
const { responseReturn } = require("../utils/response");
const {
  listNotiByCus,
  getAllNotifications,
} = require("../services/notification.service");
const notificationService = require("../services/notification.service");

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

  async getOwnerNotifications(req, res) {
    try {
      const ownerId = req.id;
      const notifications = await notificationService.getOwnerNotifications(
        ownerId
      );

      const unreadCount = notifications.filter((n) => !n.isRead).length;

      return responseReturn(res, 200, {
        success: true,
        notifications,
        unreadCount,
        total: notifications.length,
      });
    } catch (error) {
      console.error("Get owner notifications error:", error);
      return responseReturn(res, 500, {
        success: false,
        message: error.message,
      });
    }
  }

  async getCustomerNotifications(req, res) {
    try {
      const customerId = req.id;
      const notifications = await notificationService.getCustomerNotifications(
        customerId
      );

      const unreadCount = notifications.filter((n) => !n.isRead).length;

      return responseReturn(res, 200, {
        success: true,
        notifications,
        unreadCount,
        total: notifications.length,
      });
    } catch (error) {
      console.error("Get customer notifications error:", error);
      return responseReturn(res, 500, {
        success: false,
        message: error.message,
      });
    }
  }

  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const notification = await notificationService.markAsRead(notificationId);

      return responseReturn(res, 200, {
        success: true,
        message: "Notification marked as read",
        notification,
      });
    } catch (error) {
      return responseReturn(res, 500, {
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new NotificationController();
