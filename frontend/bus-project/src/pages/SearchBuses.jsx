import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchBuses.css';

const SearchBuses = () => {
  const navigate = useNavigate();
  const [searchData, setSearchData] = useState({
    from: '',
    to: '',
    date: '',
    passengers: 1
  });

  const cities = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi', 'Kitale'];

  const handleSearch = (e) => {
    e.preventDefault();
    // Navigate to bus list with search parameters
    navigate(`/bus-seats?from=${searchData.from}&to=${searchData.to}&date=${searchData.date}&passengers=${searchData.passengers}`);
  };

  return (
    <div className="search-buses-container">
      <div className="search-hero">
        <h1>Find Your Perfect Bus</h1>
        <p>Search and compare buses across Kenya</p>
      </div>

      <div className="search-form-container">
        <form className="search-form" onSubmit={handleSearch}>
          <div className="form-row">
            <div className="form-group">
              <label>From</label>
              <select 
                value={searchData.from}
                onChange={(e) => setSearchData({...searchData, from: e.target.value})}
                required
              >
                <option value="">Select departure city</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>To</label>
              <select 
                value={searchData.to}
                onChange={(e) => setSearchData({...searchData, to: e.target.value})}
                required
              >
                <option value="">Select destination city</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Travel Date</label>
              <input 
                type="date" 
                value={searchData.date}
                onChange={(e) => setSearchData({...searchData, date: e.target.value})}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label>Passengers</label>
              <select 
                value={searchData.passengers}
                onChange={(e) => setSearchData({...searchData, passengers: parseInt(e.target.value)})}
              >
                {[1,2,3,4,5].map(num => (
                  <option key={num} value={num}>{num} {num === 1 ? 'Passenger' : 'Passengers'}</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="search-btn">Search Buses</button>
        </form>
      </div>
    </div>
  );
};

export default SearchBuses;