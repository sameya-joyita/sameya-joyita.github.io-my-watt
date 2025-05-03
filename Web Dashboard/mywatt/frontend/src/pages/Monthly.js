import React, { useEffect, useState } from "react";
import { fetchMonthlyTrends, fetchMonthlyBreakdown } from "../services/api";
import { Line, Bar } from "react-chartjs-2";
import "./Monthly.css";

const Monthly = () => {
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [unit, setUnit] = useState("kWh");
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [monthlyBreakdown, setMonthlyBreakdown] = useState([]);
  const [totalMonthCost, setTotalMonthCost] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const trendsData = await fetchMonthlyTrends();
        setMonthlyTrends(trendsData);

        const breakdownData = await fetchMonthlyBreakdown(selectedMonth, unit);
        setMonthlyBreakdown(breakdownData);
        
        // Calculate total cost
        const totalCost = breakdownData.reduce((sum, entry) => sum + entry.value, 0);
        setTotalMonthCost(totalCost);
      } catch (error) {
        console.error("Error fetching monthly usage data:", error);
      }
    };

    fetchData();
  }, [selectedMonth, unit]);

  const toggleUnit = () => {
    setUnit(unit === "kWh" ? "£" : "kWh");
  };

  // Prepare Line Chart for monthly trends
  const monthlyTrendsData = {
    labels: monthlyTrends.map(entry => {
      const date = new Date(entry.month);
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    }),
    datasets: [
      {
        label: `Energy Usage (kWh)`,
        data: monthlyTrends.map(entry => entry.total_energy_month),
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        tension: 0.1,
        fill: false,
      },
      {
        label: "Cost (£)",
        data: monthlyTrends.map(entry => entry.total_cost_month),
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        tension: 0.1,
        fill: false,
      },
    ],
  };

  // Prepare Bar Chart for selected month's breakdown
  const monthlyBreakdownData = {
    labels: monthlyBreakdown.map(entry => entry.day),
    datasets: [
      {
        label: unit === "kWh" ? `Energy Usage (kWh)` : `Cost (£)`,
        data: monthlyBreakdown.map(entry => entry.value),
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

  return (
    <div className="page-container">
      <h2 className="page-title">Monthly Usage Analysis</h2>

      {/* Monthly Trends Section */}
      <div className="section">
        <h3 className="section-title">Monthly Power & Cost Trends</h3>
        
        <div className="chart-height-container">
        <Line 
            data={monthlyTrendsData} 
            options={chartOptions}
          />
        </div>
      </div>

      {/* Monthly Breakdown Section */}
      <div className="section">
        <h3 className="section-title">Daily Breakdown For Selected Month</h3>
        
        <div className="controls-row">
          <div className="date-selector">
            <label>Month:</label>
            <input 
              type="month" 
              onChange={(e) => setSelectedMonth(e.target.value)}
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

        <div style={{ height: "350px" }}>
          <Bar 
            data={monthlyBreakdownData} 
            options={chartOptions}
          />
        </div>
        
        <div className="summary-info">
          Total Cost for Selected Month: <strong>£{totalMonthCost.toFixed(2)}</strong>
        </div>
      </div>
    </div>
  );
};

export default Monthly;