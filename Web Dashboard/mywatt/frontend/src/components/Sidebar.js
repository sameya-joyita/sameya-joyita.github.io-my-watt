import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { logout } from "../services/api";
import "./Sidebar.css";

const Sidebar = () => {
  const { user, isAuthenticated, isAdmin, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setUser(null);
    navigate("/login");
  };

  // If not authenticated, don't render the sidebar
  if (!isAuthenticated) {
    return null;
  }

  // Different menu items based on user role
  const menuItems = !isAdmin 
    ? [
        { path: "/", label: "Dashboard" },
        { path: "/daily", label: "Daily" },
        { path: "/weekly", label: "Weekly" },
        { path: "/monthly", label: "Monthly" },
        { path: "/yearly", label: "Yearly" },
        { path: "/settings", label: "Settings" },
      ]
    : [
        { path: "/admin/dashboard", label: "Device Management" },
      ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <h2>MyWatt</h2>
        </div>
        <p className="user-info">
          {isAdmin ? "Admin: " : "Device: "}
          {user?.username}
        </p>
      </div>
      
      <nav className="sidebar-nav">
        <ul className="sidebar-menu">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink to={item.path} className={({ isActive }) => isActive ? 'active' : ''}>
                <span className="menu-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        <div className="account-actions">
          <NavLink to="/change-password" className={({ isActive }) => isActive ? "active" : ""}>
            Change Password
          </NavLink>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
        <p className="version-info">Energy Analytics v1.0</p>
      </div>
    </div>
  );
};

export default Sidebar;