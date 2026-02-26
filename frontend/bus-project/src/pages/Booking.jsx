import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { bookingsAPI } from '../services/api';
import './Booking.css';

const Booking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { bus, selectedSeats, totalPrice } = location.state || {};

  const [passengerDetails, setPassengerDetails] = useState(
    selectedSeats?.map((seat, index) => ({ 
      name: '', 
      age: '', 
      gender: '',
      seatNumber: seat 
    })) || []
  );

  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [loading, setLoading] = useState(false);

  if (!bus || !selectedSeats) {
    return (
      <div className="booking-container">
        <div className="error-message">
          <h2>Invalid Booking</h2>
          <p>Please go back and select seats first.</p>
          <button onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
        </div>
      </div>
    );
  }

  const handlePassengerChange = (index, field, value) => {
    const updatedDetails = [...passengerDetails];
    updatedDetails[index][field] = value;
    setPassengerDetails(updatedDetails);
  };

  const generateBookingId = () => {
    return 'BK' + Date.now().toString().slice(-6);
  };

  const handleConfirmBooking = async () => {
    console.log('Confirming booking...'); // Debug log
    
    // Validate passenger details
    const isValid = passengerDetails.every(passenger => 
      passenger.name && passenger.age && passenger.gender
    );

    if (!isValid) {
      alert('Please fill all passenger details');
      return;
    }

    setLoading(true);

    try {
      // Create individual bookings for each selected seat
      const bookingPromises = selectedSeats.map((seatNumber, index) => {
        const passenger = passengerDetails[index];
        return bookingsAPI.createBooking({
          bus_id: bus.id,
          seat_number: seatNumber.toString(),
          travel_date: bus.date,
          passenger: {
            name: passenger.name,
            age: passenger.age.toString(),
            gender: passenger.gender
          }
        });
      });

      const results = await Promise.all(bookingPromises);
      const failed = results.filter(r => !r.success);

      if (failed.length > 0) {
        throw new Error(failed[0].error || 'Some bookings failed');
      }
      
      // Create a local record for display (optional, but keep it for UI consistency)
      const bookingRecord = {
        id: Date.now(),
        busName: bus.name,
        from: bus.from,
        to: bus.to,
        date: bus.date,
        departure: bus.departure,
        arrival: bus.arrival,
        seats: selectedSeats,
        totalPrice: totalPrice,
        status: "confirmed",
        passengers: passengerDetails,
        bookingDate: new Date().toISOString().split('T')[0],
        bookingId: generateBookingId(),
        busType: bus.type
      };

      console.log('Bookings created in DB and local record:', bookingRecord);
      
      // Show success message
      alert(`Booking confirmed! 🎉\n\nYour booking for ${selectedSeats.length} seat(s) on ${bus.name} has been confirmed.\nTotal: KSh ${totalPrice}\n\nYou will be redirected to your bookings.`);
      
      // Navigate to my bookings page
      navigate('/my-bookings', { state: { newBooking: bookingRecord } });
    } catch (error) {
      alert(error.message || 'Booking failed. Please try again.');
      console.error('Booking error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="booking-container">
      <div className="booking-header">
        <h1>Confirm Your Booking</h1><br></br>
        <p>Review your trip details and complete the booking</p>
      </div>

      <div className="booking-content">
        <div className="trip-summary">
          <h2>Trip Summary</h2>
          <div className="trip-details">
            <div className="detail-item">
              <span>Bus:</span>
              <span>{bus.name} - {bus.type}</span>
            </div>
            <div className="detail-item">
              <span>Route:</span>
              <span>{bus.from} → {bus.to}</span>
            </div>
            <div className="detail-item">
              <span>Date & Time:</span>
              <span>{bus.date} | {bus.departure}</span>
            </div>
            <div className="detail-item">
              <span>Selected Seats:</span>
              <span>{selectedSeats.join(', ')}</span>
            </div>
            <div className="detail-item total">
              <span>Total Amount:</span>
              <span>KSh {totalPrice}</span>
            </div>
          </div>
        </div>

        <div className="passenger-details">
          <h2>Passenger Details</h2>
          {passengerDetails.map((passenger, index) => (
            <div key={index} className="passenger-form">
              <h4>Passenger {index + 1} (Seat {passenger.seatNumber})</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={passenger.name}
                    onChange={(e) => handlePassengerChange(index, 'name', e.target.value)}
                    placeholder="Enter full name"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label>Age *</label>
                  <input
                    type="number"
                    value={passenger.age}
                    onChange={(e) => handlePassengerChange(index, 'age', e.target.value)}
                    placeholder="Age"
                    min="1"
                    max="100"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label>Gender *</label>
                  <select
                    value={passenger.gender}
                    onChange={(e) => handlePassengerChange(index, 'gender', e.target.value)}
                    required
                    disabled={loading}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="payment-section">
          <h2>Payment Method</h2>
          <div className="payment-options">
            <label className="payment-option">
              <input
                type="radio"
                name="payment"
                value="mpesa"
                checked={paymentMethod === 'mpesa'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={loading}
              />
              <span>M-Pesa</span>
            </label>
            <label className="payment-option">
              <input
                type="radio"
                name="payment"
                value="card"
                checked={paymentMethod === 'card'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={loading}
              />
              <span>Credit/Debit Card</span>
            </label>
            <label className="payment-option">
              <input
                type="radio"
                name="payment"
                value="cash"
                checked={paymentMethod === 'cash'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={loading}
              />
              <span>Cash Payment</span>
            </label>
          </div>
        </div>

        <button 
          className="confirm-booking-btn" 
          onClick={handleConfirmBooking}
          disabled={loading}
        >
          {loading ? 'Processing Booking...' : `Confirm Booking - KSh ${totalPrice}`}
        </button>
      </div>
    </div>
  );
};

export default Booking;