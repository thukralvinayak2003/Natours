const sharp = require('sharp');
const multer = require('multer');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

const factory = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//   //cb is a callback function which is used like next()
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users'); // if there is an error than null else the destination
//   },
//   // user-324324km325231-435343534.jpeg
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1]; // this will give the extension as jpeg as in req.file object mimetype : 'image/jpeg'
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`); //
//   },
// });

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

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`); // sharp() this will create an object n which we can chain multiple methods to do our image processing and resize() will crop the image tojpeg to reduce the quality of the image and toFile to store the image

  next();
});

//an array called allowedFields as an parameter
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  //Loop through an object
  Object.keys(obj).forEach((element) => {
    if (allowedFields.includes(element)) newObj[element] = obj[element]; //what it does is to check if the obj Object contains the allowedFields and if it does then we add it to the newObj Object
  });
  return newObj;
};

exports.getMe = catchAsync(async (req, res, next) => {
  req.params.id = req.user.id;
  next();
});

exports.updateMe = catchAsync(async (req, res, next) => {
  //Create Error if user posts Post password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('You cannot update password here', 401));
  }

  //filtering the fields so that the user cant change their role = 'admin
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;

  //Update User data
  //AS we dont need to update any sensitive data we dont need use save() as then we need to update every required field
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  }); //new:true means to return the updated object
  res.status(200).json({
    status: 'success',
    user: updatedUser,
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined Please use sign up instead',
  });
};

exports.getAllUsers = factory.getAll(User);

exports.getUser = factory.getOne(User);

//Do not change passwords with this
exports.updateUser = factory.updateOne(User);

exports.deleteUser = factory.deleteOne(User);
