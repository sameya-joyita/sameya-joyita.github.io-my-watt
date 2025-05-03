import React, { useState, useEffect } from "react";
import { updateRate, fetchCurrentRate } from "../services/api";
import "./Settings.css";

const Settings = () => {
  const [newRate, setNewRate] = useState("");
  const [currentRate, setCurrentRate] = useState(0);
  const [isSuccess, setIsSuccess] = useState(null);
  const [message, setMessage] = useState("");
  
  useEffect(() => {
    // Fetch current rate when component mounts
    const getCurrentRate = async () => {
      try {
        const rate = await fetchCurrentRate();
        setCurrentRate(rate);
      } catch (error) {
        console.error("Error fetching current rate:", error);
      }
    };
    
    getCurrentRate();
  }, []);

  const handleRateChange = async () => {
    if (!newRate || isNaN(newRate) || parseFloat(newRate) <= 0) {
      setIsSuccess(false);
      setMessage("Please enter a valid rate (must be greater than 0).");
      return;
    }
    
    try {
      const response = await updateRate(parseFloat(newRate));
      setCurrentRate(response.new_rate);
      setIsSuccess(true);
      setMessage(`Rate successfully updated to £${response.new_rate.toFixed(4)}/kWh`);
      setNewRate(""); // Clear input field after successful update
    } catch (error) {
      setIsSuccess(false);
      setMessage("Failed to update rate. Please try again later.");
    }
  };

  return (
    <div className="page-container">
      <h2 className="page-title">Settings</h2>
      
      <div className="section">
        <h3 className="section-title">Energy Rate Configuration</h3>
        
        <div className="cards-row">
          <div className="card">
            <h4>Current Rate</h4>
            <p>£{currentRate} /kWh</p>
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="rate-input">Update Energy Rate (£/kWh):</label>
          <input
            id="rate-input"
            type="number"
            className="form-control"
            value={newRate}
            onChange={(e) => setNewRate(e.target.value)}
            placeholder="Enter new rate"
            step="0.0001"
            min="0"
          />
        </div>
        
        <button 
          className="btn btn-primary" 
          onClick={handleRateChange}
        >
          Update Rate
        </button>
        
        {message && (
          <div className={`status-message ${isSuccess ? 'status-success' : 'status-error'}`}>
            {message}
          </div>
        )}
      </div>
      
      <div className="section">
        <h3 className="section-title">Additional Information</h3>
        <p>
          The energy rate is used to calculate the cost of your energy consumption. 
          Changes to the rate will apply to all future calculations.
        </p>
        <p>
          <strong>Note:</strong> Rate updates may take a few moments to propagate through the system.
        </p>
      </div>
    </div>
  );
};

export default Settings;