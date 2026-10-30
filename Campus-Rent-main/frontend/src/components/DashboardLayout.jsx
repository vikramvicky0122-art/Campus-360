import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function DashboardLayout() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getNavLinkStyle = ({ isActive }) => ({
    textDecoration: "none",
    padding: "12px 16px",
    borderRadius: "8px",
    display: "block",
    backgroundColor: isActive ? "var(--primary-color, #0d9488)" : "transparent",
    color: isActive ? "#fff" : "var(--text-main, #1f2937)",
    fontWeight: isActive ? "600" : "400",
    transition: "background-color 0.2s",
  });

  return (
    <div className="dashboard-layout" style={{ display: "flex", minHeight: "calc(100vh - 70px)" }}>
      <aside
        style={{
          width: "240px",
          borderRight: "1px solid var(--border-color, #e5e7eb)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#fff",
        }}
      >
        <nav style={{ display: "flex", flexDirection: "column", gap: "8px", flexGrow: 1 }}>
          <NavLink to="/dashboard/profile" style={getNavLinkStyle}>
            Profile
          </NavLink>
          <NavLink to="/dashboard/rentals" style={getNavLinkStyle}>
            My Borrowings
          </NavLink>
          <NavLink to="/dashboard/listings" style={getNavLinkStyle}>
            My Listings
          </NavLink>
        </nav>

        <button
          onClick={handleLogout}
          style={{
            marginTop: "auto",
            padding: "12px 16px",
            backgroundColor: "transparent",
            color: "var(--error, #ef4444)",
            border: "1px solid var(--error, #ef4444)",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            textAlign: "center",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "var(--error, #ef4444)";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "var(--error, #ef4444)";
          }}
        >
          Logout
        </button>
      </aside>

      <main
        style={{
          flexGrow: 1,
          padding: "32px",
          backgroundColor: "var(--bg-secondary, #f8fafc)",
          overflowY: "auto",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
