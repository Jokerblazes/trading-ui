import React, { useState } from 'react';

function LandingPage({ onEmailSubmit }) {
  const [email, setEmail] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (email) {
      onEmailSubmit(email);
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
    </div>
  );
}

export default LandingPage;