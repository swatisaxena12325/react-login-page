require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// In-memory store  (swap for a real DB in production)
// ---------------------------------------------------------------------------
const users = {}; // email  ->  { fullName, contact, email, passwordHash, verified, mustChangePassword, createdAt }
const otpStore = {}; // email  ->  { otp, expiresAt, userData }

const JWT_SECRET = process.env.JWT_SECRET || "demo_secret_key_change_in_prod";
const FROM_NAME = process.env.SMTP_FROM_NAME || "React Auth";
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || "noreply@reactlogin.dev";
const FROM_ADDR = `"${FROM_NAME}" <${FROM_EMAIL}>`;

// ---------------------------------------------------------------------------
// SMTP transport
// ---------------------------------------------------------------------------
// Priority:
//   1. Real SMTP  -- when SMTP_HOST + SMTP_USER + SMTP_PASS are set in .env
//   2. Ethereal   -- automatic fallback for local development / demo
// ---------------------------------------------------------------------------
let transport = null;
let etherealMode = false;

async function initTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } =
    process.env;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    const port = parseInt(SMTP_PORT || "587", 10);
    const secure = SMTP_SECURE === "true" || port === 465;

    transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    // Hard-fail at startup so misconfiguration is caught immediately.
    await transport.verify();
    etherealMode = false;

    console.log("\n[SMTP] Connected to real SMTP server");
    console.log(`       Host   : ${SMTP_HOST}:${port}  secure=${secure}`);
    console.log(`       User   : ${SMTP_USER}`);
    console.log(`       Sender : ${FROM_ADDR}\n`);
  } else {
    // Ethereal fallback -- or console fallback if Ethereal is unreachable
    try {
      const fake = await nodemailer.createTestAccount();
      transport = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user: fake.user, pass: fake.pass },
      });
      etherealMode = true;
      console.log(
        "\n[SMTP] WARNING: No SMTP credentials set. Using Ethereal demo SMTP.",
      );
      console.log("       Emails are NOT delivered to real inboxes.");
      console.log("       Ethereal user :", fake.user);
      console.log("       Ethereal pass :", fake.pass);
      console.log("       View sent mail : https://ethereal.email\n");
    } catch (_etherealErr) {
      // Ethereal unreachable (e.g. sandboxed network). Fall back to console output.
      console.log(
        "\n[SMTP] WARNING: No SMTP credentials set and Ethereal is unreachable.",
      );
      console.log(
        "       CONSOLE MODE -- every email payload will be printed to stdout.",
      );
      console.log(
        "       Set SMTP_HOST / SMTP_USER / SMTP_PASS in .env for real delivery.\n",
      );
      etherealMode = true;
      transport = {
        sendMail: async (opts) => {
          const text = (opts.html || "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s{2,}/g, " ")
            .trim();
          console.log("\n---------- EMAIL (console mode) ----------");
          console.log("  To      :", opts.to);
          console.log("  Subject :", opts.subject);
          console.log("  Body    :", text.slice(0, 500));
          console.log("------------------------------------------\n");
          return { messageId: "console-" + Date.now() };
        },
      };
    }
  }
}

// Returns a preview URL only when running in Ethereal mode (never in production).
function previewUrl(info) {
  return etherealMode ? nodemailer.getTestMessageUrl(info) || null : null;
}

// ---------------------------------------------------------------------------
// Email helpers
// ---------------------------------------------------------------------------
async function sendOtpEmail(to, fullName, otp) {
  const info = await transport.sendMail({
    from: FROM_ADDR,
    to,
    subject: "Your OTP for Email Verification",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;
                  background:#0a0a0a;color:#f0f0f0;border-radius:12px;">
        <h2 style="color:#7c6af7;margin-bottom:8px;">Verify Your Email</h2>
        <p style="color:#aaa;">Hi ${fullName}, use the OTP below to verify your email address.</p>
        <div style="font-size:40px;font-weight:700;letter-spacing:14px;
                    text-align:center;padding:28px 0;color:#fff;">
          ${otp}
        </div>
        <p style="color:#666;font-size:12px;">
          This OTP expires in 10 minutes. Do not share it with anyone.
        </p>
      </div>`,
  });
  return previewUrl(info);
}

async function sendCredentialsEmail(to, fullName, password) {
  const info = await transport.sendMail({
    from: FROM_ADDR,
    to,
    subject: "Your Account Credentials",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;
                  background:#0a0a0a;color:#f0f0f0;border-radius:12px;">
        <h2 style="color:#7c6af7;">Welcome, ${fullName}!</h2>
        <p style="color:#aaa;">Your account has been verified. Here are your login credentials:</p>
        <div style="background:#111;border:1px solid #222;border-radius:8px;
                    padding:16px;margin:16px 0;">
          <p style="margin:4px 0;">
            <span style="color:#666;">Email :</span>
            <strong style="color:#fff;">${to}</strong>
          </p>
          <p style="margin:4px 0;">
            <span style="color:#666;">Password :</span>
            <strong style="color:#7c6af7;">${password}</strong>
          </p>
        </div>
        <p style="color:#f59e0b;font-size:13px;">
          Please change your password after your first login.
        </p>
      </div>`,
  });
  return previewUrl(info);
}

async function sendResendOtpEmail(to, otp) {
  const info = await transport.sendMail({
    from: FROM_ADDR,
    to,
    subject: "Your New Verification OTP",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;
                  background:#0a0a0a;color:#f0f0f0;border-radius:12px;">
        <h2 style="color:#7c6af7;">New OTP</h2>
        <div style="font-size:40px;font-weight:700;letter-spacing:14px;
                    text-align:center;padding:28px 0;color:#fff;">
          ${otp}
        </div>
        <p style="color:#666;font-size:12px;">Expires in 10 minutes.</p>
      </div>`,
  });
  return previewUrl(info);
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
  let p = "";
  for (let i = 0; i < 12; i++)
    p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token provided." });
  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// POST /api/register
app.post("/api/register", async (req, res) => {
  const { fullName, contact, email, gender, dob } = req.body;

  if (!fullName || !contact || !email) {
    return res
      .status(400)
      .json({ error: "Full name, contact and email are required." });
  }
  if (users[email]?.verified) {
    return res
      .status(409)
      .json({ error: "Email already registered. Please login." });
  }

  const otp = generateOTP();
  otpStore[email] = {
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000,
    userData: {
      fullName,
      contact,
      email,
      gender: gender || "",
      dob: dob || "",
    },
  };

  try {
    const url = await sendOtpEmail(email, fullName, otp);
    console.log(`[OTP] Sent to ${email}${url ? "  preview: " + url : ""}`);
    const response = { message: "OTP sent to your email." };
    if (url) response.previewUrl = url; // only included in Ethereal mode
    return res.json(response);
  } catch (err) {
    console.error("[SMTP] sendOtpEmail failed:", err.message);
    return res
      .status(500)
      .json({ error: "Failed to send OTP email. Check SMTP configuration." });
  }
});

// POST /api/verify-otp
app.post("/api/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  const record = otpStore[email];
  if (!record) {
    return res
      .status(400)
      .json({ error: "No pending registration for this email." });
  }
  if (Date.now() > record.expiresAt) {
    delete otpStore[email];
    return res
      .status(400)
      .json({ error: "OTP expired. Please register again." });
  }
  if (record.otp !== otp) {
    return res.status(400).json({ error: "Invalid OTP." });
  }

  // Create the account
  const rawPassword = generatePassword();
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  users[email] = {
    ...record.userData,
    passwordHash,
    verified: true,
    mustChangePassword: true,
    createdAt: new Date().toISOString(),
  };
  delete otpStore[email];

  try {
    const url = await sendCredentialsEmail(
      email,
      record.userData.fullName,
      rawPassword,
    );
    console.log(`[CREDS] Sent to ${email}${url ? "  preview: " + url : ""}`);
    const response = {
      message: "Email verified. Credentials sent to your email.",
    };
    if (url) response.previewUrl = url;
    return res.json(response);
  } catch (err) {
    console.error("[SMTP] sendCredentialsEmail failed:", err.message);
    // Account is already created -- don't block the user, just warn.
    return res
      .status(500)
      .json({ error: "Account created but failed to send credentials email." });
  }
});

// POST /api/resend-otp
app.post("/api/resend-otp", async (req, res) => {
  const { email } = req.body;
  const record = otpStore[email];
  if (!record) {
    return res
      .status(400)
      .json({ error: "No pending registration found for this email." });
  }

  const otp = generateOTP();
  record.otp = otp;
  record.expiresAt = Date.now() + 10 * 60 * 1000;

  try {
    const url = await sendResendOtpEmail(email, otp);
    console.log(`[OTP] Resent to ${email}${url ? "  preview: " + url : ""}`);
    const response = { message: "New OTP sent." };
    if (url) response.previewUrl = url;
    return res.json(response);
  } catch (err) {
    console.error("[SMTP] sendResendOtpEmail failed:", err.message);
    return res.status(500).json({ error: "Failed to resend OTP." });
  }
});

// POST /api/login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users[email];

  if (!user || !user.verified) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match)
    return res.status(401).json({ error: "Invalid email or password." });

  const token = jwt.sign(
    {
      email,
      fullName: user.fullName,
      mustChangePassword: user.mustChangePassword,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );

  return res.json({
    token,
    user: {
      fullName: user.fullName,
      email: user.email,
      contact: user.contact,
      mustChangePassword: user.mustChangePassword,
    },
  });
});

// POST /api/change-password  (auth required)
app.post("/api/change-password", authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = users[req.user.email];

  if (!user) return res.status(404).json({ error: "User not found." });

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match)
    return res.status(400).json({ error: "Current password is incorrect." });

  if (!newPassword || newPassword.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters." });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.mustChangePassword = false;

  const token = jwt.sign(
    {
      email: req.user.email,
      fullName: user.fullName,
      mustChangePassword: false,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );

  return res.json({ message: "Password changed successfully.", token });
});

// POST /api/keep-password  (auth required)
app.post("/api/keep-password", authMiddleware, async (req, res) => {
  const user = users[req.user.email];
  if (!user) return res.status(404).json({ error: "User not found." });

  user.mustChangePassword = false;

  const token = jwt.sign(
    {
      email: req.user.email,
      fullName: user.fullName,
      mustChangePassword: false,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );

  return res.json({ message: "Password kept as-is.", token });
});

// GET /api/me  (auth required)
app.get("/api/me", authMiddleware, (req, res) => {
  const user = users[req.user.email];
  if (!user) return res.status(404).json({ error: "User not found." });
  return res.json({
    fullName: user.fullName,
    email: user.email,
    contact: user.contact,
    createdAt: user.createdAt,
  });
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 5000;

initTransport()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[SERVER] Listening on http://localhost:${PORT}`);
      console.log("[SERVER] In-memory store -- data resets on restart\n");
    });
  })
  .catch((err) => {
    console.error("[FATAL] Could not initialise SMTP transport:", err.message);
    console.error("        Fix your SMTP credentials in .env and restart.");
    process.exit(1);
  });
