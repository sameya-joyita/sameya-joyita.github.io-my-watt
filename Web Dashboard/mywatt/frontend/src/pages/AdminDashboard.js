import React, { useState, useEffect } from 'react';
import { listDevices, createDevice, deleteDevice, resetDevicePassword } from '../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDevicePassword, setNewDevicePassword] = useState('');
  const [tempPasswordInfo, setTempPasswordInfo] = useState(null);

  // Fetch devices on component mount
  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const devicesList = await listDevices();
      setDevices(devicesList);
    } catch (err) {
      setError('Failed to fetch devices');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async (e) => {
    e.preventDefault();
    if (!newDeviceName.trim()) {
      setError('Device name is required');
      return;
    }

    try {
      const result = await createDevice(newDeviceName, newDevicePassword);
      setTempPasswordInfo(result);
      setNewDeviceName('');
      setNewDevicePassword('');
      setShowAddDevice(false);
      fetchDevices();
    } catch (err) {
      if (err.response && err.response.data) {
        setError(err.response.data.detail || 'Failed to add device');
      } else {
        setError('Failed to add device');
      }
      console.error(err);
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (window.confirm('Are you sure you want to delete this device? This action cannot be undone.')) {
      try {
        await deleteDevice(deviceId);
        fetchDevices();
      } catch (err) {
        setError('Failed to delete device');
        console.error(err);
      }
    }
  };

  const handleResetPassword = async (deviceId) => {
    if (window.confirm('Are you sure you want to reset the password for this device?')) {
      try {
        const result = await resetDevicePassword(deviceId);
        setTempPasswordInfo(result);
      } catch (err) {
        setError('Failed to reset password');
        console.error(err);
      }
    }
  };

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>

      {error && <div className="error-message">{error}</div>}

      {tempPasswordInfo && (
        <div className="temp-password-info">
          <h3>Temporary Password Created</h3>
          <p><strong>Device:</strong> {tempPasswordInfo.device_name}</p>
          <p><strong>Device ID:</strong> {tempPasswordInfo.device_id}</p>
          <p><strong>Temporary Password:</strong> {tempPasswordInfo.temp_password}</p>
          <p className="warning">Please save this password. It will not be shown again!</p>
          <button onClick={() => setTempPasswordInfo(null)}>Close</button>
        </div>
      )}

      <div className="admin-actions">
        <button 
          className="add-device-btn"
          onClick={() => setShowAddDevice(!showAddDevice)}
        >
          {showAddDevice ? 'Cancel' : 'Add New Device'}
        </button>
      </div>

      {showAddDevice && (
        <form className="add-device-form" onSubmit={handleAddDevice}>
          <h3>Add New Device</h3>
          <div className="form-group">
            <label>Device Name</label>
            <input
              type="text"
              value={newDeviceName}
              onChange={(e) => setNewDeviceName(e.target.value)}
              placeholder="Enter device name"
              required
            />
          </div>
          <div className="form-group">
            <label>Initial Password (optional)</label>
            <input
              type="password"
              value={newDevicePassword}
              onChange={(e) => setNewDevicePassword(e.target.value)}
              placeholder="Leave blank for auto-generated password"
            />
            <small>If left blank, a secure temporary password will be generated</small>
          </div>
          <button type="submit">Create Device</button>
        </form>
      )}

      <div className="devices-list">
        <h2>Devices</h2>
        
        {loading ? (
          <p>Loading devices...</p>
        ) : devices.length === 0 ? (
          <p>No devices found. Create your first device to get started.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Device Name</th>
                <th>Device ID</th>
                <th>Created</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(device => (
                <tr key={device.device_id}>
                  <td>{device.device_name}</td>
                  <td className="device-id">{device.device_id}</td>
                  <td>{new Date(device.created_at).toLocaleDateString()}</td>
                  <td>
                    {device.force_password_change 
                      ? <span className="status pending">Pending Setup</span>
                      : <span className="status active">Active</span>
                    }
                  </td>
                  <td className="actions">
                    <button 
                      className="reset-password"
                      onClick={() => handleResetPassword(device.device_id)}
                    >
                      Reset Password
                    </button>
                    <button 
                      className="delete-device"
                      onClick={() => handleDeleteDevice(device.device_id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;