// import React, { useContext } from 'react';
// import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import { AuthContext } from './context/AuthContext';
// import Login from './pages/Login';
// import Admin from './pages/Admin';
// import CEO from './pages/CEO';
// import HOD from './pages/HOD';
// import Employee from './pages/Employee';

// function App() {
//   const { user, loading } = useContext(AuthContext);

//   if (loading) return <div>Loading...</div>;

//   return (
//     <Router>
//       <Routes>
        
//         <Route path="/login" element={<Login />} />
//          <Route
//           path="/admin/*"
//           element={user && user.loginType === 'Admin' ? <Admin /> : <Navigate to="/login" />}
//         />
//         <Route
//           path="/ceo/*"
//           element={user && user.loginType === 'CEO' ? <CEO /> : <Navigate to="/login" />}
//         />
//         <Route
//           path="/hod/*"
//           element={user && user.loginType === 'HOD' ? <HOD /> : <Navigate to="/login" />}
//         />
//         <Route
//           path="/employee/*"
//           element={user && user.loginType === 'Employee' ? <Employee /> : <Navigate to="/login" />}
//         />
//         <Route path="/" element={<Navigate to="/login" />} />
//       </Routes> 
//     </Router>
//   );
// }

// export default App;