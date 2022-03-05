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

exports.createPost = (req, res, next) => {
  const title = req.body.title;
  const content = req.body.content;

  res.status(201).json({
    message: "Post created successfully",
    post: { id: new Date().toISOString(), title, content },
  });
};
