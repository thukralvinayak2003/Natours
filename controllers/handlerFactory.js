const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIfeatures = require('../utils/apiFeatures');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No tour found', 404));
    } // return so the code after it doesnt get executed

    res.status(204).json({
      // 204 means no content
      status: 'success',
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }); //new :true will return the modified tour and validators to check the validation

    if (!doc) {
      return next(new AppError('No tour found', 404));
    } // return so the code after it doesnt get executed

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res) => {
    // Method 1: here we make a instance of the model and save the req.body in that instance not the model itself
    // const newTour = new Tour();
    // newTour.save(req.body)

    const newDoc = await Model.create(req.body);

    res.status(201).json({
      // always needs to send a response
      // 201 means created successfully and u can only send one response
      status: 'success',
      data: {
        doc: newDoc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    //req.params is where all the parameters are stored as an object if we add route like /:x? that means its optional
    let query = Model.findById(req.params.id); // or Tour.findOne({_id: req.params.id})
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;

    if (!doc) {
      return next(new AppError('No tour found', 404));
    } // return so the code after it doesnt get executed

    res.status(200).json({
      //200 means success
      status: 'success',
      data: {
        doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // we need next to do next(new AppError)

    //to Allow nested routes in GET reviews on tours
    let filter = {};

    if (req.params.tourId) filter = { tour: req.params.tourId };

    //EXECUTE
    const features = new APIfeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const doc = await features.query; // if we add .explain to it then it will tell everything about the query

    res.status(200).json({
      //Jsend format
      status: 'success',
      results: doc.length,
      data: {
        doc,
      },
    });
  });
