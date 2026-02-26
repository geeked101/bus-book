import React, { useState, useEffect } from 'react';
import { testBackendConnection } from '../services/api';

const ConnectionTest = () => {
  const [status, setStatus] = useState('testing');
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState('');

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    setStatus('testing');
    setMessage('Testing backend connection...');
    setDetails('');
    
    console.log('🧪 Starting connection test...');
    
    const result = await testBackendConnection();
    
    console.log('🧪 Connection test result:', result);
    
    if (result.success) {
      setStatus('connected');
      setMessage(result.message);
      setDetails(`Endpoint: ${result.endpoint}`);
    } else {
      setStatus('error');
      setMessage(result.error);
      setDetails(result.details);
    }
  };

  return (
    <div style={{
      padding: '20px',
      margin: '20px',
      border: `3px solid ${
        status === 'connected' ? '#28a745' : 
        status === 'error' ? '#dc3545' : 
        '#ffc107'
      }`,
      borderRadius: '8px',
      backgroundColor: '#f8f9fa'
    }}>
      <h3>🔌 Backend Connection Status</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>Status: </strong>
        <span style={{
          color: status === 'connected' ? '#28a745' : 
                 status === 'error' ? '#dc3545' : 
                 '#ffc107',
          fontWeight: 'bold'
        }}>
          {status.toUpperCase()}
        </span>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>Message: </strong>
        {message}
      </div>
      
      {details && (
        <div style={{ marginBottom: '15px' }}>
          <strong>Details: </strong>
          <code style={{ 
            backgroundColor: '#e9ecef', 
            padding: '2px 6px', 
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            {details}
          </code>
        </div>
      )}
      
      <button 
        onClick={testConnection}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        🔄 Test Connection Again
      </button>
      
      {status === 'error' && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '4px'
        }}>
          <h4>🚨 Troubleshooting Steps:</h4>
          <ol style={{ textAlign: 'left', marginLeft: '20px' }}>
            <li>
              <strong>Start the backend:</strong><br/>
              <code style={{ backgroundColor: '#f1f3f4', padding: '2px 4px' }}>
                cd backend/booking-project && cargo run
              </code>
            </li>
            <li>
              <strong>Wait for this message:</strong><br/>
              <code style={{ backgroundColor: '#f1f3f4', padding: '2px 4px' }}>
                Starting server on http://127.0.0.1:8080
              </code>
            </li>
            <li>
              <strong>Test manually in browser:</strong><br/>
              Visit: <a href="http://localhost:8080/api/health" target="_blank" rel="noopener noreferrer">
                http://localhost:8080/api/health
              </a>
            </li>
            <li>
              <strong>Check ports:</strong> Frontend runs on 3000, Backend on 8080
            </li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default ConnectionTest;