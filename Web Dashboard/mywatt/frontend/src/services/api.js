import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api';

// Create axios instance with authorization header
const authAxios = () => {
  const token = localStorage.getItem('token');
  return axios.create({
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  });
};

// Authentication Functions
export const login = async (username, password, isAdmin = false) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username,
      password,
      is_admin: isAdmin
    });
    
    // Store token and user info in localStorage
    localStorage.setItem('token', response.data.access_token);
    localStorage.setItem('userType', response.data.user_type);
    localStorage.setItem('userId', response.data.user_id);
    localStorage.setItem('forcePasswordChange', response.data.force_password_change);
    
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userType');
  localStorage.removeItem('userId');
  localStorage.removeItem('forcePasswordChange');
};

export const changePassword = async (currentPassword, newPassword) => {
  try {
    const response = await authAxios().post(`${BASE_URL}/auth/change-password`, {
      current_password: currentPassword,
      new_password: newPassword
    });
    
    // Update forcePasswordChange flag
    localStorage.setItem('forcePasswordChange', false);
    
    return response.data;
  } catch (error) {
    console.error('Change password error:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await authAxios().get(`${BASE_URL}/auth/me`);
    return response.data;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

// Admin Functions
export const createDevice = async (deviceName, password = '') => {
  try {
    const response = await authAxios().post(`${BASE_URL}/admin/devices`, {
      device_name: deviceName,
      password: password
    });
    return response.data;
  } catch (error) {
    console.error('Create device error:', error);
    throw error;
  }
};

export const listDevices = async () => {
  try {
    const response = await authAxios().get(`${BASE_URL}/admin/devices`);
    return response.data;
  } catch (error) {
    console.error('List devices error:', error);
    return [];
  }
};

export const deleteDevice = async (deviceId) => {
  try {
    const response = await authAxios().delete(`${BASE_URL}/admin/devices/${deviceId}`);
    return response.data;
  } catch (error) {
    console.error('Delete device error:', error);
    throw error;
  }
};

export const resetDevicePassword = async (deviceId) => {
  try {
    const response = await authAxios().put(`${BASE_URL}/admin/devices/${deviceId}/reset-password`);
    return response.data;
  } catch (error) {
    console.error('Reset device password error:', error);
    throw error;
  }
};

export const createAdmin = async (username, password) => {
  try {
    const response = await axios.post(`${BASE_URL}/admin/create-admin`, {
      device_name: username,  // Reusing the DeviceCreate model
      password: password
    });
    return response.data;
  } catch (error) {
    console.error('Create admin error:', error);
    throw error;
  }
};

// Fetch the current power usage (watts)
export const fetchCurrentUsage = async () => {
  try {
    const deviceId = localStorage.getItem('userId');
    const response = await authAxios().get(`${BASE_URL}/current-usage`, {
      params: { device_id: deviceId }
    });
    return response.data.current_usage;
  } catch (error) {
    console.error('Error fetching current usage:', error);
    return null;
  }
};

// Fetch the current energy rate (£/kWh)
export const fetchCurrentRate = async () => {
  try {
    const deviceId = localStorage.getItem('userId');
    const response = await authAxios().get(`${BASE_URL}/current-rate`, {
      params: { device_id: deviceId }
    });
    return response.data.rate;
  } catch (error) {
    console.error('Error fetching current rate:', error);
    return null;
  }
};

// Fetch the current voltage level (V)
export const fetchCurrentVoltage = async () => {
  try {
    const deviceId = localStorage.getItem('userId');
    const response = await authAxios().get(`${BASE_URL}/current-voltage`, {
      params: { device_id: deviceId }
    });
    return response.data.voltage;
  } catch (error) {
    console.error('Error fetching current voltage:', error);
    return null;
  }
};

// Fetch today's total power and cost
export const fetchTodayUsage = async () => {
  try {
    const deviceId = localStorage.getItem('userId');
    const response = await authAxios().get(`${BASE_URL}/today-usage`, {
      params: { device_id: deviceId }
    });
    return {
      total_energy_day: response.data.total_energy_day,
      total_cost_day: response.data.total_cost_day
    };
  } catch (error) {
    console.error('Error fetching today usage:', error);
    return {
      total_energy_day: 0,
      total_cost_day: 0
    };
  }
};

// Fetch daily usage and cost trends (last X days, default 30)
export const fetchDailyTrends = async (days = 30) => {
  try {
    const deviceId = localStorage.getItem('userId');
    const response = await authAxios().get(`${BASE_URL}/daily-trends`, {
      params: { days, device_id: deviceId }
    });
    return response.data.daily_trends;
  } catch (error) {
    console.error('Error fetching daily trends:', error);
    return [];
  }
};

// Fetch last 3 months billing history
export const fetchMonthlyBillingHistory = async () => {
  try {
    const deviceId = localStorage.getItem('userId');
    const response = await authAxios().get(`${BASE_URL}/monthly-billing-history`, {
      params: { device_id: deviceId }
    });
    return response.data.billing_history;
  } catch (error) {
    console.error('Error fetching monthly billing history:', error);
    return [];
  }
};

// DAILY USAGE TAB

// Fetch hourly usage & cost for a selected day (default: latest available day)
export async function fetchHourlyUsage(selectedDay=null, unit = 'kWh') {
  try {
    const deviceId = localStorage.getItem('userId');
    const response = await authAxios().get(`${BASE_URL}/hourly-usage`, {
      params: { selected_day: selectedDay, unit, device_id: deviceId },
    });
    return response.data.hourly_usage;
  } catch (error) {
    console.error('Error fetching hourly usage:', error);
    return [];
  }
}

// Fetch daily usage & cost for a selected date range (default: last 7 days)
export const fetchDailyUsageRange = async (startDate = null, endDate = null, unit = "kWh") => {
  try {
    const deviceId = localStorage.getItem('userId');
    const response = await authAxios().get(`${BASE_URL}/daily-range-usage`, {
      params: { start_date: startDate, end_date: endDate, unit, device_id: deviceId },
    });
    return response.data.daily_usage;
  } catch (error) {
    console.error('Error fetching daily usage range:', error);
    return [];
  }
};

// Fetch total cost for a selected date range (default: last 7 days)
export const fetchTotalCostRange = async (startDate = null, endDate = null) => {
  try {
    const deviceId = localStorage.getItem('userId');
    const response = await authAxios().get(`${BASE_URL}/total-cost-day-range`, {
      params: { start_date: startDate, end_date: endDate, device_id: deviceId },
    });
    return response.data.total_cost;
  } catch (error) {
    console.error('Error fetching total cost range:', error);
    return 0;
  }
};

// WEEKLY USAGE TAB

// Fetch weekly power & cost trends (default: last 15 weeks)
export const fetchWeeklyTrends = async (weeks = 15) => {
  try {
    const deviceId = localStorage.getItem('userId');
    const response = await authAxios().get(`${BASE_URL}/weekly-trends`, {
      params: { weeks, device_id: deviceId },
    });
    return response.data.weekly_trends;
  } catch (error) {
    console.error("Error fetching weekly trends:", error);
    return [];
  }
};

// Fetch per-day power & cost breakdown for a selected week (default: latest available week)
export const fetchWeeklyBreakdown = async (selectedWeek = null, unit = "kWh") => {
  try {
    const deviceId = localStorage.getItem('userId');
    const response = await authAxios().get(`${BASE_URL}/weekly-breakdown`, {
      params: { selected_week: selectedWeek, unit, device_id: deviceId },
    });
    return response.data.weekly_breakdown;
  } catch (error) {
    console.error("Error fetching weekly breakdown:", error);
    return [];
  }
};

// MONTHLY TAB

// Fetch monthly power & cost trends (default: last 12 months)
export const fetchMonthlyTrends = async (months = 12) => {
  try {
    const deviceId = localStorage.getItem('userId');
    const response = await authAxios().get(`${BASE_URL}/monthly-trends`, {
      params: { months, device_id: deviceId },
    });
    return response.data.monthly_trends;
  } catch (error) {
    console.error("Error fetching monthly trends:", error);
    return [];
  }
};

// Fetch per-day power & cost breakdown for a selected month (default: latest available month)
export const fetchMonthlyBreakdown = async (selectedMonth = null, unit = "kWh") => {
  try {
    const deviceId = localStorage.getItem('userId');
    const response = await authAxios().get(`${BASE_URL}/monthly-breakdown`, {
      params: { selected_month: selectedMonth, unit, device_id: deviceId },
    });
    return response.data.monthly_breakdown;
  } catch (error) {
    console.error("Error fetching monthly breakdown:", error);
    return [];
  }
};

// Fetch yearly power & cost trends (default: last 10 years)
export const fetchYearlyTrends = async (years = 10) => {
  try {
    const deviceId = localStorage.getItem('userId');
    const response = await authAxios().get(`${BASE_URL}/yearly-trends`, {
      params: { years, device_id: deviceId },
    });
    return response.data.yearly_trends;
  } catch (error) {
    console.error("Error fetching yearly trends:", error);
    return [];
  }
};

// Fetch per-month power & cost breakdown for a selected year (default: latest available year)
export const fetchYearlyBreakdown = async (selectedYear = null, unit = "kWh") => {
  try {
    const deviceId = localStorage.getItem('userId');
    const response = await authAxios().get(`${BASE_URL}/yearly-breakdown`, {
      params: { selected_year: selectedYear, unit, device_id: deviceId },
    });
    return response.data.yearly_breakdown;
  } catch (error) {
    console.error("Error fetching yearly breakdown:", error);
    return [];
  }
};

// Update the current energy rate
export const updateRate = async (newRate) => {
  try {
    const deviceId = localStorage.getItem('userId');
    const response = await authAxios().put(`${BASE_URL}/update-rate`, { 
      device_id: deviceId,
      new_rate: newRate
    });
    
    if (response.data && response.data.new_rate) {
      return response.data;
    } else {
      throw new Error("Invalid response format");
    }
  } catch (error) {
    console.error("Error updating energy rate:", error);
    return { message: "Failed to update rate" };
  }
};