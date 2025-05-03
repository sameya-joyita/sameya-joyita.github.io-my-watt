import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await getCurrentUser();
          if (userData) {
            setUser({
              ...userData,
              forcePasswordChange: localStorage.getItem('forcePasswordChange') === 'true'
            });
            
            // If force password change is true, redirect to change password page
            if (localStorage.getItem('forcePasswordChange') === 'true') {
              navigate('/change-password');
            }
          } else {
            // Invalid token or session expired
            localStorage.removeItem('token');
            localStorage.removeItem('userType');
            localStorage.removeItem('userId');
            localStorage.removeItem('forcePasswordChange');
          }
        } catch (error) {
          console.error("Authentication error:", error);
          localStorage.removeItem('token');
          localStorage.removeItem('userType');
          localStorage.removeItem('userId');
          localStorage.removeItem('forcePasswordChange');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const value = {
    user,
    setUser,
    isAuthenticated: !!user,
    isAdmin: user?.user_type === 'admin',
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};