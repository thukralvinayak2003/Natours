/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alert';
import catchAsync from '../../utils/catchAsync';

export const bookTour = catchAsync(async (tourId) => {
  try {
    const stripe = stripe(
      'pk_test_51NSPNeSFIoG9GF9fkCSXUT5lVEIYl8LDxM840urB90FLABZWLp5hXRO3s2sZB9ZiFUSc1ODLsCx8X4up4WIWBewa00vBw9GANj'
    );
    //1 Get checkout session from API
    const session = await axios(`/api/v1/booking/checkout-session/${tourId}`);
    // Create a checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
});
