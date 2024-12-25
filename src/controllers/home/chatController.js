const ownerModel = require("../../models/ownerModel");
const customerModel = require("../../models/customerModel");
const ownerCustomerModel = require("../../models/message/ownerCustomerModel");
const ownerCustomerMessageModel = require("../../models/message/ownerCustomerMsgModel");
const adminOwnerMessageModel = require("../../models/message/adminOwnerMsgModel");
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
                image: customer.image,
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
  } catch (error) {
    console.log(error.message);
  }
};

const add_owner_customer = async (req, res) => {
  const { customerId, ownerId } = req.body;
  try {
    if (customerId !== "") {
      const owner = await ownerModel.findById(ownerId);
      const customer = await customerModel.findById(customerId);

      const checkOwner = await ownerCustomerModel.findOne({
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

      if (!checkOwner) {
        await ownerCustomerModel.updateOne(
          {
            myId: ownerId,
          },
          {
            $push: {
              myFriends: {
                fdId: customerId,
                name: customer.name,
                image: customer.image,
              },
            },
          }
        );
      }

      const checkCustomer = await ownerCustomerModel.findOne({
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

      if (!checkCustomer) {
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

      const messages = await ownerCustomerMessageModel.find({
        $or: [
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
        ],
      });

      const MyFriends = await ownerCustomerModel.findOne({
        myId: ownerId,
      });

      const currentFriend = MyFriends.myFriends.find(
        (s) => s.fdId === customerId
      );

      responseReturn(res, 200, {
        MyFriends: MyFriends.myFriends,
        currentFriend,
        messages,
      });
    } else {
      const MyFriends = await ownerCustomerModel.findOne({
        myId: ownerId,
      });
      responseReturn(res, 200, { MyFriends: MyFriends.myFriends });
    }
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const send_message_to_owner = async (req, res) => {
  const { customerId, text, ownerId, name } = req.body;
  try {
    const message = await ownerCustomerMessageModel.create({
      senderId: customerId,
      senderName: name,
      receiverId: ownerId,
      message: text,
    });

    const data = await ownerCustomerModel.findOne({
      myId: customerId,
    });

    let myFriends = data.myFriends;
    let index = myFriends.findIndex((f) => f.fdId === ownerId);
    while (index > 0) {
      let temp = myFriends[index];
      myFriends[index] = myFriends[index - 1];
      myFriends[index - 1] = temp;
      index--;
    }
    await ownerCustomerModel.updateOne(
      {
        myId: customerId,
      },
      {
        myFriends,
      }
    );

    const data1 = await ownerCustomerModel.findOne({
      myId: ownerId,
    });

    let myFriends1 = data1.myFriends;
    let index1 = myFriends1.findIndex((f) => f.fdId === customerId);
    while (index1 > 0) {
      let temp1 = myFriends1[index1];
      myFriends1[index1] = myFriends1[index1 - 1];
      myFriends1[index1 - 1] = temp1;
      index1--;
    }
    await ownerCustomerModel.updateOne(
      {
        myId: ownerId,
      },
      {
        myFriends1,
      }
    );
    responseReturn(res, 201, { message });
  } catch (error) {
    console.log(error.message);
  }
};

const get_customers = async (req, res) => {
  const { ownerId } = req.params;
  try {
    const data = await ownerCustomerModel.findOne({
      myId: ownerId,
    });
    responseReturn(res, 200, { customers: data.myFriends });
  } catch (error) {
    console.log(error.message);
  }
};

const get_customer_message = async (req, res) => {
  const { customerId } = req.params;
  const { id } = req;
  try {
    const messages = await ownerCustomerMessageModel.find({
      $or: [
        {
          $and: [
            {
              receiverId: { $eq: customerId },
            },
            {
              senderId: { $eq: id },
            },
          ],
        },
        {
          $and: [
            {
              receiverId: { $eq: id },
            },
            {
              senderId: { $eq: customerId },
            },
          ],
        },
      ],
    });

    const currentCustomer = await customerModel.findById(customerId);
    responseReturn(res, 200, { currentCustomer, messages });
  } catch (error) {
    console.log(error.message);
  }
};

const owner_send_messages = async (req, res) => {
  const { senderId, receiverId, text, name } = req.body;
  try {
    const message = await ownerCustomerMessageModel.create({
      senderId: senderId,
      senderName: name,
      receiverId: receiverId,
      message: text,
    });

    const data = await ownerCustomerModel.findOne({
      myId: senderId,
    });

    let myFriends = data.myFriends;
    let index = myFriends.findIndex((f) => f.fdId === receiverId);
    while (index > 0) {
      let temp = myFriends[index];
      myFriends[index] = myFriends[index - 1];
      myFriends[index - 1] = temp;
      index--;
    }
    await ownerCustomerModel.updateOne(
      {
        myId: senderId,
      },
      {
        myFriends,
      }
    );

    const data1 = await ownerCustomerModel.findOne({
      myId: receiverId,
    });

    let myFriends1 = data1.myFriends;
    let index1 = myFriends1.findIndex((f) => f.fdId === senderId);
    while (index1 > 0) {
      let temp1 = myFriends1[index1];
      myFriends1[index1] = myFriends1[index1 - 1];
      myFriends1[index1 - 1] = temp1;
      index1--;
    }
    await ownerCustomerModel.updateOne(
      {
        myId: receiverId,
      },
      {
        myFriends1,
      }
    );
    responseReturn(res, 201, { message });
  } catch (error) {
    console.log(error.message);
  }
};

const get_owners = async (req, res) => {
  try {
    const owners = await ownerModel.find({});
    responseReturn(res, 200, { owners });
  } catch (error) {
    console.log(error.message);
  }
};

const owner_admin_message = async (req, res) => {
  const { senderId, receiverId, message, senderName } = req.body;
  try {
    const messageData = await adminOwnerMessageModel.create({
      senderId,
      receiverId,
      message,
      senderName,
    });
    responseReturn(res, 201, { message: messageData });
  } catch (error) {
    console.log(error.message);
  }
};

const get_admin_messages = async (req, res) => {
  const { receiverId } = req.params;
  const id = "";
  try {
    const messages = await adminOwnerMessageModel.find({
      $or: [
        {
          $and: [
            {
              receiverId: { $eq: receiverId },
            },
            {
              senderId: { $eq: id },
            },
          ],
        },
        {
          $and: [
            {
              receiverId: { $eq: id },
            },
            {
              senderId: { $eq: receiverId },
            },
          ],
        },
      ],
    });

    let currentOwner = {};
    if (receiverId) {
      currentOwner = await ownerModel.findById(receiverId);
    }
    responseReturn(res, 200, { messages, currentOwner });
  } catch (error) {
    console.log(error.message);
  }
};

const get_owner_messages = async (req, res) => {
  const receiverId = "";
  const { id } = req;
  try {
    const messages = await adminOwnerMessageModel.find({
      $or: [
        {
          $and: [
            {
              receiverId: { $eq: receiverId },
            },
            {
              senderId: { $eq: id },
            },
          ],
        },
        {
          $and: [
            {
              receiverId: { $eq: id },
            },
            {
              senderId: { $eq: receiverId },
            },
          ],
        },
      ],
    });

    responseReturn(res, 200, { messages });
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  add_customer_owner,
  add_owner_customer,
  send_message_to_owner,
  get_customers,
  get_customer_message,
  owner_send_messages,
  get_owners,
  owner_admin_message,
  get_admin_messages,
  get_owner_messages,
};
