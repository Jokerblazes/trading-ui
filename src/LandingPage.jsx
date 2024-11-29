import React, { useState } from 'react';

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
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Welcome to HK Trading</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Please enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '10px', width: '300px' }}
        />
        <button type="submit" style={{ padding: '10px 20px', marginLeft: '10px' }}>
          Enter
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default LandingPage;