import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { busesAPI } from '../services/api';
import './dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredBuses, setFilteredBuses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBuses = async () => {
      setLoading(true);
      const result = await busesAPI.getBuses();
      if (result.success) {
        // Map backend fields to frontend UI fields
        const mappedBuses = result.data.map(bus => ({
          id: bus._id?.$oid || bus._id || bus.id,
          name: bus.bus_number,
          destination: bus.route.to,
          from: bus.route.from,
          to: bus.route.to,
          price: bus.route.price,
          departure: bus.route.departure_time,
          seats: bus.total_seats,
          type: bus.bus_type,
          date: new Date().toISOString().split('T')[0] // Default to today
        }));
        setBuses(mappedBuses);
        setFilteredBuses(mappedBuses);
      } else {
        setError(result.error);
      }
      setLoading(false);
    };

    fetchBuses();
  }, []);

  useEffect(() => {
    const filtered = buses.filter(bus =>
      bus.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bus.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredBuses(filtered);
  }, [searchTerm, buses]);

  const handleBookTicket = (bus) => {
    console.log('Book ticket clicked for bus:', bus); // Debug log
    
    if (!user) {
      alert('Please login to book tickets');
      navigate('/login');
      return;
    }

    // Navigate to bus seats page with bus information
    navigate('/bus-seats', { 
      state: { 
        bus: bus,
        searchParams: {
          from: bus.from,
          to: bus.to,
          date: bus.date,
          passengers: 1
        }
      }
    });
  };

  const handleLogout = () => {
    console.log('Logout button clicked');
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Burudani Mint Travels</h1>
          <div className="user-info">
            <span>Welcome, {user?.name || user?.email || 'User'}!</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Search Section */}
      <section className="search-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by destination or bus name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button className="search-btn">Search</button>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Available Buses</h3>
            <p className="stat-number">{buses.length}</p>
          </div>
          <div className="stat-card">
            <h3>Destinations</h3>
            <p className="stat-number">{[...new Set(buses.map(bus => bus.destination))].length}</p>
          </div>
          <div className="stat-card">
            <h3>Lowest Price</h3>
            <p className="stat-number">KSh {buses.length > 0 ? Math.min(...buses.map(bus => bus.price)) : 0}</p>
          </div>
          <div className="stat-card">
            <h3>Highest Price</h3>
            <p className="stat-number">KSh {buses.length > 0 ? Math.max(...buses.map(bus => bus.price)) : 0}</p>
          </div>
        </div>
      </section>

      {/* Buses List Section */}
      <section className="buses-section">
        <h2>Available Buses</h2>
        <div className="buses-grid">
          {filteredBuses.map(bus => (
            <div key={bus.id} className="bus-card">
              <div className="bus-header">
                <h3>{bus.name}</h3>
                <span className="bus-type">{bus.type}</span>
              </div>
              <div className="bus-details">
                <div className="detail-item">
                  <span className="label">From:</span>
                  <span className="value">{bus.from}</span>
                </div>
                <div className="detail-item">
                  <span className="label">To:</span>
                  <span className="value">{bus.to}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Departure:</span>
                  <span className="value">{bus.departure}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Total Seats:</span>
                  <span className="value">{bus.seats}</span>
                </div>
                <div className="detail-item price">
                  <span className="label">Price:</span>
                  <span className="value">KSh {bus.price}</span>
                </div>
              </div>
              <button 
                onClick={() => handleBookTicket(bus)}
                className="book-btn"
              >
                Book Ticket
              </button>
            </div>
          ))}
        </div>
        {loading && (
          <div className="loading-state">
            <p>Loading available buses...</p>
          </div>
        )}
        {error && (
          <div className="error-state" style={{ color: 'red', padding: '20px', textAlign: 'center' }}>
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="retry-btn">Retry</button>
          </div>
        )}
        {!loading && !error && filteredBuses.length === 0 && (
          <div className="no-buses">
            <p>No buses found matching your search.</p>
          </div>
        )}
      </section>

      <footer className="dashboard-footer">
        <p>&copy; 2025 Burudani Mint Travels. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Dashboard;