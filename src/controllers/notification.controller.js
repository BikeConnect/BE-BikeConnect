'use strict'

const { SuccessResponse } = require("../core/success.response");
const { listNotiByCus } = require("../services/notification.service")

class NotificationController {
  
  listNotiByCus = async (req, res, next) => {
    new SuccessResponse({
      message: 'create new listNotiByCus',
      metadata: await listNotiByCus(req.query)
    }).send(res)
  }
}

module.exports = new NotificationController()