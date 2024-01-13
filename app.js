/* eslint-disable import/no-extraneous-dependencies */
const express = require('express');
const path = require('path'); // build in module to manipulate paths names
const morgan = require('morgan');

const app = express();

const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const hpp = require('hpp');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const AppError = require('./utils/appError');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController');

//SETUP PUG ENGINE

app.set('view engine', 'pug'); // here we are saying we are using pug as a template engine for express
//pug templates are called views in express // we are using model views controllers (mvc) architecture
app.set('views', path.join(__dirname, 'views')); // this will create a path with directory name and views

// app.use(express.static(`${__dirname}/public`)); //don't put public/overview as public taken a root default . It is used to run static files
app.use(express.static(path.join(__dirname, 'public'))); //its use to link folders in public to the pug that is pug can use the things in the public folder

// GLOBAL MIDDLEWARE

// Further HELMET configuration for Security Policy (CSP)

// Set Security HTTP Headers
const scriptSrcUrls = ['https://unpkg.com/', 'https://tile.openstreetmap.org'];
const styleSrcUrls = [
  'https://unpkg.com/',
  'https://tile.openstreetmap.org',
  'https://fonts.googleapis.com/',
];
const connectSrcUrls = ['https://unpkg.com', 'https://tile.openstreetmap.org'];
const fontSrcUrls = ['fonts.googleapis.com', 'fonts.gstatic.com'];

app.use(cors());

app.options('*', cors()); // when there is a patch , delete , put or any other request the browser will create options request first to check if the request is safe this is pre-flight phase here app.options is a http request and '*' is that for all routes run cors() that is all routes can do a cross-origin request

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'https:', 'http:', 'data:', 'ws:'],
      connectSrc: [
        "'self'",
        ...connectSrcUrls,
        'https://bundle.js:*',
        'ws://127.0.0.1:*/',
      ],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'http:', 'data:', ...fontSrcUrls],
      scriptSrc: ["'self'", 'https:', 'http:', 'blob:', ...scriptSrcUrls],
      imgSrc: ["'self'", 'blob:', 'data:', 'https:'],
      workerSrc: ["'self'", 'blob:'],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https:',
        'http:',
        ...styleSrcUrls,
      ],
    },
  })
);

if (process.env.NODE_ENV !== 'development') {
  app.use(morgan('dev')); // logging details
}

app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
); //the data in the body shouldn't in be json ,it should be string that's why we need to use it raw not in bookingRouter

app.use(express.json()); // MIDDLEWARE to use body-parser ,reading data from body to req.body
app.use(cookieParser()); //parses the data from the cookie

//How many request per IP should be allowed
const limiter = rateLimit({
  max: 100, //there  can be 100 requests
  windowMS: 6 * 60 * 1000, // per hour
  message: 'Too many requests from this IP . Please try again later',
});

app.use('/api', limiter); // apply the limiter on the api route

//Data sanitization NOSQL injection Location of the middleware matters this works after body parsing
app.use(mongoSanitize());

//Data sanitization against XSS
app.use(xss());

//Prevent Parameter Pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ], //this will not work for duration then (thats what we want)
  })
);

app.use(compression());
// app.use((req, res, next) => {
//   console.log(req.cookies);
//   next();
// });

//ROUTES

//METHOD 1
// app.get('/api/v1/tours', getAllTours);
// app.post('/api/v1/tours', createTour);
// app.get('/api/v1/tours/:id', getTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);

//METHOD 2: Code is smaller and easier to understand
//Render with pug
app.use('/', viewRouter);

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/booking', bookingRouter);

app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Cant find the ${req.originalUrl} on this server`, //url sent is ${req.originalUrl}
  // });

  // const err = new Error(`Cant find the ${req.originalUrl} on this server`); //url sent is ${req.originalUrl})
  // err.status = 'fail';
  // err.statusCode = 404;
  next(new AppError(`Cant find the ${req.originalUrl} on this server`));
}); //all the requests and * for everything

app.use(globalErrorHandler);

module.exports = app;
