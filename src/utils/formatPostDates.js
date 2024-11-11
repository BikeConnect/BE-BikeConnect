const moment = require("moment");

const formatPostDates = (post) => {
  const postObj = post._doc ? post._doc : post;
  return {
    ...postObj,
    startDate: moment(postObj.startDate).format("DD/MM/YYYY"),
    endDate: moment(postObj.endDate).format("DD/MM/YYYY"),
    availableDates: postObj.availableDates?.map((date) =>
      moment(date).format("DD/MM/YYYY")
    ),
  };
};

module.exports = { formatPostDates };
