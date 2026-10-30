import React from "react";
import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-main">
        <div>
          <Link to="/" className="logo">
            <span className="logo-mark">C</span>
            Campus 360
          </Link>
          <p>
            Empowering students through the sharing economy. Built for campus
            life, locally.
          </p>
          <div className="footer-badges">
            <span>University Verified</span>
            <span>Student Safe</span>
            <span>Escrow Protected</span>
          </div>
        </div>
        <div className="footer-columns">
          <div>
            <h4>Marketplace</h4>
            <Link to="/marketplace">Tech</Link>
            <Link to="/marketplace">Textbooks</Link>
            <Link to="/marketplace">Outdoor Gear</Link>
            <Link to="/marketplace">Dorm Essentials</Link>
          </div>
          <div>
            <h4>Resources</h4>
            <Link to="/add">Seller Tips</Link>
            <Link to="/booking">Terms of Service</Link>
            <Link to="/booking">Privacy Policy</Link>
            <Link to="/chat">Community Guidelines</Link>
          </div>
          <div>
            <h4>Support</h4>
            <Link to="/chat">Help Center</Link>
            <Link to="/chat">Contact Us</Link>
            <Link to="/chat">Report an Issue</Link>
            <Link to="/chat">FAQ</Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>Built for the academic curator.</span>
        <span>(c) 2026 Campus 360. All rights reserved.</span>
      </div>
    </footer>
  );
}

export default Footer;