# React Login Page

A full-stack login and registration demo with email OTP verification, JWT authentication, and a polished dark glassmorphism UI.

## Features

- **Register** — Full Name, Contact, Email, Gender, DOB
- **OTP Verification** — 6-digit OTP sent via email with 10-minute expiry and resend support
- **Auto-generated Password** — emailed after account verification
- **Login** — JWT-based authentication for protected routes
- **Change Password** — first-login prompt to set a personal password
- **Dashboard** — secure view of authenticated user details
- **Animated UI** — dark glassmorphism styling with smooth transitions

---

## Project Structure

```bash
react-login-page/
├── frontend/          # React app (Create React App)
│   └── src/
│       ├── App.js     # All screens & logic
│       └── App.css    # Full design system
└── backend/           # Node.js + Express
    ├── server.js      # All API routes
    └── .env.example   # Environment variables
```

---

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env          # edit JWT_SECRET if desired
npm install
node server.js
```

Backend runs on <http://localhost:5000>

> **Email**: Uses SMTP(primary service) and [Ethereal](https://ethereal.email) — a fake SMTP service(as a fallback).
> After starting the server, OTP and credentials emails are sent on the registered email address.

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs on <http://localhost:3000>

---

## Auth Flow

```bash
Register → OTP Verify → [Credentials sent to email] → Login → Change Password (optional) → Dashboard
```

1. User fills registration form → OTP sent to email
2. User enters OTP → account created, auto-password emailed
3. User logs in with email + auto-password
4. Prompted to change password (or keep auto-generated)
5. Access dashboard

---

## API Endpoints

| Method | Endpoint               | Auth   | Description                 |
| ------ | ---------------------- | ------ | --------------------------- |
| POST   | `/api/register`        | —      | Register + send OTP         |
| POST   | `/api/verify-otp`      | —      | Verify OTP + create account |
| POST   | `/api/resend-otp`      | —      | Resend OTP                  |
| POST   | `/api/login`           | —      | Login → returns JWT         |
| POST   | `/api/change-password` | Bearer | Change password             |
| POST   | `/api/keep-password`   | Bearer | Skip password change        |
| GET    | `/api/me`              | Bearer | Get current user info       |

---

## Environment Variables (Backend)

```env
JWT_SECRET=your_secret_here
PORT=5000
```

For real email delivery, configure SMTP in `server.js` (replace the Ethereal transporter).

---

## Production Notes

- Replace in-memory store (`users`, `otpStore`) with a real DB (PostgreSQL/MongoDB)
- Use a real SMTP provider (SendGrid, AWS SES, Resend)
- Add rate limiting (express-rate-limit)
- Add HTTPS
- Rotate JWT_SECRET and never commit it
