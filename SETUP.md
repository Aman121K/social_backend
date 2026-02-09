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

5. **Configure Cloudflare R2 (optional – for post & profile images)**
   - See **[CLOUDFLARE_R2.md](./CLOUDFLARE_R2.md)** for creating a bucket and getting API keys.
   - Add `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, and `R2_PUBLIC_URL` to `.env`.
   - Without R2, the app still runs; image upload will return 503 until R2 is set.

6. **Run the Server**
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

## EC2 / Production (MongoDB with auth)

If MongoDB has authentication enabled (e.g. you created a user with `db.createUser`):

1. In `.env` on the server set:
   ```env
   MONGODB_URI=mongodb://social_user:YOUR_PASSWORD@127.0.0.1:27017/social_db?authSource=social_db
   ```
   Replace `YOUR_PASSWORD` with the actual password. If the password contains `@`, `#`, or `%`, encode them (e.g. `@` → `%40`).

2. Restart the app after changing `.env`:
   ```bash
   pm2 restart all
   ```

3. If you see `Server selection timed out` or `12345:27017`: the app is using a wrong or unset `MONGODB_URI`. Ensure `.env` exists in the backend folder and contains the correct `MONGODB_URI` (see above). The default in code is `mongodb://127.0.0.1:27017/social_db` (no auth); if your MongoDB requires auth, you must set `MONGODB_URI` in `.env`.

## Common Issues

1. **MongoDB Connection Error** / **Server selection timed out** / **12345:27017**
   - Make sure MongoDB is running: `sudo systemctl status mongod`
   - If using auth, set `MONGODB_URI` in `.env` with the correct user, password, and `authSource=social_db`
   - Do not use a connection string where the password contains `@` unless it is percent-encoded (`%40`)
   - Restart app after editing `.env`: `pm2 restart all`

2. **Email Not Sending**
   - Verify email credentials
   - For Gmail, use App Password (not regular password)
   - Check firewall/network settings

3. **Port Already in Use**
   - Change PORT in `.env` to a different port
   - Or kill the process using port 5000

