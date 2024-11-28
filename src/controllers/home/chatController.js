const ownerModel = require("../../models/ownerModel");
const customerModel = require("../../models/customerModel");
const ownerCustomerModel = require("../../models/message/ownerCustomerModel");
const ownerCustomerMessageModel = require("../../models/message/ownerCustomerMsgModel");
const { responseReturn } = require("../../utils/response");

const add_customer_owner = async (req, res) => {
  const { customerId, ownerId } = req.body;
  try {
    if (ownerId !== "") {
      const owner = await ownerModel.findById(ownerId);
      const customer = await customerModel.findById(customerId);
      const checkOwner = await ownerCustomerModel.findOne({
        $and: [
          {
            myId: {
              $eq: customerId,
            },
          },
          {
            myFriends: {
              $elemMatch: {
                fdId: ownerId,
              },
            },
          },
        ],
      });

      if (!checkOwner) {
        await ownerCustomerModel.updateOne(
          {
            myId: customerId,
          },
          {
            $push: {
              myFriends: {
                fdId: ownerId,
                name: owner.name,
                image: owner.image,
              },
            },
          }
        );
      }

      const checkCustomer = await ownerCustomerModel.findOne({
        $and: [
          {
            myId: {
              $eq: ownerId,
            },
          },
          {
            myFriends: {
              $elemMatch: {
                fdId: customerId,
              },
            },
          },
        ],
      });

      if (!checkCustomer) {
        await ownerCustomerModel.updateOne(
          {
            myId: ownerId,
          },
          {
            $push: {
              myFriends: {
                fdId: customerId,
                name: customer.name,
                image: "",
              },
            },
          }
        );
      }

      const messages = await ownerCustomerMessageModel.find({
        $or: [
          {
            $and: [
              {
                receiverId: { $eq: ownerId },
              },
              {
                senderId: { $eq: customerId },
              },
            ],
          },
          {
            $and: [
              {
                receiverId: { $eq: customerId },
              },
              {
                senderId: { $eq: ownerId },
              },
            ],
          },
        ],
      });

      // tim cac customer trong list message
      const MyFriends = await ownerCustomerModel.findOne({
        myId: customerId,
      });

      // tim owner hien tai trong list message
      const currentFriend = MyFriends.myFriends.find((s) => s.fdId === ownerId);

      responseReturn(res, 200, {
        MyFriends: MyFriends.myFriends,
        currentFriend,
        messages,
      });
    } else {
      const MyFriends = await ownerCustomerModel.findOne({
        myId: customerId,
      });
      responseReturn(res, 200, { MyFriends: MyFriends.myFriends });
    }
  } catch (err) {
    console.log(error.message);
  }
};

module.exports = {
  add_customer_owner,
};
