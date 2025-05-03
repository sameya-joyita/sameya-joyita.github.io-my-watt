//src/pages/Home.js
import React, { useEffect, useState } from "react";
import {
  fetchCurrentUsage,
  fetchCurrentRate,
  fetchCurrentVoltage,
  fetchTodayUsage,
  fetchMonthlyBillingHistory,
  fetchDailyTrends,
} from "../services/api";
import { Doughnut, Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  ArcElement,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
} from 'chart.js';
import "./Home.css";

// Register the required Chart.js components
ChartJS.register(
  CategoryScale,
  ArcElement,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement
);

const Home = () => {
  const [currentUsage, setCurrentUsage] = useState(0);
  const [currentRate, setCurrentRate] = useState(0);
  const [currentVoltage, setCurrentVoltage] = useState(230);
  const [todayUsage, setTodayUsage] = useState(0);
  const [monthlyCosts, setMonthlyCosts] = useState([]);
  const [dailyTrend, setDailyTrend] = useState([]);
  

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usageRes = await fetchCurrentUsage();
        setCurrentUsage(usageRes);

        const rateRes = await fetchCurrentRate();
        setCurrentRate(rateRes);
        
        const voltageRes = await fetchCurrentVoltage();
        setCurrentVoltage(voltageRes);

        const todayRes = await fetchTodayUsage();
        setTodayUsage(todayRes?.total_energy_day ?? 0);

        const monthlyRes = await fetchMonthlyBillingHistory();
        setMonthlyCosts(monthlyRes);

        const dailyRes = await fetchDailyTrends();
        setDailyTrend(dailyRes);
      } catch (error) {
        console.error("Error loading home dashboard data:", error);
      }
    };

    fetchData();
  }, []);

  const dailyGoal = 15;
  const todayMeterData = {
    labels: ['Used', 'Remaining'],
    datasets: [
      {
        data: [todayUsage, Math.max(0, dailyGoal - todayUsage)],
        backgroundColor: ['green', '#e0e0e0'],
        borderWidth: 0
      }
    ]
  };
  
  const todayMeterOptions = {
    rotation: -90,
    circumference: 180,
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || '';
            const value = context.raw || 0;
            return `${label}: ${value.toFixed(2)} kWh`;
          }
        }
      }
    }
  };

  // Format data for the daily usage chart
  const dailyUsageData = {
    labels: dailyTrend.map(entry => entry.day),  // X-axis: days
    datasets: [
      {
        label: 'Energy Usage (kWh)',
        data: dailyTrend.map(entry => entry.total_energy_day),  // Y-axis: energy usage
        fill: false,
        borderColor: 'var(--primary-color)',
        tension: 0.1
      },
      {
        label: 'Cost (£)',
        data: dailyTrend.map(entry => entry.total_cost_day),  // Y-axis: cost
        fill: false,
        borderColor: 'var(--accent-color)',
        tension: 0.1
      }
    ]
  };

  // Format data for the monthly billing chart
  const monthlyBillingData = {
    labels: monthlyCosts.map(entry => {
      const date = new Date(entry.month); //  entry.month is a date string
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    }),
    datasets: [
      {
        label: 'Total Bill (£)',
        data: monthlyCosts.map(entry => entry.total_cost),
        backgroundColor: 'rgba(67, 97, 238, 0.2)',
        borderColor: 'var(--primary-color)',
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
      <h2 className="page-title">Energy Insights</h2>

      <div className="cards-row">
        <div className="card">
          <h4>Current Usage</h4>
          <p>{currentUsage.toFixed(3)} kWh</p>
        </div>

        <div className="card">
          <h4>Current Rate</h4>
          <p>£{currentRate.toFixed(4)} /kWh</p>
        </div>

        <div className="card">
          <h4>Voltage</h4>
          <p>{currentVoltage} V</p>
        </div>
      </div>

      <div className="section">
        <div className="chart-grid">
          <div className="chart-half">
            <h3 className="section-title">Today's Energy Usage</h3>
            <div style={{ width: '100%', maxWidth: '250px', margin: 'auto' }}>
              <Doughnut data={todayMeterData} options={todayMeterOptions} />
              <p style={{ textAlign: 'center', marginTop: '10px', fontWeight: 'bold' }}>
                {todayUsage.toFixed(3)} kWh used so far today
              </p>
            </div>
          </div>

          <div className="chart-half">
            <h3 className="section-title">Recent Billing History</h3>
              <Bar 
                data={monthlyBillingData} 
              />
          </div>
        </div>

        <div className="chart-full">
          <h3 className="section-title">Power & Cost Trends (Last 30 Days)</h3>
          <div className="chart-height-container">
            <Line
              data={dailyUsageData}
              options={{
                ...chartOptions,
                scales:{ x: {display: false}}
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
