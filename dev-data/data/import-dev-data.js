const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('../../models/tourModel');
const User = require('../../models/userModel');
const Review = require('../../models/reviewModel');

// enviroment variables are global variables in which the node app is running we use dotenv package to use env variables in node
// no space between env variables in config.env
dotenv.config({ path: './config.env' });
// there are 2 types of enviroment production and development default is development in express
//  console.log(process.env);

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
  })
  .then(() => {
    console.log('DB connection successfully done');
  });

//Reading the file

const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8')
);

//IMPORT DATA

const importData = async () => {
  try {
    await Tour.create(tours);
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);

    console.log('Data successfully created');
    process.exit();
  } catch (error) {
    console.log(error);
  }
};

//DELETE ALL DATA

const deleteAllData = async () => {
  try {
    await Tour.deleteMany(); // delete all of the documents
    await User.deleteMany(); // delete all of the documents
    await Review.deleteMany(); // delete all of the documents

    console.log('Data successfully deleted');
    process.exit();
  } catch (error) {
    console.log(error);
  }
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteAllData();
}
