const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    //Parent Referencing // we use parent referncing when we dont know how much our array will grow
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review should belong to a tour'],
    },

    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review should belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true }, // each time data is outputted to JSON we want virtual to be a part of output
    toObject: { virtuals: true }, //each time data is outputted to Object we want virtual to be a part of output
  }
);

//Preventing duplicate reviews

reviewSchema.index({ tour: 1, user: 1 }, { unique: true }); // each combination of tour and user should be unique

reviewSchema.pre(/^find/, function () {
  // with populate we can fill the data in the field not in the databasse but only in the query and we can usselect items and this is pointing to the current query
  // this.populate({
  //   path: 'tour', // the name of the field should be the name defined in the schema here it is tour not Tours
  //   select: 'name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });
  this.populate({
    path: 'user',
    select: 'name photo',
  });
});

//static methods
reviewSchema.statics.calcAverageRating = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }, //select tour of the tourId
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

//we cant put this middleware after reviews declaration as then the reviewSchema will be already be created so the post middlware will not work
reviewSchema.post('save', function () {
  // post doesnt get access to the nest function
  //pre will not work as the review is not in the DB yet so we use post
  // this points to the current review

  this.constructor.calcAverageRating(this.tour); //this.constructor means the current model that is reviews
});

reviewSchema.pre(/findOneAnd/, async function (next) {
  // go to this link for clone explaination https://mongoosejs.com/docs/migrating_to_6.html#duplicate-query-execution
  //findByIdAndUpdate is an extension to findOne so this will apply to FindById too
  this.r = await this.clone().findOne(); // here this is the current query but we need access to the current review document so we will use FindOne and const r cannot be accessed by another middleware so we will use this.r to that it can be accessed globally
  next();
});

reviewSchema.post(/findOneAnd/, async function (next) {
  // this.r = await this.findOne(); doesnot work here as the query is already executed
  await this.r.constructor.calcAverageRating(this.r.tour);
});

const Reviews = mongoose.model('Reviews', reviewSchema);
module.exports = Reviews;
