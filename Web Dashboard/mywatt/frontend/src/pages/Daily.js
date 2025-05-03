import React, { useEffect, useState } from "react";
import { fetchHourlyUsage, fetchDailyUsageRange, fetchTotalCostRange } from "../services/api";
import { Bar } from "react-chartjs-2";
import "./Daily.css";

const Daily = () => {
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedStartDate, setSelectedStartDate] = useState(null);
  const [selectedEndDate, setSelectedEndDate] = useState(null);
  const [unit, setUnit] = useState("kWh");
  const [hourlyUsage, setHourlyUsage] = useState([]);
  const [dailyUsage, setDailyUsage] = useState([]);
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const hourlyData = await fetchHourlyUsage(selectedDay, unit);
        setHourlyUsage(hourlyData);

        const dailyData = await fetchDailyUsageRange(selectedStartDate, selectedEndDate, unit);
        setDailyUsage(dailyData);

        const costData = await fetchTotalCostRange(selectedStartDate, selectedEndDate);
        setTotalCost(costData);
      } catch (error) {
        console.error("Error fetching daily usage data:", error);
      }
    };

    fetchData();
  }, [selectedDay, selectedStartDate, selectedEndDate, unit]);
  
  const toggleUnit = () => {
    setUnit(unit === "kWh" ? "£" : "kWh");
  };
  
  const hourlyChartData = {
    labels: hourlyUsage.map(entry => entry.hour),
    datasets: [
      {
        label: `Hourly ${unit} Usage`,
        data: hourlyUsage.map(entry => entry.value),
        backgroundColor: unit === "kWh" ? "rgba(67, 97, 238, 0.7)" : "rgba(76, 175, 80, 0.7)",
        borderColor: unit === "kWh" ? "var(--primary-color)" : "var(--secondary-color)",
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  const dailyChartData = {
    labels: dailyUsage.map(entry => entry.day),
    datasets: [
      {
        label: `Daily ${unit} Usage`,
        data: dailyUsage.map(entry => entry.value),
        backgroundColor: unit === "kWh" ? "rgba(67, 97, 238, 0.7)" : "rgba(76, 175, 80, 0.7)",
        borderColor: unit === "kWh" ? "var(--primary-color)" : "var(--secondary-color)",
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true
      }
    }
  };
  
  return (
    <div className="page-container">
      <h2 className="page-title">Daily Usage Overview</h2>

      {/* Hourly Usage Section */}
      <div className="section">
        <h3 className="section-title">Hourly Energy & Cost Breakdown</h3>
        
        {/* Date and Toggle Section */}
        <div className="controls-row">
          <div className="date-selector">
            <label>Date:</label>
            <input 
              type="date" 
              onChange={(e) => setSelectedDay(e.target.value)} 
              className="date-picker"
            />
          </div>

          {/* Toggle Button with kWh and £ */}
          <div className="toggle-container">
            <span className={`toggle-label ${unit === "kWh" ? "active" : ""}`}>kWh</span>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={unit === "£"} 
                onChange={toggleUnit} 
              />
              <span className="slider"></span>
            </label>
            <span className={`toggle-label ${unit === "£" ? "active" : ""}`}>£</span>
          </div>
        </div>

        <div className="chart-height-container">
          <Bar data={hourlyChartData} options={chartOptions} />
        </div>
      </div>

      {/* Daily Usage Section */}
      <div className="section">
        <h3 className="section-title">Daily Usage / Cost Over Time</h3>
        
        {/* Date and Toggle Section */}
        <div className="controls-row">
          <div className="date-selector">
            <label>Start Date:</label>
            <input 
              type="date" 
              onChange={(e) => setSelectedStartDate(e.target.value)} 
              className="date-picker"
            />
            <label>End Date:</label>
            <input 
              type="date" 
              onChange={(e) => setSelectedEndDate(e.target.value)} 
              className="date-picker"
            />
          </div>

          {/* Toggle Button */}
          <div className="toggle-container">
            <span className={`toggle-label ${unit === "kWh" ? "active" : ""}`}>kWh</span>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={unit === "£"} 
                onChange={toggleUnit} 
              />
              <span className="slider"></span>
            </label>
            <span className={`toggle-label ${unit === "£" ? "active" : ""}`}>£</span>
          </div>
        </div>

        <div className="chart-height-container">
          <Bar data={dailyChartData} options={chartOptions} />
        </div>
        
        <div className="summary-info">
          Total Cost for Selected Period: <strong>£{totalCost.toFixed(2)}</strong>
        </div>
      </div>
    </div>
  );
};

export default Daily;