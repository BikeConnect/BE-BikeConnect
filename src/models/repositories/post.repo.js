const { post } = require("../postModel");

const searchPostByCustomer = async ({ keySearch }) => {
  const regexSearch = new RegExp(keySearch);
  const result = await post
    .find(
      {
        $text: { $search: regexSearch }
      },
      { score: { $meta: "textScore" } }
    )
    .sort({ score: { $meta: "textScore" } })
    .lean();
  return result;
};

module.exports = { searchPostByCustomer };
