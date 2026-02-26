import React, { useState } from 'react';
import './Admin.css';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const stats = {
    totalBookings: 1247,
    totalRevenue: 894500,
    activeBuses: 23,
    totalUsers: 856
  };

  const recentBookings = [
    { id: 1, user: 'John Doe', bus: 'Express One', route: 'Nairobi-Mombasa', amount: 800, status: 'Confirmed' },
    { id: 2, user: 'Jane Smith', bus: 'Luxury Coach', route: 'Nairobi-Kisumu', amount: 600, status: 'Pending' },
    { id: 3, user: 'Mike Johnson', bus: 'City Shuttle', route: 'Nairobi-Nakuru', amount: 400, status: 'Confirmed' }
  ];

  return (
    <div className="admin-container">
      <div className="admin-sidebar">
        <div className="sidebar-header">
          <h2>Admin Panel</h2>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`nav-item ${activeTab === 'buses' ? 'active' : ''}`}
            onClick={() => setActiveTab('buses')}
          >
            Manage Buses
          </button>
          <button 
            className={`nav-item ${activeTab === 'routes' ? 'active' : ''}`}
            onClick={() => setActiveTab('routes')}
          >
            Manage Routes
          </button>
          <button 
            className={`nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            View Bookings
          </button>
          <button 
            className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            User Management
          </button>
        </nav>
      </div>

      <div className="admin-content">
        {activeTab === 'dashboard' && (
          <div className="dashboard-tab">
            <h1>Admin Dashboard</h1>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <h3>Total Bookings</h3>
                  <p className="stat-number">{stats.totalBookings}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💰</div>
                <div className="stat-info">
                  <h3>Total Revenue</h3>
                  <p className="stat-number">KSh {stats.totalRevenue.toLocaleString()}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🚌</div>
                <div className="stat-info">
                  <h3>Active Buses</h3>
                  <p className="stat-number">{stats.activeBuses}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <h3>Total Users</h3>
                  <p className="stat-number">{stats.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="recent-bookings">
              <h2>Recent Bookings</h2>
              <table className="bookings-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>User</th>
                    <th>Bus</th>
                    <th>Route</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map(booking => (
                    <tr key={booking.id}>
                      <td>#{booking.id}</td>
                      <td>{booking.user}</td>
                      <td>{booking.bus}</td>
                      <td>{booking.route}</td>
                      <td>KSh {booking.amount}</td>
                      <td>
                        <span className={`status ${booking.status.toLowerCase()}`}>
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'buses' && (
          <div className="buses-tab">
            <h1>Manage Buses</h1>
            <p>Bus management content goes here...</p>
          </div>
        )}

        {activeTab === 'routes' && (
          <div className="routes-tab">
            <h1>Manage Routes</h1>
            <p>Route management content goes here...</p>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="bookings-tab">
            <h1>View Bookings</h1>
            <p>Booking management content goes here...</p>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-tab">
            <h1>User Management</h1>
            <p>User management content goes here...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;