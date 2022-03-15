exports.errorHandler = (error, next) => {
  if (!error.statusCode) {
    error.statusCode = 500;
  }
  next(error);
};

exports.errorCheck = (message, code) => {
  const error = new Error(message);
  error.statusCode = code;
  throw error;
};
