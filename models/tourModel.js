const mongoose = require('mongoose');
const slugify = require('slugify'); // slug is a string we can put in our url based on some string
// const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'], // the second parameter is error message and it is a validation
      unique: true,
      maxlength: [40, ' A Tour must have a name shorter than 40 characters'],
      minlength: [10, 'a tour must have a name longer than 10 characters'],
      // validate: validator.isAlpha, // npm validator
    },
    slug: String, //
    duration: { type: Number, required: true },
    maxGroupSize: { type: Number, required: true },
    difficulty: {
      type: String,
      required: true,
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty must be easy or medium or difficult',
      },
    }, // enums checks the value being input is one of these
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [0, 'Rating must be above 0'],
      max: [5, 'Rating must not be above 5'],
      set: (val) => Math.round(val * 10) / 10, // 4.66 => 46.6 => 47.6=>4.7
    },
    ratingsQuantity: { type: Number, default: 0 },
    price: { type: Number, required: [true, 'A tour must have a price'] },
    Pricediscount: {
      type: Number,
      validate: {
        validator: function (val) {
          //price discount the user specified
          // AND THIS VALIDATOR WORKS ON THE CURRENT DOC ON NEW DOCUMENT CREATION I.E WILL NOT WORK ON UPDATE
          return val < this.price;
        },
        message: 'Discount must be ({VALUE}) below regular price', // ({VALUE}) will have access to the val variable
      },
    },
    summary: { type: String, trim: true, required: true }, // trim obly works on strings whichremoves all whitespace in the beginning and the end of the string
    description: {
      type: String,
      trim: true,
    },
    imageCover: { type: String },
    images: [String], //array of strings
    createdAt: {
      type: Date,
      default: Date.now(), // the mongo will automatically convert milliseconds to date
      select: false, // now it will not be sent to the client
    },
    startDates: [Date], // array of dates in which a tour in starting
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      //GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number], //First longitude than  latitude
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number], //First longitude than  latitude
        address: String,
        description: String,
      },
    ],
    //Child Referencing
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ], //It means we expect a type of element here to be MongoDB Id
  },
  {
    toJSON: { virtuals: true }, // each time data is outputted to JSON we want virtual to be a part of output
    toObject: { virtuals: true }, //each time data is outputted to Object we want virtual to be a part of output
  }
);

// It makes the process of querying faster for price
tourSchema.index({ price: 1, ratingsAverage: -1 }); //1 means ascending order -1 means descending order
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

// just like anonymous functions in sql
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7; // an arrow function doesnt gets 'this' keyword but normal does i.e why we used normal function here . and 'this' is pointing towards the current document and get here means when we do a get request the function returns a value
  //virtual functions are not part of the database so we cant do query in them
});

//Virtual Populate
tourSchema.virtual('reviews', {
  //here we reference to the review and link the tour field in Reviews(foreign model) to the Tours(local model) _id field when we need to show the data with can be of indefinite length we use virtual populate
  ref: 'Reviews',
  foreignField: 'tour',
  localField: '_id',
});

tourSchema.pre(/^find/, function () {
  // with populate we can fill the data in the field not in the databasse but only in the query and we can usselect items and this is pointing to the current query
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
});

//just like triggers in sql
//DOCUMENT MIDDLEWARE : runs before .save() and .create()
tourSchema.pre('save', function (next) {
  // this is called pre save middleware or pre save hook u can have multiple middleware
  this.slug = slugify(this.name, { lower: true });
  next();
});

//DOCUMENT MIDDLEWARE : runs after  .save() and .create()
// tourSchema.post('save', function (doc, next) {
//   // doc is the document that was just saved
//   console.log(doc);
//   next();
// });

//QUERY MIDDLEWARE : runs function before or after a query is executed
tourSchema.pre(/^find/, function (next) {
  // regular expression ^ means everything that starts with find
  // tourSchema.pre('find', function (next) {
  this.find({ secretTour: { $ne: true } }); //here 'this' is the current query

  next();
});

// // tourSchema.post('find', function (doc, next) {
// //   console.log(docs); // the documnets returned by executing the query
// // });

//AGGREGATION MIDDLEWARE : runs function before or after an aggregation is executed
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } }); //here 'this' is the current aggregation object .unshift adds the beginning of an array
//   console.log(this.pipeline());
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema); //convention to use model with first letter capital

module.exports = Tour;
