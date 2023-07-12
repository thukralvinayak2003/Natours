// eslint-disable-next-line arrow-body-style
module.exports = (fn) => {
  return (req, res, next) => {
    // it is a promise so if a promise rejected then it gives an error and here we handling that error
    fn(req, res, next).catch(next);
  };
};
