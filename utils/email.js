// eslint-disable-next-line import/no-extraneous-dependencies
const htmlToText = require('html-to-text');
const Transport = require('nodemailer-brevo-transport');
const nodemailer = require('nodemailer');
const pug = require('pug');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Vinayak Thukral ${process.env.EMAIL_FROM}`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      //Send GRID
      return nodemailer.createTransport(
        new Transport({ apiKey: `${process.env.API_KEY}` })
      );
    }
    return nodemailer.createTransport(
      new Transport({ apiKey: `${process.env.API_KEY}` })
    );
  }

  //Send the actual email
  async send(template, subject) {
    //1 Render the HTML for the email on a pug template
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        url: this.url,
        subject,
      }
    ); //it will render the pug code into HTML

    //2 Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.htmlToText(html),
    };

    //3 Create a transport and send the email
    await this.newTransport().sendMail(mailOptions);
  }

  //  sending the mail
  async sendWelcome() {
    await this.send('welcome', 'Welcome to the natours family');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)'
    );
  }
};

// Create a Transporter
//   const transporter = nodemailer.createTransporter({
//     service: 'Gmail', // Gmail IS PREDEFNED
//     auth: {
//       user: process.env.EMAIL_USERNAME,
//       pass: process.env.EMAIL_PASSWORD,
//     },
//     //enable less secure app
//   });
// Define the email options
//Actually send the email
