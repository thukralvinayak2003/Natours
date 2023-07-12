const sharp = require('sharp');
const multer = require('multer');
const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );

//val contains value of id and it is a good practice to use as many middleware possible in our app

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  //it checks if the file is an image if yes thenit returns true (it also works with any kind of files)
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images , 400'), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
}); //upload image to this destination

// upload.array('images', 3); // if we didnt have image cover
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) next();

  req.body.imageCover = `tours-${req.params.id}-${Date.now()}-cover-jpeg`;

  //1) Cover image
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`); // sharp() this will create an object n which we can chain multiple methods to do our image processing and resize() will crop the image tojpeg to reduce the quality of the image and toFile to store the image

  // //2) Images
  //if we use foreach here async await will not work cuz async await is happening inside of a call back fuction foreach so if we use map we will return an array of these promises so if we use promise.all we can await these promises
  await Promise.all(
    req.files.images.map(async (file, i) => {
      req.body.images = [];
      const filename = `tours-${req.params.id}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`); // sharp() this will create an object n which we can chain multiple methods to do our image processing and resize() will crop the image tojpeg to reduce the quality of the image and toFile to store the image

      req.body.images.push(filename);
    })
  );

  next();
});

exports.alias = (req, res, next) => {
  req.query.limit = 5;
  req.query.sort = '-ratingsAverage , price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);

exports.createTour = factory.createOne(Tour);

exports.getTour = factory.getOne(Tour, { path: 'reviews' });

exports.updateTour = factory.updateOne(Tour);

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   if (!tour) {
//     return next(new AppError('No tour found', 404));
//   } // return so the code after it doesnt get executed

//   res.status(204).json({
//     // 204 means no content
//     status: 'success',
//     data: null,
//   });
// });

exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res) => {
  const stats = await Tour.aggregate([
    //here we manipulate the data and aggregate in into something new with couple of steps and returns aggregated object
    {
      $match: { ratingsAverage: { $gte: 4.5 } }, // used as filter
    },
    {
      $group: {
        //group by
        // _id: 'null', // group everything
        _id: { $toUpper: '$difficulty' }, // group by difficulty
        numTour: { $sum: 1 }, // 1 would be added of reach document
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: {
        avgPrice: 1, // ASCENDING is 1
      },
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } }, // we can match multiple times
    // },
  ]);

  res.status(200).json({
    status: 'success',
    data: { stats },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res) => {
  const year = req.params.year * 1; //2021

  const plan = await Tour.aggregate([
    { $unwind: '$startDates' }, // we can have one document for each of the dates of a tour
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' }, //return month of start
        numTourStart: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: {
        _id: 0, //if 0 then it will not show the field if 1 then it will
      },
    },
    {
      $sort: { numTourStart: -1 }, // 1 for ascending -1 for descending
    },
    {
      $limit: 12, // show only 12 outputs not really useful just for knowledge
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: { plan },
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latLong, unit } = req.params;
  const [lat, long] = latLong.split(',');
  if (!lat || !long) {
    next(
      new AppError('Please Provide latitude and longitude in the format', 400)
    );
  }

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1; // were calculating radians of the distance by divide distance with radius of earth

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[long, lat], radius] } },
  }); //$geoWIthin it findss documents within a certain geometery //we want to find them inside of a sphere which starts at center to the distance given in req.params here the coordinates are defined as longitude first and then latitude

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      doc: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latLong, unit } = req.params;
  const [lat, long] = latLong.split(',');
  if (!lat || !long) {
    next(
      new AppError('Please Provide latitude and longitude in the format', 400)
    );
  }
  const multiplier = unit === 'mi' ? 0.000621371 : 0.01;
  const distances = await Tour.aggregate([
    {
      //$geoNear is the only stage in the pipeline for geospatial aggregation
      //it should be first in the pipeline always
      //it requires one of our fields has to be geospatial index on it here that is startLocation

      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [long * 1, lat * 1], // too convert them into numbers
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier, // convert distance from meters to kilometers or miles
      },
    },
    {
      //so that we only get distance and name of tour in the output
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',

    data: {
      doc: distances,
    },
  });
});
