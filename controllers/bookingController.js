// eslint-disable-next-line import/no-extraneous-dependencies
const Stripe = require('stripe');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
// const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const Booking = require('../models/bookingModel');
const User = require('../models/userModel');

// exports.getCheckoutSession = catchAsync(async (req, res, next) => {
//   const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
//   //GET the currently booked tour
//   const tour = await Tour.findById(req.params.tourId);

//   //Create checkout
//   const product = await stripe.products.create({
//     name: `${tour.name} Tour`,
//     description: tour.summary,
//     images: [
//       `${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`,
//     ],
//   });

//   const price = await stripe.prices.create({
//     product: product.id,
//     unit_amount: tour.price * 1000,
//     currency: 'inr',
//   });

//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ['card'],
//     // success_url: `${req.protocol}://${req.get('host')}/?tour=${
//     //   req.params.tourId
//     // }&user=${req.user.id}&price=${tour.price}`,
//     success_url: `${req.protocol}://${req.get('host')}/my-tours`,

//     cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
//     customer_email: req.user.email,
//     client_reference_id: req.params.tourId,
//     mode: 'payment',
//     line_items: [
//       {
//         price: price.id,
//         quantity: 1,
//       },
//     ],
//   });

//   //Create session as response
//   res.status(200).json({
//     status: 'success',
//     session,
//   });
// });

// exports.createBookingCheckout = async (req, res, next) => {
//   //This is temporary
//   const { tour, user, price } = req.query; // query string in url

//   if (!tour && !user && !price) return next();
//   await Booking.create({ tour, user, price });

//   res.redirect(req.originalUrl.split('?')[0]);
// };

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  //GET the currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/my-tours`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'inr',
          unit_amount: tour.price * 1000,
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [
              `${req.protocol}://${req.get('host')}/img/tours/${
                tour.imageCover
              }`,
            ],
          },
        },
      },
    ],
  });
  //Create session as response
  res.status(200).json({
    status: 'success',
    session,
  });
});

const createBookingCheckout = async (session) => {
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id; //get the userId
  const price = session.amount_total / 1000;
  await Booking.create({ tour, user, price });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  //1)Find all Bookings
  const bookings = await Booking.find({ user: req.user.id });
  //2) Find tours with returned IDs
  const tourIDs = bookings.map((el) => el.tour); //this loops thorugh the entire bookings array and return the element tour
  const tours = await Tour.find({ _id: { $in: tourIDs } }); //it will select all the tours with have _id which is in the tours array

  res.status(200).render('overview', {
    title: 'My Tours',
    tours,
  });
});

exports.webhookCheckout = async (req, res, next) => {
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error ${err.message} and ${req.body}`);
  }

  if (event.type === 'checkout.session.completed')
    createBookingCheckout(event.data.object);

  res.status(200).json({ received: true });
};

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBooking = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
