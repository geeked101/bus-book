import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { bookingsAPI } from '../services/api';
import './MyBookings.css';

const MyBookings = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      const result = await bookingsAPI.getUserBookings();
      if (result.success) {
        setBookings(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    };

    fetchBookings();
  }, []);

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#27ae60';
      case 'pending': return '#f39c12';
      case 'cancelled': return '#e74c3c';
      default: return '#7f8c8d';
    }
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Helper function to generate barcode-like text
  const generateBarcodeText = (bookingId) => {
    return `|| ${bookingId} || ${Date.now().toString(36).toUpperCase()} ||`;
  };

  const handleViewTicket = (booking) => {
    console.log('View ticket for booking:', booking);
    setSelectedBooking(booking);
    setShowTicketModal(true);
  };

  const handleCancelBooking = async (booking) => {
    console.log('Cancel booking:', booking);
    
    if (booking.status === 'cancelled') {
      alert('This booking is already cancelled.');
      return;
    }

    const confirmMessage = booking.status === 'confirmed' 
      ? `Cancelling this confirmed booking will incur a 20% cancellation fee. Do you want to proceed?`
      : `Are you sure you want to cancel this booking?`;

    if (window.confirm(confirmMessage)) {
      setLoading(true);
      const result = await bookingsAPI.cancelBooking(booking.id);
      if (result.success) {
        alert('Booking cancelled successfully.');
        // Refresh bookings
        const refreshResult = await bookingsAPI.getUserBookings();
        if (refreshResult.success) {
          setBookings(refreshResult.data);
        }
      } else {
        alert(result.error || 'Failed to cancel booking.');
      }
      setLoading(false);
    }
  };

  const handlePrintTicket = (booking) => {
    if (booking.status !== 'confirmed') {
      alert('You can only print tickets for confirmed bookings.');
      return;
    }

    // Create a professional HTML ticket for printing
    const ticketHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bus Ticket - ${booking.bookingId}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Roboto', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        
        .ticket-container {
            width: 100%;
            max-width: 400px;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        .ticket-header {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            padding: 20px;
            text-align: center;
        }
        
        .ticket-header h1 {
            font-size: 24px;
            margin-bottom: 5px;
            font-weight: 700;
        }
        
        .ticket-header .booking-id {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .company-info {
            background: #2c3e50;
            color: white;
            padding: 10px;
            text-align: center;
            font-size: 12px;
        }
        
        .ticket-content {
            padding: 20px;
        }
        
        .passenger-section {
            margin-bottom: 20px;
        }
        
        .section-title {
            background: #f8f9fa;
            padding: 10px;
            margin-bottom: 15px;
            border-left: 4px solid #4CAF50;
            font-weight: 600;
            color: #2c3e50;
        }
        
        .passenger-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            border: 1px solid #e9ecef;
        }
        
        .passenger-card:last-child {
            margin-bottom: 0;
        }
        
        .passenger-card h4 {
            color: #2c3e50;
            margin-bottom: 8px;
            border-bottom: 1px solid #dee2e6;
            padding-bottom: 5px;
        }
        
        .passenger-detail {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 14px;
        }
        
        .passenger-detail:last-child {
            margin-bottom: 0;
        }
        
        .detail-label {
            font-weight: 600;
            color: #495057;
        }
        
        .detail-value {
            color: #6c757d;
        }
        
        .trip-section, .payment-section {
            margin-bottom: 20px;
        }
        
        .trip-detail, .payment-detail {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 8px 0;
            border-bottom: 1px solid #f1f3f4;
        }
        
        .trip-detail:last-child, .payment-detail:last-child {
            border-bottom: none;
        }
        
        .route {
            font-size: 18px;
            font-weight: 700;
            color: #2c3e50;
            text-align: center;
            margin: 15px 0;
        }
        
        .total-amount {
            background: #e8f5e8;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            font-size: 20px;
            font-weight: 700;
            color: #27ae60;
            margin: 20px 0;
        }
        
        .barcode {
            text-align: center;
            margin: 20px 0;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .barcode-text {
            font-family: 'Courier New', monospace;
            font-size: 16px;
            letter-spacing: 3px;
            color: #2c3e50;
        }
        
        .terms {
            background: #fff3cd;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 12px;
            color: #856404;
        }
        
        .terms h4 {
            margin-bottom: 8px;
            color: #856404;
        }
        
        .terms ul {
            padding-left: 20px;
        }
        
        .terms li {
            margin-bottom: 4px;
        }
        
        .footer {
            text-align: center;
            padding: 15px;
            background: #34495e;
            color: white;
            font-size: 12px;
        }
        
        @media print {
            body {
                background: white !important;
                padding: 0 !important;
            }
            
            .ticket-container {
                box-shadow: none !important;
                max-width: none !important;
                margin: 0 !important;
            }
        }
    </style>
</head>
<body>
    <div class="ticket-container">
        <div class="ticket-header">
            <h1>BUS TICKET</h1>
            <div class="booking-id">Booking ID: ${booking.bookingId}</div>
        </div>
        
        <div class="company-info">
            Kenya Bus Booking System • support@busbooking.com • +254 700 000 000
        </div>
        
        <div class="ticket-content">
            <!-- Passenger Details -->
            <div class="passenger-section">
                <div class="section-title">PASSENGER DETAILS</div>
                ${booking.passengers.map((passenger, index) => `
                <div class="passenger-card">
                    <h4>Passenger ${index + 1}</h4>
                    <div class="passenger-detail">
                        <span class="detail-label">Full Name:</span>
                        <span class="detail-value">${passenger.name}</span>
                    </div>
                    <div class="passenger-detail">
                        <span class="detail-label">Age:</span>
                        <span class="detail-value">${passenger.age} years</span>
                    </div>
                    <div class="passenger-detail">
                        <span class="detail-label">Gender:</span>
                        <span class="detail-value">${passenger.gender.charAt(0).toUpperCase() + passenger.gender.slice(1)}</span>
                    </div>
                    <div class="passenger-detail">
                        <span class="detail-label">Seat Number:</span>
                        <span class="detail-value">${passenger.seatNumber}</span>
                    </div>
                </div>
                `).join('')}
            </div>
            
            <!-- Trip Details -->
            <div class="trip-section">
                <div class="section-title">TRIP DETAILS</div>
                <div class="route">${booking.from} → ${booking.to}</div>
                <div class="trip-detail">
                    <span class="detail-label">Bus:</span>
                    <span class="detail-value">${booking.busName} ${booking.busType ? `(${booking.busType})` : ''}</span>
                </div>
                <div class="trip-detail">
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">${formatDate(booking.date)}</span>
                </div>
                <div class="trip-detail">
                    <span class="detail-label">Departure:</span>
                    <span class="detail-value">${booking.departure}</span>
                </div>
                ${booking.arrival ? `
                <div class="trip-detail">
                    <span class="detail-label">Arrival:</span>
                    <span class="detail-value">${booking.arrival}</span>
                </div>
                ` : ''}
                <div class="trip-detail">
                    <span class="detail-label">Seats:</span>
                    <span class="detail-value">${booking.seats.join(', ')}</span>
                </div>
            </div>
            
            <!-- Barcode -->
            <div class="barcode">
                <div class="barcode-text">${generateBarcodeText(booking.bookingId)}</div>
                <div style="margin-top: 5px; font-size: 10px; color: #6c757d;">Scan at boarding</div>
            </div>
            
            <!-- Payment Details -->
            <div class="payment-section">
                <div class="section-title">PAYMENT DETAILS</div>
                <div class="payment-detail">
                    <span class="detail-label">Booking Date:</span>
                    <span class="detail-value">${formatDate(booking.bookingDate)}</span>
                </div>
                <div class="payment-detail">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value" style="color: #27ae60; font-weight: 600;">${booking.status.toUpperCase()}</span>
                </div>
                <div class="total-amount">
                    Total Amount: KSh ${booking.totalPrice}
                </div>
            </div>
            
            <!-- Terms and Conditions -->
            <div class="terms">
                <h4>📋 TERMS & CONDITIONS</h4>
                <ul>
                    <li>Please arrive at the bus station 30 minutes before departure time</li>
                    <li>Carry a valid government-issued ID for verification</li>
                    <li>Boarding gates close 10 minutes before departure</li>
                    <li>Tickets are non-transferable and non-refundable</li>
                    <li>Luggage limit: 20kg per passenger</li>
                    <li>Smoking and alcohol consumption are prohibited</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            Thank you for choosing Kenya Bus Service! 🚌<br>
            Have a safe and pleasant journey!<br>
            <em>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</em>
        </div>
    </div>
    
    <script>
        // Auto-print when the page loads
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>
    `.trim();

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(ticketHTML);
      printWindow.document.close();
    } else {
      alert('Pop-up blocker prevented ticket opening. Please allow pop-ups and try again.');
    }
  };

  const handleDownloadTicket = (booking) => {
    console.log('Download ticket for booking:', booking);
    
    if (booking.status !== 'confirmed') {
      alert('You can only download tickets for confirmed bookings.');
      return;
    }

    // Create ticket content for text file download
    const ticketContent = `
BUS BOOKING TICKET
==================

Booking ID: ${booking.bookingId}
Booking Date: ${formatDate(booking.bookingDate)}

PASSENGER DETAILS:
${booking.passengers.map((passenger, index) => `
Passenger ${index + 1}:
  Name: ${passenger.name}
  Age: ${passenger.age}
  Gender: ${passenger.gender}
  Seat: ${passenger.seatNumber}
`).join('')}

TRIP DETAILS:
Bus: ${booking.busName} ${booking.busType ? `(${booking.busType})` : ''}
Route: ${booking.from} → ${booking.to}
Date: ${formatDate(booking.date)}
Time: ${booking.departure} ${booking.arrival ? `- ${booking.arrival}` : ''}
Seats: ${booking.seats.join(', ')}

PAYMENT DETAILS:
Total Amount: KSh ${booking.totalPrice}
Status: ${booking.status.toUpperCase()}

BARCODE: ${generateBarcodeText(booking.bookingId)}

TERMS & CONDITIONS:
• Please arrive at the bus station 30 minutes before departure
• Bring a valid ID for verification
• Tickets are non-transferable

Thank you for choosing our bus service!
Safe travels! 🚌

Contact: support@busbooking.com | Phone: +254 706 249 466
Generated on ${new Date().toLocaleDateString()}
    `.trim();

    // Create a Blob and download
    const blob = new Blob([ticketContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${booking.bookingId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`Ticket downloaded successfully!\nFile: ticket-${booking.bookingId}.txt`);
  };

  const closeTicketModal = () => {
    setShowTicketModal(false);
    setSelectedBooking(null);
  };

  return (
    <div className="my-bookings-container">
      <div className="bookings-header">
        <h1>My Bookings</h1>
        <p>Manage your bus ticket bookings</p>
        {bookings.length > 0 && (
          <p className="bookings-count">You have {bookings.length} booking(s)</p>
        )}
      </div>

      {loading && !bookings.length ? (
        <div className="loading-state">
          <p>Loading your bookings...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <p style={{ color: 'red' }}>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">Retry</button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="no-bookings">
          <h2>No bookings found</h2>
          <p>You haven't made any bookings yet.</p>
          <button 
            className="browse-buses-btn"
            onClick={() => window.location.href = '/dashboard'}
          >
            Browse Buses
          </button>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.map(booking => (
            <div key={booking.id} className="booking-card">
              <div className="booking-header">
                <div className="booking-info">
                  <h3>{booking.busName} {booking.busType && `(${booking.busType})`}</h3>
                  <div className="route">
                    {booking.from} → {booking.to}
                  </div>
                  <div className="booking-details">
                    <span><strong>Date:</strong> {formatDate(booking.date)}</span>
                    <span><strong>Time:</strong> {booking.departure}</span>
                    <span><strong>Seats:</strong> {booking.seats.join(', ')}</span>
                    <span><strong>Booking ID:</strong> {booking.bookingId}</span>
                    <span><strong>Passengers:</strong> {booking.passengers.length}</span>
                  </div>
                </div>
                <div className="booking-status">
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(booking.status) }}
                  >
                    {booking.status.toUpperCase()}
                  </span>
                  <div className="booking-price">
                    KSh {booking.totalPrice}
                  </div>
                </div>
              </div>
              <div className="booking-actions">
                <button 
                  className="action-btn view" 
                  onClick={() => handleViewTicket(booking)}
                >
                  View Ticket
                </button>
                <button 
                  className="action-btn cancel" 
                  onClick={() => handleCancelBooking(booking)}
                  disabled={booking.status === 'cancelled' || loading}
                >
                  {booking.status === 'cancelled' ? 'Cancelled' : 'Cancel Booking'}
                </button>
                <button 
                  className="action-btn download" 
                  onClick={() => handleDownloadTicket(booking)}
                  disabled={booking.status !== 'confirmed'}
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket Modal */}
      {showTicketModal && selectedBooking && (
        <div className="modal-overlay" onClick={closeTicketModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Bus Ticket</h2>
              <button className="close-btn" onClick={closeTicketModal}>×</button>
            </div>
            <div className="ticket-content">
              <div className="ticket-header">
                <h3>BUS BOOKING TICKET</h3>
                <div className="booking-id">Booking ID: {selectedBooking.bookingId}</div>
              </div>
              
              <div className="ticket-section">
                <h4>Passenger Details</h4>
                {selectedBooking.passengers && selectedBooking.passengers.map((passenger, index) => (
                  <div key={index} className="passenger-detail">
                    <p><strong>Passenger {index + 1}:</strong></p>
                    <p><strong>Name:</strong> {passenger.name}</p>
                    <p><strong>Age:</strong> {passenger.age}</p>
                    <p><strong>Gender:</strong> {passenger.gender}</p>
                    <p><strong>Seat Number:</strong> {passenger.seatNumber}</p>
                    {index < selectedBooking.passengers.length - 1 && <hr />}
                  </div>
                ))}
              </div>

              <div className="ticket-section">
                <h4>Trip Details</h4>
                <p><strong>Bus:</strong> {selectedBooking.busName} {selectedBooking.busType && `(${selectedBooking.busType})`}</p>
                <p><strong>Route:</strong> {selectedBooking.from} → {selectedBooking.to}</p>
                <p><strong>Date:</strong> {formatDate(selectedBooking.date)}</p>
                <p><strong>Time:</strong> {selectedBooking.departure} {selectedBooking.arrival && `- ${selectedBooking.arrival}`}</p>
                <p><strong>Seats:</strong> {selectedBooking.seats.join(', ')}</p>
              </div>

              <div className="ticket-section">
                <h4>Payment Details</h4>
                <p><strong>Total Amount:</strong> KSh {selectedBooking.totalPrice}</p>
                <p><strong>Status:</strong> 
                  <span className={`status status-${selectedBooking.status}`}>
                    {selectedBooking.status.toUpperCase()}
                  </span>
                </p>
                <p><strong>Booking Date:</strong> {formatDate(selectedBooking.bookingDate)}</p>
              </div>

              <div className="ticket-footer">
                <p><strong>Terms & Conditions:</strong></p>
                <p>• Please arrive at the bus station 30 minutes before departure</p>
                <p>• Bring a valid ID for verification</p>
                <p>• Tickets are non-transferable</p>
                <p style={{marginTop: '1rem'}}>Thank you for choosing our bus service! Safe travels! 🚌</p>
              </div>
            </div>
            <div className="modal-actions">
              <button 
                className="print-ticket-btn"
                onClick={() => handlePrintTicket(selectedBooking)}
                disabled={selectedBooking.status !== 'confirmed'}
              >
                🖨️ Print Ticket
              </button>
              <button 
                className="download-ticket-btn"
                onClick={() => handleDownloadTicket(selectedBooking)}
                disabled={selectedBooking.status !== 'confirmed'}
              >
                💾 Download
              </button>
              <button className="close-modal-btn" onClick={closeTicketModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;