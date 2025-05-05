// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1>Vite + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.jsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>
//     </>
//   )
// }

// export default App

import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Admin from './pages/Admin';
import CEO from './pages/CEO';
import HOD from './pages/HOD';
import Employee from './pages/Employee';

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <Routes>
        
        <Route path="/login" element={<Login />} />
         <Route
          path="/admin/*"
          element={user && user.loginType === 'Admin' ? <Admin /> : <Navigate to="/login" />}
        />
        <Route
          path="/ceo/*"
          element={user && user.loginType === 'CEO' ? <CEO /> : <Navigate to="/login" />}
        />
        <Route
          path="/hod/*"
          element={user && user.loginType === 'HOD' ? <HOD /> : <Navigate to="/login" />}
        />
        <Route
          path="/employee/*"
          element={user && user.loginType === 'Employee' ? <Employee /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes> 
    </Router>
  );
}

export default App;