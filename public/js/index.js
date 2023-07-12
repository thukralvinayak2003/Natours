/* eslint-disable */

import '@babel/polyfill';
import { displayMap } from './leaflet';
import { login, logout } from './login';
import { updateSettings } from './updateSettings';
import { bookTour } from './stripe';
import { signup } from './signup';
//DOM elements

const leaflet = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const logOutbtn = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const signupForm = document.querySelector('.form--signup');
const bookBtn = document.getElementById('book-tour');

if (leaflet) {
  const locations = JSON.parse(leaflet.dataset.locations);
  displayMap(locations);
}

if (loginForm) {
  document.querySelector('.form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });
}

if (logOutbtn) {
  logOutbtn.addEventListener('click', logout);
}

if (userDataForm) {
  userDataForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = new FormData();

    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);

    console.log(form);
    updateSettings(form, 'data'); //updateSettings will read form as an object
  });
}

const userPhotoCurrent = document.querySelector('.form__user-photo'); // photo near the upload link
const userPhotoIconCurrent = document.querySelector('.nav__user-img'); //icon photo @ the right top corner

if (userDataForm) {
  userDataForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const form = new FormData();

    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);

    await updateSettings(form, 'data');

    const userUploadedFile = form.get('photo');

    if (userUploadedFile.type === 'image/jpeg') {
      userPhotoCurrent.setAttribute(
        'src',
        `img/users/${userUploadedFile.name}`
      );
      userPhotoIconCurrent.setAttribute(
        'src',
        `img/users/${userUploadedFile.name}`
      );
      console.log('👛', userUploadedFile, 'You have changed your picture');
    }
  });
}
if (bookBtn) {
  bookBtn.addEventListener('click', (e) => {
    e.target.textContent = 'Processing...'; // It changes the text content in the #book-tour
    const { tourId } = e.target.dataset; //we are select the tourId from tour template
    bookTour(tourId);
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('password-confirm').value;
    signup(name, email, password, confirmPassword);
  });
}
