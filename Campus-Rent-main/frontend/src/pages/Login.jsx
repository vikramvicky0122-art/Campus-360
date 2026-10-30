import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    if (!email.toLowerCase().endsWith("nitrr.ac.in")) {
      setError("Please login using your nitrr.ac.in campus email.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.login({
        collegeEmail: email.trim().toLowerCase(),
        password
      });
      login(response.data);
      navigate("/marketplace");
    } catch (err) {
      setError(err.message || "Unable to login. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-tabs" role="tablist" aria-label="Authentication">
        <Link to="/login" className="auth-tab active" role="tab">
          Login
        </Link>
        <Link to="/signup" className="auth-tab" role="tab">
          Sign Up
        </Link>
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <h1>Welcome back!</h1>
          <p>The campus marketplace is waiting for you.</p>
        </div>

        {error && (
          <div className="auth-error" style={{ color: '#ef4444', background: '#fee2e2', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', border: '1px solid #f87171' }}>
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleLogin}>
          <label className="auth-label" htmlFor="login-email">
            Student Email
          </label>
          <div className="auth-field">
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@university.edu"
              required
            />
          </div>

          <div className="auth-row">
            <label className="auth-label" htmlFor="login-password">
              Password
            </label>
            <span className="auth-link">Use your account password</span>
          </div>
          <div className="auth-field auth-password">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
            />
            <span 
              className="auth-eye" 
              aria-hidden="true"
              onClick={() => setShowPassword(!showPassword)}
              style={{ cursor: "pointer", userSelect: "none" }}
            >
              {showPassword ? "Hide" : "Show"}
            </span>
          </div>

          <button className="btn primary auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing In..." : "Enter the Hub"}
          </button>
        </form>
      </div>

      <div className="auth-features">
        <div className="auth-feature">
          <div className="auth-feature-icon">S</div>
          <div>
            <strong>Secure</strong>
            <span>Encrypted transactions</span>
          </div>
        </div>
        <div className="auth-feature">
          <div className="auth-feature-icon">C</div>
          <div>
            <strong>Community</strong>
            <span>Verified students only</span>
          </div>
        </div>
        <div className="auth-feature">
          <div className="auth-feature-icon">E</div>
          <div>
            <strong>Eco-friendly</strong>
            <span>Sharing reduces waste</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Login;
