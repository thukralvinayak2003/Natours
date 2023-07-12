const mongoose = require('mongoose');
const dotenv = require('dotenv');
const app = require('./app');

// We have to put this on starting as it is sychronous if we dont then it will caught the expect that are after its block
process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);

  // closes the server after the all request are handled
  process.exit(1); // 0 stands for success and 1 stands for uncaught exception and process.exit exits the program
});

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

//START SERVER
const port = process.env.PORT;
const server = app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

//when there is a unhandled rejection,the process object emits an object called unhandled rejection and we can subscribe to that event
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  server.close(() => {
    // closes the server after the all request are handled
    process.exit(1); // 0 stands for success and 1 stands for uncaught exception and process.exit exits the program
  });
});
