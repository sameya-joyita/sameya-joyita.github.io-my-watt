import React, { useEffect, useState } from "react";
import { fetchWeeklyTrends, fetchWeeklyBreakdown } from "../services/api";
import { Line, Bar } from "react-chartjs-2";
import "./Weekly.css";

const Weekly = () => {
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [unit, setUnit] = useState("kWh");
  const [weeklyTrends, setWeeklyTrends] = useState([]);
  const [weeklyBreakdown, setWeeklyBreakdown] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const trendsData = await fetchWeeklyTrends();
        setWeeklyTrends(trendsData);
  
        const index = selectedWeekIndex ?? 0;
  
        const breakdownData = await fetchWeeklyBreakdown(
          trendsData[trendsData.length - 1 - index]?.week,
          unit
        );
  
        setWeeklyBreakdown(breakdownData);
      } catch (error) {
        console.error("Error fetching weekly usage data:", error);
      }
    };
  
    fetchData();
  }, [selectedWeekIndex, unit]);
  
  const handlePreviousWeek = () => {
    setSelectedWeekIndex((prev) => {
      const currentIndex = prev ?? 0;
      const newIndex = currentIndex + 1;
      return newIndex < weeklyTrends.length ? newIndex : currentIndex;
    });
  };
  
  const handleNextWeek = () => {
    setSelectedWeekIndex((prev) => {
      const currentIndex = prev ?? 0;
      const newIndex = currentIndex - 1;
      return newIndex >= 0 ? newIndex : currentIndex;
    });
  };
  
  const selectedWeek =
    weeklyTrends.length > 0
    ? weeklyTrends[weeklyTrends.length - 1 - (selectedWeekIndex ?? 0)]?.week
    : null;

  const toggleUnit = () => {
    setUnit(unit === "kWh" ? "£" : "kWh");
  };

  const weeklyTrendsData = {
    labels: weeklyTrends.map((entry) => entry.week),
    datasets: [
      {
        label: `Weekly ${unit} Usage`,
        data:
          unit === "kWh"
            ? weeklyTrends.map((entry) => entry.total_energy_week)
            : weeklyTrends.map((entry) => entry.total_cost_week),
        borderColor: "var(--primary-color)",
        backgroundColor: "rgba(67, 97, 238, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.1
      },
    ],
  };

  const weeklyBreakdownData = {
    labels: weeklyBreakdown.map((entry) => entry.day),
    datasets: [
      {
        label: `Daily ${unit} Usage`,
        data: weeklyBreakdown.map((entry) => entry.value),
        backgroundColor: unit === "kWh" ? "rgba(67, 97, 238, 0.7)" : "rgba(76, 175, 80, 0.7)",
        borderColor: unit === "kWh" ? "var(--primary-color)" : "var(--secondary-color)",
        borderWidth: 1,
        borderRadius: 4
      },
    ],
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
      <h2 className="page-title">Weekly Usage</h2>

      <div className="controls-row">
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

      <div className="charts-row">
        <div className="chart-container">
          <h3 className="section-title">Weekly Power & Cost Trends</h3>
          <div className="chart-height-container">
            <Line data={weeklyTrendsData} options={chartOptions} />
          </div>
        </div>

        <div className="chart-container">
          <h3 className="section-title">Per-Day Usage Breakdown</h3>
          <div className="week-selector">
          <button onClick={handlePreviousWeek}>&larr;</button>
          <span>{selectedWeek ? `Week: ${selectedWeek}` : "Loading..."}</span>
          <button onClick={handleNextWeek}>&rarr;</button>
        </div>
          <div className="chart-height-container2">
            <Bar data={weeklyBreakdownData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Weekly;