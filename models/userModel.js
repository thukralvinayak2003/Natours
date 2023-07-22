const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter your name'],
  },
  email: {
    type: String,
    required: [true, 'Please enter your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please enter a valid email'],
  },
  photo: { type: String, default: 'default.jpg' }, //path in the file system where the photo is uploaded
  password: {
    type: String,
    required: [true, 'Please enter your password'],
    minLength: 8,
    select: false,
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'lead-guide', 'guide'],
    default: 'user',
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      validator: function (el) {
        return el === this.password; // abc === abc then true else false + This only works for SAVE or CREATE
      },
      message: 'Passwords are not same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetTokenExpire: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre('save', async function (next) {
  //ONly run this function if the password field is modified
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12); // 12 here means how much cpu intensive the encryption should be more the number better the encryption and more cpu intensive it is means more time to encrypt
  this.passwordConfirm = undefined; // to remove the confirm password from the database
});

//INSTANCE METHOD : it is a function that is available to all the documents of the certain collection
userSchema.methods.correctPassword = async function (
  candiatePassword,
  userPassword
) {
  //we are adding user password as we cant access the password field as select : false
  return await bcrypt.compare(candiatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimeStamp < changedTimeStamp; // returns true if password was changed after token was issued
  }

  //Not Changed
  return false;
};

//Query Middleware => Here /^ means every expression that starts with find should use this middleware
userSchema.pre(/^find/, function (next) {
  // 'this' points to the current query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex'); // create a string of 32 bytes in a hexadecimal format
  // we should never store reset token in the database similar to password
  // thats why we will encrypt it
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex'); // sha256 is name of the encryption algorithm update will encrypt the reset token and digest ('hex') will store it as a hexadecimal string
  this.passwordResetTokenExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken; // we will send email the encrypted reset token
};

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) next(); // new means this new document has been created

  this.passwordChangedAt = Date.now() - 1000;
  next(); // the process of saving is slower than the process of generating the reset token so we will decrease 1 sec to make it nearly accurate
});

const User = mongoose.model('User', userSchema);
module.exports = User;
