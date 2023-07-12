class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // here we alreay set a message property from Error class inherited

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperation = true; // we only want to send error messages as res if the error is an operation error not a programming error

    Error.captureStackTrace(this, this.constructor); //this way when a object is created and new function is called then it not gonna appear is stack trace i.e location of our error (use console.log(err.stack) to see the location of the error
  }
}

module.exports = AppError;
