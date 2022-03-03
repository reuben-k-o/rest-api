exports.getPosts = (req, res, next) => {
  res.status(200).json({
    posts: [
      {
        title: "First post",
        content:
          "This is my first post using rest api, basically its Rest Api's hello world",
      },
    ],
  });
};
