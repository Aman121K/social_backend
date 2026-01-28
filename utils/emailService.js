const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: 'javascript.pgl@gmail.com',
    pass: 'msdf qhmj fhbv xlbm'
  },
});

const sendOTP = async (email, otp, type = 'Verification') => {
  try {
    const subject =
      type === 'Password Reset'
        ? 'Social - Password Reset OTP'
        : 'Social - OTP Verification';
    const message =
      type === 'Password Reset'
        ? 'Your OTP for password reset is:'
        : 'Your OTP for email verification is:';

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0095f6;">Social</h2>
          <p>${message}</p>
          <h1 style="color: #0095f6; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

module.exports = { sendOTP };

