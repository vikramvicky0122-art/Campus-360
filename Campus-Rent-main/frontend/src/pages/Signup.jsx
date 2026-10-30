import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";

function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (event) => {
    event.preventDefault();
    setError("");
    if (!name || !email || !password) {
      setError("All fields are required.");
      return;
    }
    
    if (!email.toLowerCase().endsWith("nitrr.ac.in")) {
      setError("You must use a valid nitrr.ac.in campus email address.");
      return;
    }

    const pwdRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!pwdRegex.test(password)) {
      setError("Password must be at least 8 characters and include a number and a special character.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.signup({
        fullName: name.trim(),
        collegeEmail: email.trim().toLowerCase(),
        password
      });
      login(response.data);
      navigate("/marketplace");
    } catch (err) {
      setError(err.message || "Unable to create account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-tabs" role="tablist" aria-label="Authentication">
        <Link to="/login" className="auth-tab" role="tab">
          Login
        </Link>
        <Link to="/signup" className="auth-tab active" role="tab">
          Sign Up
        </Link>
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <h1>Join Campus 360</h1>
          <p>Create your student account to unlock the marketplace.</p>
        </div>

        {error && (
          <div className="auth-error" style={{ color: '#ef4444', background: '#fee2e2', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', border: '1px solid #f87171' }}>
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSignup}>
          <label className="auth-label" htmlFor="signup-name">
            Full Name
          </label>
          <div className="auth-field">
            <input
              id="signup-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Johnson"
              required
            />
          </div>

          <label className="auth-label" htmlFor="signup-email">
            Student Email
          </label>
          <div className="auth-field">
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@nitrr.ac.in"
              required
            />
          </div>

          <label className="auth-label" htmlFor="signup-password">
            Password
          </label>
          <div className="auth-field auth-password">
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
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
            {isSubmitting ? "Creating..." : "Create Account"}
          </button>
          <p className="auth-terms">
            By creating an account, you agree to our Terms of Service and Privacy
            Policy.
          </p>
        </form>

      </div>

      <div className="auth-features">
        <div className="auth-feature">
          <div className="auth-feature-icon">V</div>
          <div>
            <strong>Verified</strong>
            <span>Campus email required</span>
          </div>
        </div>
        <div className="auth-feature">
          <div className="auth-feature-icon">S</div>
          <div>
            <strong>Secure</strong>
            <span>Protected student profiles</span>
          </div>
        </div>
        <div className="auth-feature">
          <div className="auth-feature-icon">G</div>
          <div>
            <strong>Guided</strong>
            <span>Onboarding tips included</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Signup;
