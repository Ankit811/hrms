// import React, { useContext, useState } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { useNavigate, useLocation } from 'react-router-dom';
// import { Button } from '../components/ui/button';
// import { LayoutDashboard, Users, FileText, Calendar, BarChart, LogOut, Menu } from 'lucide-react';
// import { AuthContext } from '../context/AuthContext';
// import { cn } from '../components/lib/utils';

// function Sidebar() {
//   const { user, logout } = useContext(AuthContext);
//   const navigate = useNavigate();
//   const location = useLocation();
//   const [isCollapsed, setIsCollapsed] = useState(false);

//   const menuItems = {
//     Admin: [
//       { text: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, path: '/admin/dashboard' },
//       { text: 'Profile', icon: <Users className="h-5 w-5" />, path: '/admin/profile' },
//       { text: 'Employees', icon: <Users className="h-5 w-5" />, path: '/admin/employees' },
//       { text: 'Add Employee', icon: <FileText className="h-5 w-5" />, path: '/admin/add-employee' },
//       { text: 'Attendance', icon: <Calendar className="h-5 w-5" />, path: '/admin/attendance' },
//       { text: 'Apply Leave', icon: <FileText className="h-5 w-5" />, path: '/admin/leave' },
//       { text: 'Approve Leave', icon: <FileText className="h-5 w-5" />, path: '/admin/approve-leave' },
//       { text: 'Reports', icon: <BarChart className="h-5 w-5" />, path: '/admin/reports' },
//     ],
//     CEO: [
//       { text: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, path: '/ceo/dashboard' },
//       { text: 'Profile', icon: <Users className="h-5 w-5" />, path: '/ceo/profile' },
//       { text: 'Employees', icon: <Users className="h-5 w-5" />, path: '/ceo/employees' },
//       { text: 'Approve Leaves', icon: <FileText className="h-5 w-5" />, path: '/ceo/approve-leaves' },
//     ],
//     HOD: [
//       { text: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, path: '/hod/dashboard' },
//       { text: 'Profile', icon: <Users className="h-5 w-5" />, path: '/hod/profile' },
//       { text: 'Employees', icon: <Users className="h-5 w-5" />, path: '/hod/employees' },
//       { text: 'Apply Leave', icon: <FileText className="h-5 w-5" />, path: '/hod/leave' },
//       { text: 'Approve Leave', icon: <FileText className="h-5 w-5" />, path: '/hod/approve-leave' },
//     ],
//     Employee: [
//       { text: 'Profile', icon: <Users className="h-5 w-5" />, path: '/employee/profile' },
//       { text: 'Apply Leave', icon: <FileText className="h-5 w-5" />, path: '/employee/leave' },
//     ],
//   };

//   const handleNavigation = (path) => {
//     navigate(path);
//   };

//   const toggleSidebar = () => {
//     setIsCollapsed(!isCollapsed);
//   };

//   return (
//     <motion.aside
//       initial={{ width: isCollapsed ? 64 : 240 }}
//       animate={{ width: isCollapsed ? 64 : 240 }}
//       transition={{ type: 'spring', stiffness: 100 }}
//       className="fixed top-16 left-0 h-[calc(100vh-64px)] bg-white shadow-lg z-40"
//     >
//       <div className="flex justify-center md:justify-end p-4">
//         <Button variant="ghost" size="icon" onClick={toggleSidebar}>
//           <Menu className="h-6 w-6 text-gray-700" />
//         </Button>
//       </div>
//       <nav className="px-2">
//         {user &&
//           menuItems[user.loginType]?.map((item, index) => (
//             <motion.div
//               key={index}
//               whileHover={{ scale: 1.05 }}
//               whileTap={{ scale: 0.95 }}
//               className={cn(
//                 'flex items-center p-2 rounded-lg mb-1 cursor-pointer',
//                 location.pathname === item.path ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
//               )}
//               onClick={() => handleNavigation(item.path)}
//             >
//               <span className="mr-3">{item.icon}</span>
//               <AnimatePresence>
//                 {!isCollapsed && (
//                   <motion.span
//                     initial={{ opacity: 0, width: 0 }}
//                     animate={{ opacity: 1, width: 'auto' }}
//                     exit={{ opacity: 0, width: 0 }}
//                     className="text-sm font-medium"
//                   >
//                     {item.text}
//                   </motion.span>
//                 )}
//               </AnimatePresence>
//             </motion.div>
//           ))}
//         <div className="my-4 border-t border-gray-200" />
//         <motion.div
//           whileHover={{ scale: 1.05 }}
//           whileTap={{ scale: 0.95 }}
//           className="flex items-center p-2 rounded-lg cursor-pointer text-gray-700 hover:bg-gray-100"
//           onClick={() => {
//             logout();
//             navigate('/login');
//           }}
//         >
//           <LogOut className="h-5 w-5 mr-3" />
//           <AnimatePresence>
//             {!isCollapsed && (
//               <motion.span
//                 initial={{ opacity: 0, width: 0 }}
//                 animate={{ opacity: 1, width: 'auto' }}
//                 exit={{ opacity: 0, width: 0 }}
//                 className="text-sm font-medium"
//               >
//                 Logout
//               </motion.span>
//             )}
//           </AnimatePresence>
//         </motion.div>
//       </nav>
//     </motion.aside>
//   );
// }

// export default Sidebar;
