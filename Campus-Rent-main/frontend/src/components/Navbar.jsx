import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

let timeout;

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
      <Link to="/" className="logo">
        <span className="logo-mark">C</span>
        Campus 360
      </Link>
      <nav className="nav-links">
        <NavLink to="/">Home</NavLink>
        {user && (
          <>
            <NavLink to="/marketplace">Marketplace</NavLink>
            <NavLink to="/add">Add Listing</NavLink>
            <NavLink to="/chat">Chat</NavLink>
          </>
        )}
      </nav>
      {user ? (
        <div className="nav-user">
          <button className="nav-icon-btn" title="Notifications">
            🔔
          </button>
          <div
            className="profile-wrapper"
            onMouseEnter={() => {
              clearTimeout(timeout);
              setIsOpen(true);
            }}
            onMouseLeave={() => {
              timeout = setTimeout(() => setIsOpen(false), 200);
            }}
          >
            <div className="profile-trigger">
              <button className="nav-profile-btn">
                <div className="nav-avatar mini">{(user.fullName || user.name || "U").slice(0, 2).toUpperCase()}</div>
                <span className="nav-username">{user.fullName || user.name || "Student"}</span>
              </button>
            </div>
            {isOpen && (
              <div className="dropdown-menu">
                {user.role === 'ADMIN' && (
                  <Link to="/admin" className="dropdown-item" onClick={() => setIsOpen(false)}>🛡️ Admin Console</Link>
                )}
                <Link to="/dashboard/profile" className="dropdown-item" onClick={() => setIsOpen(false)}>⚙️ Profile</Link>
                <Link to="/dashboard/rentals" className="dropdown-item" onClick={() => setIsOpen(false)}>📦 My Borrowings</Link>
                <Link to="/dashboard/listings" className="dropdown-item" onClick={() => setIsOpen(false)}>📋 My Listings</Link>
                <hr className="dropdown-divider" />
                <button onClick={handleLogout} className="dropdown-item text-danger">Logout</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="nav-actions">
          <NavLink to="/login" className="btn ghost">
            Login
          </NavLink>
          <NavLink to="/signup" className="btn primary">
            Sign Up
          </NavLink>
        </div>
      )}
    </header>
  );
}

export default Navbar;
