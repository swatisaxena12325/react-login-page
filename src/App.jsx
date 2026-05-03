import { useState, useEffect, useRef } from "react";
import "./App.css";

const API = "http://localhost:5000/api";

async function apiCall(endpoint, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

function Background() {
  return (
    <div className="bg-root">
      <div className="orb orb1" />
      <div className="orb orb2" />
      <div className="orb orb3" />
      <div className="grid-overlay" />
      <div className="noise-overlay" />
    </div>
  );
}

function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-icon">{type === "error" ? "✕" : "✓"}</span>
      <span>{message}</span>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, placeholder, icon }) {
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const inputType =
    type === "password" ? (showPass ? "text" : "password") : type;

  return (
    <div
      className={`field-wrap ${focused ? "focused" : ""} ${value ? "has-value" : ""}`}
    >
      <label className="field-label">{label}</label>
      <div className="field-inner">
        {icon && <span className="field-icon">{icon}</span>}
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="field-input"
          autoComplete="off"
        />
        {type === "password" && (
          <button
            type="button"
            className="eye-btn"
            onClick={() => setShowPass((p) => !p)}
            tabIndex={-1}
          >
            {showPass ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, icon, options }) {
  return (
    <div className={`field-wrap ${value ? "has-value" : ""}`}>
      <label className="field-label">{label}</label>
      <div className="field-inner">
        {icon && <span className="field-icon">{icon}</span>}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="field-input field-select"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function PasswordStrength({ password }) {
  const checks = [
    { label: "8+ chars", pass: password.length >= 8 },
    { label: "Uppercase", pass: /[A-Z]/.test(password) },
    { label: "Number", pass: /\d/.test(password) },
    { label: "Symbol", pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const labels = ["", "Weak", "Fair", "Strong", "Excellent"];
  const colors = ["", "#ef4444", "#f97316", "#22c55e", "#7c6af7"];
  if (!password) return null;
  return (
    <div className="strength-wrap">
      <div className="strength-bars">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="strength-bar"
            style={{
              background: i <= score ? colors[score] : "#1a1a2e",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>
      <div className="strength-row">
        {checks.map((c) => (
          <span
            key={c.label}
            className={`strength-pill ${c.pass ? "pill-pass" : ""}`}
          >
            {c.label}
          </span>
        ))}
        <span className="strength-label" style={{ color: colors[score] }}>
          {labels[score]}
        </span>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, onGoRegister, showToast }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      showToast("Please fill in all fields", "error");
      return;
    }
    setLoading(true);
    try {
      const data = await apiCall("/login", { email, password });
      onLogin(data.token, data.user);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card slide-in">
      <div className="card-eyebrow">Welcome back</div>
      <h1 className="card-title">
        Sign <em>In</em>
      </h1>
      <p className="card-sub">Enter your credentials to access your account</p>
      <form onSubmit={handleSubmit} className="form">
        <Field
          label="Email Address"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          icon="@"
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Your password"
          icon="*"
        />
        <button
          type="submit"
          className={`btn-primary ${loading ? "btn-loading" : ""}`}
          disabled={loading}
        >
          {loading ? (
            <span className="spinner" />
          ) : (
            <>
              <span>Sign In</span>
              <span className="btn-arrow">→</span>
            </>
          )}
        </button>
      </form>
      <div className="card-divider">
        <span>Don't have an account?</span>
      </div>
      <button className="btn-ghost" onClick={onGoRegister}>
        Create account
      </button>
    </div>
  );
}

function RegisterScreen({ onOtpSent, onGoLogin, showToast }) {
  const [form, setForm] = useState({
    fullName: "",
    contact: "",
    email: "",
    gender: "",
    dob: "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.fullName || !form.contact || !form.email) {
      showToast("Name, contact & email are required", "error");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      showToast("Enter a valid email address", "error");
      return;
    }
    setLoading(true);
    try {
      const data = await apiCall("/register", form);
      if (data.previewUrl) {
        console.log(
          "%c📬 OTP Email Preview:",
          "color:#7c6af7;font-weight:bold;font-size:14px",
          data.previewUrl,
        );
      }
      showToast("OTP sent to your email!", "success");
      onOtpSent(form.email);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card slide-in">
      <div className="card-eyebrow">New account</div>
      <h1 className="card-title">
        Get <em>Started</em>
      </h1>
      <p className="card-sub">Create your account in seconds</p>
      <form onSubmit={handleSubmit} className="form">
        <Field
          label="Full Name"
          value={form.fullName}
          onChange={set("fullName")}
          placeholder="John Doe"
          icon="✦"
        />
        <Field
          label="Contact Number"
          value={form.contact}
          onChange={set("contact")}
          placeholder="+91 9876543210"
          icon="↗"
        />
        <Field
          label="Email Address"
          type="email"
          value={form.email}
          onChange={set("email")}
          placeholder="you@example.com"
          icon="@"
        />
        <div className="row-fields">
          <SelectField
            label="Gender"
            value={form.gender}
            onChange={set("gender")}
            icon="◈"
            options={[
              { value: "", label: "Prefer not to say" },
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
              { value: "other", label: "Other" },
            ]}
          />
          <Field
            label="Date of Birth"
            type="date"
            value={form.dob}
            onChange={set("dob")}
            icon="◷"
          />
        </div>
        <button
          type="submit"
          className={`btn-primary ${loading ? "btn-loading" : ""}`}
          disabled={loading}
        >
          {loading ? (
            <span className="spinner" />
          ) : (
            <>
              <span>Send Verification OTP</span>
              <span className="btn-arrow">→</span>
            </>
          )}
        </button>
      </form>
      <div className="card-divider">
        <span>Already have an account?</span>
      </div>
      <button className="btn-ghost" onClick={onGoLogin}>
        Sign in
      </button>
    </div>
  );
}

function OtpScreen({ email, onVerified, showToast }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const refs = useRef([]);
  // Always-fresh ref so handleVerify never reads stale closure state
  const otpRef = useRef(["", "", "", "", "", ""]);

  // Single countdown — interval, not double-effect
  useEffect(() => {
    refs.current[0]?.focus();
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  function handleChange(i, val) {
    if (!/^\d*$/.test(val)) return;
    const next = [...otpRef.current];
    next[i] = val.slice(-1);
    otpRef.current = next;
    setOtp([...next]);
    if (val && i < 5) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace" && !otpRef.current[i] && i > 0)
      refs.current[i - 1]?.focus();
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      const digits = text.split("");
      otpRef.current = digits;
      setOtp([...digits]);
      refs.current[5]?.focus();
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    // Read from ref — guaranteed fresh regardless of React batching
    const code = otpRef.current.join("");
    if (code.length < 6) {
      showToast("Enter the complete 6-digit OTP", "error");
      return;
    }
    setLoading(true);
    try {
      const data = await apiCall("/verify-otp", { email, otp: code });
      if (data.previewUrl) {
        console.log(
          "%c📬 Credentials Email Preview:",
          "color:#7c6af7;font-weight:bold;font-size:14px",
          data.previewUrl,
        );
      }
      showToast("Email verified! Check your inbox for credentials.", "success");
      setTimeout(onVerified, 1200);
    } catch (err) {
      showToast(err.message, "error");
      const blank = ["", "", "", "", "", ""];
      otpRef.current = blank;
      setOtp([...blank]);
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      const data = await apiCall("/resend-otp", { email });
      if (data.previewUrl)
        console.log(
          "%c📬 Resend OTP Preview:",
          "color:#7c6af7;font-weight:bold",
          data.previewUrl,
        );
      showToast("New OTP sent!", "success");
      const blank = ["", "", "", "", "", ""];
      otpRef.current = blank;
      setOtp([...blank]);
      setCooldown(60);
      refs.current[0]?.focus();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  return (
    <div className="card slide-in">
      <div className="card-eyebrow">Verification</div>
      <h1 className="card-title">
        Check Your <em>Email</em>
      </h1>
      <p className="card-sub">
        We sent a 6-digit code to
        <br />
        <strong className="email-chip">{email}</strong>
      </p>
      <form onSubmit={handleVerify} className="form">
        <div className="otp-row" onPaste={handlePaste}>
          {otp.map((d, i) => (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`otp-box ${d ? "otp-filled" : ""}`}
            />
          ))}
        </div>
        <button
          type="submit"
          className={`btn-primary ${loading ? "btn-loading" : ""}`}
          disabled={loading}
        >
          {loading ? (
            <span className="spinner" />
          ) : (
            <>
              <span>Verify Email</span>
              <span className="btn-arrow">→</span>
            </>
          )}
        </button>
      </form>
      <div className="resend-row">
        {cooldown > 0 ? (
          <p className="resend-timer">
            Resend code in <em>{cooldown}s</em>
          </p>
        ) : (
          <button className="btn-ghost" onClick={handleResend}>
            Resend OTP
          </button>
        )}
      </div>
      <div className="demo-badge">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        Demo mode — check browser console for email preview links
      </div>
    </div>
  );
}

function ChangePasswordScreen({ token, user, onDone, showToast }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleChange(e) {
    e.preventDefault();
    if (next !== confirm) {
      showToast("Passwords do not match", "error");
      return;
    }
    if (next.length < 8) {
      showToast("Minimum 8 characters required", "error");
      return;
    }
    setLoading(true);
    try {
      const data = await apiCall(
        "/change-password",
        { currentPassword: current, newPassword: next },
        token,
      );
      showToast("Password updated!", "success");
      onDone(data.token);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleKeep() {
    setLoading(true);
    try {
      const data = await apiCall("/keep-password", {}, token);
      showToast("Keeping current password.", "success");
      onDone(data.token);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card slide-in">
      <div className="card-eyebrow">Security Setup</div>
      <h1 className="card-title">
        Set Your <em>Password</em>
      </h1>
      <p className="card-sub">
        Welcome, <strong>{user.fullName}</strong>! You're currently using an
        auto-generated password. Set a personal one below.
      </p>
      <form onSubmit={handleChange} className="form">
        <Field
          label="Current Password"
          type="password"
          value={current}
          onChange={setCurrent}
          placeholder="Paste auto-generated password"
          icon="*"
        />
        <Field
          label="New Password"
          type="password"
          value={next}
          onChange={setNext}
          placeholder="Create strong password"
          icon="*"
        />
        <PasswordStrength password={next} />
        <Field
          label="Confirm Password"
          type="password"
          value={confirm}
          onChange={setConfirm}
          placeholder="Repeat new password"
          icon="*"
        />
        <button
          type="submit"
          className={`btn-primary ${loading ? "btn-loading" : ""}`}
          disabled={loading}
        >
          {loading ? (
            <span className="spinner" />
          ) : (
            <>
              <span>Update Password</span>
              <span className="btn-arrow">→</span>
            </>
          )}
        </button>
      </form>
      <div className="card-divider">
        <span>or</span>
      </div>
      <button className="btn-ghost" onClick={handleKeep} disabled={loading}>
        Continue with auto-generated password
      </button>
    </div>
  );
}

function DashboardScreen({ user, onLogout }) {
  const initials =
    user.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  return (
    <div className="card slide-in">
      <div className="avatar-zone">
        <div className="avatar-outer">
          <div className="avatar-inner">{initials}</div>
        </div>
      </div>
      <div className="card-eyebrow">Authenticated ✓</div>
      <h1 className="card-title">
        Hello, <em>{user.fullName?.split(" ")[0]}</em>
      </h1>
      <p className="card-sub">You're signed in to your account</p>
      <div className="info-grid">
        <div className="info-cell">
          <span className="info-key">Email</span>
          <span className="info-val">{user.email}</span>
        </div>
        <div className="info-cell">
          <span className="info-key">Contact</span>
          <span className="info-val">{user.contact || "—"}</span>
        </div>
        <div className="info-cell">
          <span className="info-key">Status</span>
          <span className="info-val active-badge">✦ Active</span>
        </div>
        <div className="info-cell">
          <span className="info-key">Session</span>
          <span className="info-val">JWT Secured</span>
        </div>
      </div>
      <button className="btn-primary" onClick={onLogout}>
        <span>Sign Out</span>
        <span className="btn-arrow">→</span>
      </button>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState(() => {
    try {
      const savedToken = localStorage.getItem("rlp_token");
      const savedUser = JSON.parse(localStorage.getItem("rlp_user"));
      return savedToken && savedUser
        ? savedUser.mustChangePassword
          ? "changePass"
          : "dashboard"
        : "login";
    } catch {
      return "login";
    }
  });
  const [pendingEmail, setPendingEmail] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem("rlp_token"));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("rlp_user"));
    } catch {
      return null;
    }
  });
  const [toast, setToast] = useState(null);
  const toastKey = useRef(0);

  function showToast(msg, type = "success") {
    toastKey.current++;
    setToast({ msg, type, key: toastKey.current });
  }

  function handleLogin(tok, usr) {
    setToken(tok);
    setUser(usr);
    localStorage.setItem("rlp_token", tok);
    localStorage.setItem("rlp_user", JSON.stringify(usr));
    setScreen(usr.mustChangePassword ? "changePass" : "dashboard");
  }

  function handlePasswordDone(newToken) {
    const updated = { ...user, mustChangePassword: false };
    setToken(newToken);
    setUser(updated);
    localStorage.setItem("rlp_token", newToken);
    localStorage.setItem("rlp_user", JSON.stringify(updated));
    setScreen("dashboard");
  }

  function handleLogout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem("rlp_token");
    localStorage.removeItem("rlp_user");
    setScreen("login");
  }

  const views = {
    login: (
      <LoginScreen
        onLogin={handleLogin}
        onGoRegister={() => setScreen("register")}
        showToast={showToast}
      />
    ),
    register: (
      <RegisterScreen
        onOtpSent={(e) => {
          setPendingEmail(e);
          setScreen("otp");
        }}
        onGoLogin={() => setScreen("login")}
        showToast={showToast}
      />
    ),
    otp: (
      <OtpScreen
        email={pendingEmail}
        onVerified={() => setScreen("login")}
        showToast={showToast}
      />
    ),
    changePass: (
      <ChangePasswordScreen
        token={token}
        user={user || {}}
        onDone={handlePasswordDone}
        showToast={showToast}
      />
    ),
    dashboard: <DashboardScreen user={user || {}} onLogout={handleLogout} />,
  };

  return (
    <div className="app">
      <Background />
      <div className="stage">
        <div className="wordmark">
          React<span className="wm-dot">·</span>Auth
        </div>
        {views[screen]}
      </div>
      {toast && (
        <Toast
          key={toast.key}
          message={toast.msg}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}
