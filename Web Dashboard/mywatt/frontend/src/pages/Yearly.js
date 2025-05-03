import React, { useEffect, useState } from "react";
import { fetchYearlyTrends, fetchYearlyBreakdown } from "../services/api";
import { Line, Bar } from "react-chartjs-2";
import "./Yearly.css";

const Yearly = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [unit, setUnit] = useState("kWh");
  const [yearlyTrends, setYearlyTrends] = useState([]);
  const [yearlyBreakdown, setYearlyBreakdown] = useState([]);
  const [totalYearCost, setTotalYearCost] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const trendsData = await fetchYearlyTrends();
        setYearlyTrends(trendsData);

        const breakdownData = await fetchYearlyBreakdown(selectedYear, unit);
        setYearlyBreakdown(breakdownData);
        
        // Calculate total cost
        const totalCost = breakdownData.reduce((sum, entry) => sum + entry.value, 0);
        setTotalYearCost(totalCost);
      } catch (error) {
        console.error("Error fetching yearly usage data:", error);
      }
    };

    fetchData();
  }, [selectedYear, unit]);

  const toggleUnit = () => {
    setUnit(unit === "kWh" ? "£" : "kWh");
  };

  // Prepare Line Chart for yearly trends
  const yearlyTrendsData = {
    labels: yearlyTrends.map(entry => entry.year),
    datasets: [
      {
        label: "Energy Usage (kWh)",
        data: yearlyTrends.map(entry => entry.total_energy_year),
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        tension: 0.1,
        fill: false,
      },
      {
        label: "Cost (£)",
        data: yearlyTrends.map(entry => entry.total_cost_year),
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        tension: 0.1,
        fill: false,
      },
    ],
  };

  // Prepare Bar Chart for selected year's breakdown
  const yearlyBreakdownData = {
    labels: yearlyBreakdown.map(entry => entry.month),
    datasets: [
      {
        label: unit === "kWh" ? "Energy Usage (kWh)" : "Cost (£)",
        data: yearlyBreakdown.map(entry => entry.value),
        backgroundColor: unit === "kWh" ? "rgba(67, 97, 238, 0.7)" : "rgba(76, 175, 80, 0.7)",
        borderColor: unit === "kWh" ? "#4361ee" : "#4caf50",
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

  const currentYear = new Date().getFullYear();

  return (
    <div className="page-container">
      <h2 className="page-title">Yearly Usage Analysis</h2>

      {/* Yearly Trends Section */}
      <div className="section">
        <h3 className="section-title">Annual Power & Cost Trends</h3>
        <div style={{ height: "350px" }}>
          <Line 
            data={yearlyTrendsData} 
            options={chartOptions} 
          />
        </div>
      </div>

      {/* Yearly Breakdown Section */}
      <div className="section">
        <h3 className="section-title">Monthly Breakdown For Selected Year</h3>
        
        <div className="controls-row">
          <div className="year-selector">
            <label>Year:</label>
            <input 
              type="number" 
              min="2000" 
              max={currentYear}
              value={selectedYear || currentYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="year-picker"
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

        <div style={{ height: "350px" }}>
          <Bar 
            data={yearlyBreakdownData} 
            options={chartOptions} 
          />
        </div>
        
        <div className="summary-info">
          Total Cost for {selectedYear}: <strong>£{totalYearCost.toFixed(2)}</strong>
        </div>
      </div>
    </div>
  );
};

export default Yearly;