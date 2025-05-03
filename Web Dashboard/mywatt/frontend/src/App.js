import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import Sidebar from "./components/Sidebar";
import { AuthProvider } from "./components/AuthContext";
import "./App.css";

function App() {
  return (
    <Router><AuthProvider>
      <div className="app-layout">
        <Sidebar />
        <div className="content-area">
          <AppRoutes />
        </div>
      </div></AuthProvider>
    </Router>
  );
}

export default App;
