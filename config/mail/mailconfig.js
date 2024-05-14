const nodemailer = require('nodemailer');
// Configure Nodemailer
const transporter = nodemailer.createTransport({
    host: 'threearrowstech.com',
    port: 465,
    secure: true,
    auth: {
      user: 'noreply@threearrowstech.com',
      pass: 'Ahsan@123',
    },
  });

  module.exports = transporter