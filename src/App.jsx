import React, { useState } from 'react';
import LandingPage from './LandingPage'; // 假设 LandingPage 在同一目录下
import MainApp from './MainApp'; // 这是你现有的应用组件

function App() {
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  const handleEmailSubmit = (email) => {
    console.log('用户邮箱:', email);
    setEmailSubmitted(true);
  };

  return (
    <div>
      {emailSubmitted ? <MainApp /> : <LandingPage onEmailSubmit={handleEmailSubmit} />}
    </div>
  );
}

export default App;