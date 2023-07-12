const JWT = require('jsonwebtoken');
const { promisify } = require('util'); //it have the promisify function
const crypto = require('crypto');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

//jwt_secret should be 32character atleast and header will be  automatically created and here in options we putting the expire time
const signToken = (id) =>
  JWT.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    //IN js to specify date we use new Date
    expires: new Date(
      Date.now() +
        Number(process.env.JWT_COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // SO the cookie cannot be accessed or modified by the browser
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('JWT', token, cookieOptions);

  //Removes the password from the output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  // it gives a promise
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body; //by using destructing we are taking email and password from the body
  //CHECK if the email or password exists
  if (!email || !password) {
    return next(new AppError('Please provide the email and password', 400));
  }
  //check if the email or password is correct
  const user = await User.findOne({ email }).select('+password'); //when we want to select the data which is select : false in Usermodel as default we can to add .select('+<field u want>)

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect password or email', 401));
  }
  // if everything is ok then send token to client
  createSendToken(user, 200, res);
});

exports.logout = (req, res, next) => {
  res.cookie('JWT', 'loggedOut', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    status: 'success',
  });
  next();
};

// Only for rendered pages , no errors!
exports.isLoggedIn = async (req, res, next) => {
  try {
    if (req.cookies.JWT) {
      const decode = await promisify(JWT.verify)(
        req.cookies.JWT,
        process.env.JWT_SECRET
      ); //this needs a callback but if u want to return a promise we need to promisify the function
      //decode will have the id

      //2- Check if the user still exists i.e if the user is deleted then the token should also be not valid
      const currentUser = await User.findById(decode.id);
      if (!currentUser) {
        return next();
      }

      // 3 - Check if the user changed their password after token was issued
      if (currentUser.changedPasswordAfter(decode.iat)) {
        return next();
      }

      //There is an logged in user
      res.locals.user = currentUser; //it will create a user variable avaliable for all pug templates
      return next();
    }
  } catch (error) {
    return next();
  }

  next();
};

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  //1 - Getting the token and check it is there
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1]; // the token cannot be declared inside the block as it scope will only remain inside the block
    // console.log(token);
  } else if (req.cookies.JWT) {
    token = req.cookies.JWT;
  }

  if (!token) {
    if (req.originalUrl.startsWith('/me')) {
      return res.redirect('/');
    }
    return next(
      new AppError('You are not logged in, please log in to get access', 401)
    );
  }
  //2- Verify the token
  const decode = await promisify(JWT.verify)(token, process.env.JWT_SECRET); //this needs a callback but if u want to return a promise we need to promisify the function
  //decode will have the id
  //3- Check if the user still exists i.e if the user is deleted then the token should also be not valid
  const currentUser = await User.findById(decode.id);
  if (!currentUser) {
    return next(new AppError('User does not exist', 401));
  }

  // 4 - Check if the user changed their password after token was issued
  if (currentUser.changedPasswordAfter(decode.iat)) {
    return next(
      new AppError('Password was changed recently . Please Login Again', 401)
    );
  }

  //Grant access to the protected Route
  req.user = currentUser;
  res.locals.user = currentUser; //it will create a user variable avaliable for all pug templates

  next();
});

// In this function we want to send arbitrary number of arguments i.e of roles we will use rest parameters syntax ..<argument>
exports.restrictTo =
  (...roles) =>
  // roles is a array

  (req, res, next) => {
    // includes checks if the value is in a array returns true or false
    if (!roles.includes(req.user.role)) {
      next(new AppError('You are not allowed to perform this action', 403)); // 403 means forbidden error
    }
    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //Get user thorugh his email address
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with this email', 403));
  }

  //Generate random reset Token
  const resetToken = user.createPasswordResetToken();
  //  saving user updates without skipping the validation step and only validating modified fields:
  await user.save({ validateModifiedOnly: true });

  //Send the email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  try {
    // await sendEmail({
    //   email: user.email,
    //   subject: 'Your password reset token . Valid for only 10 minutes',
    //   text: message,
    // });
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpire = undefined;
    await user.save({ validateModifiedOnly: true });
    next(
      new AppError(
        //'There was an error sending the email. Please try again!'
        err,
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //Get the user based on the token
  const hasedToken = crypto //here we are encrypting it again and then find the user with same encryption in the database
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hasedToken,
    passwordResetTokenExpire: { $gt: Date.now() },
  });
  //If token has not expired , and there is user ,set the new password
  if (!user) {
    return next(
      new AppError('Reset Token is invalid or expired. Please try again', 400)
    );
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpire = undefined;
  await user.save();

  //Update the changePasswordAt property for the user // it is done as a trigger or pre save middleware

  //Log the user in
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // Get user from collection
  const user = await User.findById(req.user.id).select('+password'); //as the password is select false in schema to add it to we need +password

  //Check if the posted password is valid

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Invalid password', 401));
  }

  //If so then update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.validate();
  // User.findByIdandUpdate is not used because passwordConfirm validation pre middleware are only executed with save or create
  await user.save();
  //Log in the user
  createSendToken(user, 200, res);
});
