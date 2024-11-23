import React, { useState, useEffect } from 'react';
import LandingPage from './LandingPage';
import MainApp from './MainApp';

function App() {
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  useEffect(() => {
    const isEmailSubmitted = localStorage.getItem('emailSubmitted') === 'true';
    setEmailSubmitted(isEmailSubmitted);
  }, []);

  const handleEmailSubmit = (email) => {
    console.log('用户邮箱:', email);
    setEmailSubmitted(true);
    localStorage.setItem('emailSubmitted', 'true');
  };

  return (
    <div>
      {emailSubmitted ? <MainApp /> : <LandingPage onEmailSubmit={handleEmailSubmit} />}
    </div>
  );
}

export default App;