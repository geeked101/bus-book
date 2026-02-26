import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { busesAPI } from '../services/api';
import './BusSeats.css';

const BusSeats = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Get bus data from navigation state or use default
  const bus = location.state?.bus || {
    id: 1,
    name: "Express One",
    type: "Standard",
    from: "Nairobi",
    to: "Mombasa",
    date: new Date().toISOString().split('T')[0],
    departure: "08:00 AM",
    arrival: "02:00 PM",
    price: 800,
    seats: 40
  };

  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);

  useEffect(() => {
    const fetchSeats = async () => {
      if (!bus.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const result = await busesAPI.getBusSeats(bus.id, bus.date);
      if (result.success) {
        setSeats(result.data.seats.map(s => ({
          number: s.seat_number,
          available: s.is_available,
          type: parseInt(s.seat_number) <= 20 ? 'premium' : 'standard'
        })));
      } else {
        setError(result.error);
      }
      setLoading(false);
    };

    fetchSeats();
  }, [bus.id, bus.date]);

  const toggleSeatSelection = (seatNumber) => {
    const seat = seats.find(s => s.number === seatNumber);
    if (!seat.available) return;

    if (selectedSeats.includes(seatNumber)) {
      setSelectedSeats(selectedSeats.filter(seat => seat !== seatNumber));
    } else {
      if (selectedSeats.length < 4) { // Limit to 4 seats per booking
        setSelectedSeats([...selectedSeats, seatNumber]);
      } else {
        alert('You can select up to 4 seats per booking');
      }
    }
  };

  const handleProceedToBooking = () => {
    console.log('Proceeding to booking with seats:', selectedSeats); // Debug log
    
    if (!user) {
      alert('Please login to continue booking');
      navigate('/login');
      return;
    }
    
    if (selectedSeats.length === 0) {
      alert('Please select at least one seat');
      return;
    }

    // Navigate to booking page with all necessary data
    navigate('/booking', { 
      state: { 
        bus: bus,
        selectedSeats: selectedSeats,
        totalPrice: selectedSeats.length * bus.price
      } 
    });
  };

  return (
    <div className="bus-seats-container">
      <div className="bus-info">
        <h2>{bus.name} - {bus.type}</h2>
        <div className="route-info">
          <span><strong>Route:</strong> {bus.from} → {bus.to}</span>
          <span><strong>Date:</strong> {bus.date} | <strong>Time:</strong> {bus.departure} - {bus.arrival}</span>
          <span><strong>Price:</strong> KSh {bus.price} per seat</span>
        </div>
      </div>

      <div className="seats-container">
        <h3>Select Your Seats ({selectedSeats.length} selected)</h3>
        <div className="bus-layout">
          <div className="driver-section">Driver</div>
          <div className="seats-grid">
            {loading ? (
              <p>Loading seats...</p>
            ) : error ? (
              <p style={{ color: 'red' }}>{error}</p>
            ) : (
              seats.map(seat => (
                <div
                  key={seat.number}
                  className={`seat ${!seat.available ? 'occupied' : ''} ${
                    selectedSeats.includes(seat.number) ? 'selected' : ''
                  } ${seat.type}`}
                  onClick={() => seat.available && toggleSeatSelection(seat.number)}
                >
                  {seat.number}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="seats-legend">
          <div className="legend-item">
            <div className="legend-color available"></div>
            <span>Available</span>
          </div>
          <div className="legend-item">
            <div className="legend-color selected"></div>
            <span>Selected</span>
          </div>
          <div className="legend-item">
            <div className="legend-color occupied"></div>
            <span>Occupied</span>
          </div>
          <div className="legend-item">
            <div className="legend-color premium"></div>
            <span>Premium</span>
          </div>
        </div>
      </div>

      <div className="booking-summary">
        <h3>Booking Summary</h3>
        <div className="summary-details">
          <p><strong>Selected Seats:</strong> {selectedSeats.join(', ') || 'None'}</p>
          <p><strong>Total Seats:</strong> {selectedSeats.length}</p>
          <p><strong>Price per Seat:</strong> KSh {bus.price}</p>
          <p className="total-price"><strong>Total Amount:</strong> KSh {selectedSeats.length * bus.price}</p>
        </div>
        <button 
          className="proceed-btn"
          onClick={handleProceedToBooking}
          disabled={selectedSeats.length === 0}
        >
          {selectedSeats.length === 0 ? 'Select Seats to Continue' : `Proceed to Booking - KSh ${selectedSeats.length * bus.price}`}
        </button>
      </div>
    </div>
  );
};

export default BusSeats;