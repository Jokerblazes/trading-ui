import React, { useState } from 'react';
import './LandingPage.css';

function LandingPage({ onEmailSubmit }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (email) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 'email': email }),
        });

        if (response.ok || response.status === 200) {
          onEmailSubmit(email);
        } else {
          throw new Error('Failed to store email');
        }
      } catch (err) {
        setError('Failed to store email, please try again later.');
        console.error(err);
      }
    }
  };

  return (
    <div className="landing-container">
      <div className="content-box">
        <h1 className="title">Welcome to HK Trading</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Please enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="email-input"
          />
          <button 
            type="submit" 
            className="submit-button"
          >
            Enter
          </button>
        </form>
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
}

export default LandingPage;