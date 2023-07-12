const Reviews = require('../models/reviewModel');
// const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.setTourUserId = (req, res, next) => {
  //Allow nested Routes
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.createReviews = factory.createOne(Reviews);

exports.deleteReview = factory.deleteOne(Reviews);

exports.updateReview = factory.updateOne(Reviews);

exports.getReview = factory.getOne(Reviews);

exports.getAllReviews = factory.getAll(Reviews);
