import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Home.css';

const Home = () => {
  const { user, logout } = useAuth(); // ✅ make sure logout (or your logout function name) is extracted

  const handleLogout = () => {
    logout(); // ✅ call logout function from context
  };

  return (
    <div className="home-container">

      {/* ✅ FIXED: Remove comment inside JSX or wrap it properly */}
      <nav className="home-nav">
        <div className="nav-brand">BusBooking</div>
        <div className="nav-links">
          {user ? (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <button onClick={handleLogout} className="nav-link logout">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-link register">Register</Link>
            </>
          )}
        </div>
      </nav>

      <header className="home-hero">
        <div className="hero-content">
          <h1>Travel Across Kenya with Ease</h1>
          <p>Book bus tickets to major destinations across the country. Fast, reliable, and affordable.</p>
          <Link to="/searchbuses" className="cta-button">Book Your Journey</Link>
        </div>
      </header>

      <section className="features-section">
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🚌</div>
            <h3>Wide Bus Selection</h3>
            <p>Choose from various bus types including Standard, Luxury, and Executive coaches.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3>Best Prices</h3>
            <p>Competitive pricing with no hidden charges. Get the best value for your money.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎫</div>
            <h3>Easy Booking</h3>
            <p>Simple and intuitive booking process. Get your tickets in minutes.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Secure Payment</h3>
            <p>Your payments are safe and secure with our encrypted payment system.</p>
          </div>
        </div>
      </section>

      <section className="popular-routes">
        <h2>Popular Routes</h2>
        <div className="routes-grid">
          <div className="route-card">
            <h4>Nairobi → Mombasa</h4>
            <p>From KSh 800</p>
          </div>
          <div className="route-card">
            <h4>Nairobi → Kisumu</h4>
            <p>From KSh 600</p>
          </div>
          <div className="route-card">
            <h4>Nairobi → Nakuru</h4>
            <p>From KSh 400</p>
          </div>
          <div className="route-card">
            <h4>Mombasa → Nairobi</h4>
            <p>From KSh 800</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
