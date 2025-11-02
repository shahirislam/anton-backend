const responseTrait = (req, res, next) => {
  res.success = (message = 'Operation successful', data = null, statusCode = 200) => {
    if (res.headersSent) {
      return res;
    }

    const response = {
      success: true,
      message,
    };

    if (data !== null) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  };

  res.error = (message = 'An error occurred', statusCode = 400, errors = null) => {
    if (res.headersSent) {
      return res;
    }

    const response = {
      success: false,
      message,
    };

    if (errors !== null && errors !== undefined) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  };

  next();
};

module.exports = responseTrait;

