import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "../pages/Home";
import Daily from "../pages/Daily";
import Weekly from "../pages/Weekly";
import Monthly from "../pages/Monthly";
import Yearly from "../pages/Yearly";
import Settings from "../pages/Settings";
import Login from "../pages/Login";
import ChangePassword from "../pages/ChangePassword";
import AdminDashboard from "../pages/AdminDashboard";
import { PrivateRoute, AdminRoute } from "../components/PrivateRoute";
import { useAuth } from "../components/AuthContext";

const AppRoutes = () => {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        isAuthenticated ? <Navigate to={isAdmin ? "/admin/dashboard" : "/"} /> : <Login />
      } />

      {/* Protected routes for all authenticated users */}
      <Route element={<PrivateRoute />}>
        <Route path="/change-password" element={<ChangePassword />} />
      </Route>

      {/* Admin routes */}
      <Route element={<AdminRoute />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Route>

      {/* Device user routes */}
      <Route element={<PrivateRoute />}>
        <Route path="/" element={isAdmin ? <Navigate to="/admin/dashboard" /> : <Home />} />
        <Route path="/daily" element={<Daily />} />
        <Route path="/weekly" element={<Weekly />} />
        <Route path="/monthly" element={<Monthly />} />
        <Route path="/yearly" element={<Yearly />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Redirect to appropriate homepage based on authentication status */}
      <Route path="*" element={
        isAuthenticated 
          ? isAdmin 
            ? <Navigate to="/admin/dashboard" /> 
            : <Navigate to="/" />
          : <Navigate to="/login" />
      } />
    </Routes>
  );
};

export default AppRoutes;