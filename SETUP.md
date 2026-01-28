# Backend Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Set up Environment Variables**
   - Create a `.env` file in the `backend` folder
   - Copy the content from `.env.example` and fill in your values:
     ```env
     PORT=5000
     MONGODB_URI=mongodb://localhost:27017/instagram-clone
     JWT_SECRET=your_super_secret_jwt_key_change_this
     NODE_ENV=development
     
     # Email Configuration (for OTP)
     EMAIL_HOST=smtp.gmail.com
     EMAIL_PORT=587
     EMAIL_USER=your_email@gmail.com
     EMAIL_PASS=your_app_password
     ```

3. **Start MongoDB**
   - Install MongoDB locally, or
   - Use MongoDB Atlas (free cloud database)
   - Update `MONGODB_URI` in `.env` with your connection string

4. **Configure Email (for OTP)**
   - For Gmail: Generate an App Password
     - Go to Google Account → Security → 2-Step Verification → App Passwords
     - Create an app password and use it in `EMAIL_PASS`
   - Or use any SMTP service (SendGrid, Mailgun, etc.)

5. **Run the Server**
   ```bash
   # Development mode (auto-restart on changes)
   npm run dev
   
   # Production mode
   npm start
   ```

## API Base URL

- Local: `http://localhost:5000`
- For Android Emulator: `http://10.0.2.2:5000`
- For iOS Simulator: `http://localhost:5000`
- For Physical Device: `http://YOUR_COMPUTER_IP:5000`

## Testing the API

You can test the API using:
- Postman
- curl
- Thunder Client (VS Code extension)
- Or the mobile app

## Common Issues

1. **MongoDB Connection Error**
   - Make sure MongoDB is running
   - Check the connection string in `.env`

2. **Email Not Sending**
   - Verify email credentials
   - For Gmail, use App Password (not regular password)
   - Check firewall/network settings

3. **Port Already in Use**
   - Change PORT in `.env` to a different port
   - Or kill the process using port 5000

