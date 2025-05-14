import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Notification from "./pages/Notification";
import Settings from "./pages/Settings";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/notification" element={<Notification />} />
        <Route path="/settings" element={<Settings />}/>
      </Routes>
    </Router>
  );
}

export default App;

// import React, { useState } from 'react';
// import { 
//   LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer
// } from 'recharts';
// import { Search, Bell, Settings, Check, X, AlertTriangle } from 'lucide-react';

// export default function Dashboard() {
//   // Weekly revenue data
//   const weeklyRevenueData = [
//     { name: '17', value1: 120, value2: 80, value3: 40 },
//     { name: '18', value1: 100, value2: 90, value3: 30 },
//     { name: '19', value1: 140, value2: 100, value3: 50 },
//     { name: '20', value1: 130, value2: 85, value3: 45 },
//     { name: '21', value1: 110, value2: 75, value3: 35 },
//     { name: '22', value1: 150, value2: 90, value3: 60 },
//     { name: '23', value1: 125, value2: 95, value3: 30 },
//     { name: '24', value1: 145, value2: 100, value3: 45 },
//     { name: '25', value1: 135, value2: 90, value3: 55 },
//   ];

//   // Line chart data
//   const lineChartData = [
//     { name: 'SEP', value1: 210, value2: 150 },
//     { name: 'OCT', value1: 270, value2: 200 },
//     { name: 'NOV', value1: 200, value2: 170 },
//     { name: 'DEC', value1: 350, value2: 250 },
//     { name: 'JAN', value1: 300, value2: 220 },
//     { name: 'FEB', value1: 320, value2: 230 },
//   ];

//   // Pie chart data
//   const pieData = [
//     { name: 'Blue', value: 63, color: '#4318FF' },
//     { name: 'Teal', value: 25, color: '#6AD2FF' },
//     { name: 'Other', value: 12, color: '#EFF4FB' },
//   ];

//   // Daily traffic data
//   const trafficData = [
//     { name: '1', value: 20 },
//     { name: '2', value: 40 },
//     { name: '3', value: 30 },
//     { name: '4', value: 50 },
//     { name: '5', value: 40 },
//     { name: '6', value: 60 },
//     { name: '7', value: 35 },
//     { name: '8', value: 55 },
//     { name: '9', value: 45 },
//     { name: '10', value: 65 },
//   ];

//   // Table data
//   const tableData = [
//     { name: 'Horizon UI PRO', progress: 17.5, quantity: 2458, date: '24 Jan 2021', status: 'approved' },
//     { name: 'Horizon UI Free', progress: 10.8, quantity: 1485, date: '12 Jun 2021', status: 'disable' },
//     { name: 'Weekly Update', progress: 21.3, quantity: 1024, date: '5 Jan 2021', status: 'approved' },
//     { name: 'Venus 3D Asset', progress: 31.5, quantity: 858, date: '7 Mar 2021', status: 'error' },
//     { name: 'Marketplace', progress: 12.2, quantity: 258, date: '12 Dec 2021', status: '' },
//   ];

//   // Complex table data
//   const complexTableData = [
//     { name: 'Horizon UI PRO', status: 'approved', date: '18 Apr 2021', progress: 75 },
//     { name: 'Horizon UI Free', status: 'disable', date: '18 Apr 2021', progress: 25 },
//     { name: 'Marketplace', status: 'error', date: '20 May 2021', progress: 50 },
//     { name: 'Weekly Updates', status: 'approved', date: '12 Jul 2021', progress: 80 },
//   ];

//   // Tasks data
//   const tasksData = [
//     { name: 'Landing Page Design', completed: false },
//     { name: 'Dashboard Builder', completed: true },
//     { name: 'Mobile App Design', completed: true },
//     { name: 'Illustrations', completed: false },
//     { name: 'Promotional LP', completed: true },
//   ];

//   // Calendar data
//   const daysOfWeek = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
//   const calendarDays = [
//     { day: 29, month: 'prev' },
//     { day: 30, month: 'prev' },
//     { day: 31, month: 'prev' },
//     { day: 1, month: 'current' },
//     { day: 2, month: 'current' },
//     { day: 3, month: 'current' },
//     { day: 4, month: 'current' },
//     { day: 5, month: 'current' },
//     { day: 6, month: 'current' },
//     { day: 7, month: 'current' },
//     { day: 8, month: 'current' },
//     { day: 9, month: 'current' },
//     { day: 10, month: 'current' },
//     { day: 11, month: 'current' },
//     { day: 12, month: 'current' },
//     { day: 13, month: 'current' },
//     { day: 14, month: 'current' },
//     { day: 15, month: 'current' },
//     { day: 16, month: 'current' },
//     { day: 17, month: 'current' },
//     { day: 18, month: 'current' },
//     { day: 19, month: 'current' },
//     { day: 20, month: 'current' },
//     { day: 21, month: 'current' },
//     { day: 22, month: 'current' },
//     { day: 23, month: 'current' },
//     { day: 24, month: 'current' },
//     { day: 25, month: 'current' },
//     { day: 26, month: 'current' },
//     { day: 27, month: 'current', active: true },
//     { day: 28, month: 'current' },
//     { day: 29, month: 'current' },
//     { day: 30, month: 'current', active: true },
//     { day: 1, month: 'next' },
//     { day: 2, month: 'next' },
//     { day: 3, month: 'next' },
//     { day: 4, month: 'next' },
//   ];

//   return (
//     <div className="bg-gray-50 min-h-screen">
//       {/* Sidebar */}
//       <div className="fixed inset-y-0 left-0 bg-white w-48 shadow-md">
//         <div className="p-4">
//           <h1 className="text-lg font-bold text-indigo-700">HORIZON UI</h1>
//         </div>
//         <nav className="mt-4">
//           <ul>
//             <li className="px-4 py-2 flex items-center text-indigo-700 bg-gray-100">
//               <div className="mr-2">🏠</div>
//               <span>Dashboard</span>
//             </li>
//             <li className="px-4 py-2 flex items-center text-gray-500">
//               <div className="mr-2">🛒</div>
//               <span>NFT Marketplace</span>
//             </li>
//             <li className="px-4 py-2 flex items-center text-gray-500">
//               <div className="mr-2">📊</div>
//               <span>Tables</span>
//             </li>
//             <li className="px-4 py-2 flex items-center text-gray-500">
//               <div className="mr-2">👤</div>
//               <span>Profile</span>
//             </li>
//             <li className="px-4 py-2 flex items-center text-gray-500">
//               <div className="mr-2">🔐</div>
//               <span>Sign In</span>
//             </li>
//           </ul>
//         </nav>
//       </div>

//       {/* Main Content */}
//       <div className="ml-48 p-6">
//         {/* Header */}
//         <div className="flex justify-between items-center mb-6">
//           <div>
//             <div className="text-xs text-gray-500">Pages / Dashboard</div>
//             <h1 className="text-2xl font-bold text-gray-800">Main Dashboard</h1>
//           </div>
//           <div className="flex items-center space-x-4">
//             <div className="relative">
//               <input
//                 type="text"
//                 placeholder="Search"
//                 className="bg-white px-4 py-2 pl-10 rounded-lg text-sm border border-gray-100"
//               />
//               <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
//             </div>
//             <Bell className="h-5 w-5 text-gray-400" />
//             <Settings className="h-5 w-5 text-gray-400" />
//             <div className="w-8 h-8 bg-indigo-500 rounded-full overflow-hidden">
//               <img src="/api/placeholder/32/32" alt="Avatar" className="w-full h-full object-cover" />
//             </div>
//           </div>
//         </div>

//         {/* Stats Cards */}
//         <div className="grid grid-cols-4 gap-6 mb-6">
//           <div className="bg-white p-4 rounded-xl shadow-sm">
//             <div className="flex items-center justify-between mb-2">
//               <div className="text-xs text-gray-500">Earnings</div>
//               <div className="bg-indigo-100 p-2 rounded-lg">
//                 <div className="w-4 h-4 bg-indigo-500 rounded-md"></div>
//               </div>
//             </div>
//             <div className="text-2xl font-bold">$350.4</div>
//           </div>
//           <div className="bg-white p-4 rounded-xl shadow-sm">
//             <div className="flex items-center justify-between mb-2">
//               <div className="text-xs text-gray-500">Spend this month</div>
//               <div className="bg-indigo-100 p-2 rounded-lg">
//                 <div className="w-4 h-4 bg-indigo-500 rounded-md"></div>
//               </div>
//             </div>
//             <div className="text-2xl font-bold">$642.39</div>
//             <div className="text-xs text-green-500">+25% from last month</div>
//           </div>
//           <div className="bg-white p-4 rounded-xl shadow-sm">
//             <div className="flex items-center justify-between mb-2">
//               <div className="text-xs text-gray-500">Your balance</div>
//               <div className="bg-indigo-100 p-2 rounded-lg">
//                 <div className="h-4 w-6 rounded-sm flex items-center justify-center overflow-hidden">
//                   <div className="bg-blue-800 h-full w-2"></div>
//                   <div className="bg-red-500 h-full w-2"></div>
//                   <div className="bg-blue-800 h-full w-2"></div>
//                 </div>
//               </div>
//             </div>
//             <div className="text-2xl font-bold">$1,000</div>
//           </div>
//           <div className="bg-white p-4 rounded-xl shadow-sm">
//             <div className="flex items-center justify-between mb-2">
//               <div className="text-xs text-gray-500">New Tasks</div>
//               <div className="bg-blue-500 p-2 rounded-full">
//                 <Check className="h-4 w-4 text-white" />
//               </div>
//             </div>
//             <div className="text-2xl font-bold">154</div>
//           </div>
//         </div>

//         {/* Charts Row */}
//         <div className="grid grid-cols-2 gap-6 mb-6">
//           <div className="bg-white p-6 rounded-xl shadow-sm">
//             <div className="flex justify-between items-center mb-4">
//               <div>
//                 <div className="text-xs text-gray-500 mb-1">This month</div>
//                 <div className="text-2xl font-bold">$37.5K</div>
//                 <div className="flex items-center">
//                   <div className="text-xs text-gray-500">Total Spent</div>
//                   <div className="text-xs text-green-500 ml-2">+2.45%</div>
//                 </div>
//                 <div className="mt-2 flex items-center text-xs">
//                   <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
//                   <span className="text-green-500">On track</span>
//                 </div>
//               </div>
//               <div>
//                 <div className="bg-indigo-500 text-white px-2 py-1 rounded text-xs">$340.59</div>
//               </div>
//             </div>
//             <ResponsiveContainer width="100%" height={150}>
//               <LineChart data={lineChartData}>
//                 <CartesianGrid vertical={false} stroke="#eee" />
//                 <XAxis dataKey="name" axisLine={false} tickLine={false} />
//                 <Line type="monotone" dataKey="value1" stroke="#4318FF" strokeWidth={3} dot={false} />
//                 <Line type="monotone" dataKey="value2" stroke="#6AD2FF" strokeWidth={3} dot={false} />
//               </LineChart>
//             </ResponsiveContainer>
//           </div>
//           <div className="bg-white p-6 rounded-xl shadow-sm">
//             <div className="flex justify-between items-center mb-4">
//               <div className="text-md font-bold">Weekly Revenue</div>
//               <div></div>
//             </div>
//             <ResponsiveContainer width="100%" height={150}>
//               <BarChart data={weeklyRevenueData}>
//                 <XAxis dataKey="name" axisLine={false} tickLine={false} />
//                 <Bar dataKey="value1" stackId="a" fill="#4318FF" radius={[10, 10, 0, 0]} />
//                 <Bar dataKey="value2" stackId="a" fill="#6AD2FF" radius={[10, 10, 0, 0]} />
//                 <Bar dataKey="value3" stackId="a" fill="#EFF4FB" radius={[10, 10, 0, 0]} />
//               </BarChart>
//             </ResponsiveContainer>
//           </div>
//         </div>

//         {/* Tables and Charts Row */}
//         <div className="grid grid-cols-3 gap-6 mb-6">
//           {/* Check Table */}
//           <div className="bg-white rounded-xl shadow-sm col-span-1">
//             <div className="p-4 flex justify-between items-center border-b">
//               <div className="font-bold">Check Table</div>
//               <div className="text-gray-500">•••</div>
//             </div>
//             <div className="p-4">
//               <table className="w-full text-sm">
//                 <thead>
//                   <tr className="text-gray-500 uppercase text-xs">
//                     <th className="pb-3 text-left">NAME</th>
//                     <th className="pb-3 text-left">PROGRESS</th>
//                     <th className="pb-3 text-left">QUANTITY</th>
//                     <th className="pb-3 text-left">DATE</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {tableData.map((item, index) => (
//                     <tr key={index} className="border-t border-gray-100">
//                       <td className="py-3 flex items-center">
//                         <input type="checkbox" className="mr-2" checked={index % 2 === 1} />
//                         {item.name}
//                       </td>
//                       <td className="py-3">{item.progress}%</td>
//                       <td className="py-3">{item.quantity}</td>
//                       <td className="py-3">{item.date}</td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>

//           {/* Daily Traffic */}
//           <div className="bg-white rounded-xl shadow-sm">
//             <div className="p-4 border-b">
//               <div className="font-bold">Daily Traffic</div>
//               <div className="flex items-center">
//                 <div className="text-2xl font-bold">2,579</div>
//                 <div className="text-xs text-gray-500 ml-2">Visitors</div>
//               </div>
//               <div className="text-xs text-green-500">+2.45%</div>
//             </div>
//             <div className="p-4">
//               <ResponsiveContainer width="100%" height={120}>
//                 <BarChart data={trafficData} barSize={4}>
//                   <YAxis axisLine={false} tickLine={false} />
//                   <Bar dataKey="value" fill="#4318FF" radius={[10, 10, 0, 0]} />
//                 </BarChart>
//               </ResponsiveContainer>
//             </div>
//           </div>

//           {/* Pie Chart */}
//           <div className="bg-white rounded-xl shadow-sm">
//             <div className="p-4 border-b">
//               <div className="flex justify-between items-center">
//                 <div className="font-bold">Your Pie Chart</div>
//                 <div className="text-xs text-gray-500">Monthly ▼</div>
//               </div>
//             </div>
//             <div className="p-4 flex items-center justify-center">
//               <div className="w-24 h-24 relative">
//                 <ResponsiveContainer width="100%" height="100%">
//                   <PieChart>
//                     <Pie
//                       data={pieData}
//                       cx="50%"
//                       cy="50%"
//                       innerRadius={25}
//                       outerRadius={45}
//                       paddingAngle={0}
//                       dataKey="value"
//                     >
//                       {pieData.map((entry, index) => (
//                         <Cell key={`cell-${index}`} fill={entry.color} />
//                       ))}
//                     </Pie>
//                   </PieChart>
//                 </ResponsiveContainer>
//               </div>
//               <div className="ml-4">
//                 <div className="flex items-center mb-2">
//                   <div className="w-2 h-2 bg-indigo-600 rounded-full mr-2"></div>
//                   <div className="text-xs">Blue</div>
//                   <div className="ml-2 text-xs font-bold">63%</div>
//                 </div>
//                 <div className="flex items-center">
//                   <div className="w-2 h-2 bg-blue-300 rounded-full mr-2"></div>
//                   <div className="text-xs">Teal</div>
//                   <div className="ml-2 text-xs font-bold">25%</div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Complex Table & Tasks */}
//         <div className="grid grid-cols-3 gap-6 mb-6">
//           {/* Complex Table */}
//           <div className="bg-white rounded-xl shadow-sm col-span-1">
//             <div className="p-4 flex justify-between items-center border-b">
//               <div className="font-bold">Complex Table</div>
//               <div className="text-gray-500">•••</div>
//             </div>
//             <div className="p-4">
//               <table className="w-full text-sm">
//                 <thead>
//                   <tr className="text-gray-500 uppercase text-xs">
//                     <th className="pb-3 text-left">NAME</th>
//                     <th className="pb-3 text-left">STATUS</th>
//                     <th className="pb-3 text-left">DATE</th>
//                     <th className="pb-3 text-left">PROGRESS</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {complexTableData.map((item, index) => (
//                     <tr key={index} className="border-t border-gray-100">
//                       <td className="py-3">{item.name}</td>
//                       <td className="py-3">
//                         {item.status === 'approved' && (
//                           <div className="flex items-center">
//                             <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-2">
//                               <Check className="h-3 w-3 text-white" />
//                             </div>
//                             <span>Approved</span>
//                           </div>
//                         )}
//                         {item.status === 'disable' && (
//                           <div className="flex items-center">
//                             <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-2">
//                               <X className="h-3 w-3 text-white" />
//                             </div>
//                             <span>Disable</span>
//                           </div>
//                         )}
//                         {item.status === 'error' && (
//                           <div className="flex items-center">
//                             <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center mr-2">
//                               <AlertTriangle className="h-3 w-3 text-white" />
//                             </div>
//                             <span>Error</span>
//                           </div>
//                         )}
//                       </td>
//                       <td className="py-3">{item.date}</td>
//                       <td className="py-3">
//                         <div className="w-full bg-gray-200 rounded-full h-1">
//                           <div 
//                             className="bg-indigo-600 h-1 rounded-full" 
//                             style={{ width: `${item.progress}%` }}
//                           ></div>
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>

//           {/* Tasks */}
//           <div className="bg-white rounded-xl shadow-sm">
//             <div className="p-4 flex justify-between items-center border-b">
//               <div className="font-bold">Tasks</div>
//               <div className="text-gray-500">•••</div>
//             </div>
//             <div className="p-4">
//               <ul>
//                 {tasksData.map((task, index) => (
//                   <li key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
//                     <div className="flex items-center">
//                       <input type="checkbox" className="mr-2" checked={task.completed} />
//                       <span>{task.name}</span>
//                     </div>
//                     <div className="text-gray-500">•••</div>
//                   </li>
//                 ))}
//               </ul>
//             </div>
//           </div>

//           {/* Calendar */}
//           <div className="bg-white rounded-xl shadow-sm">
//             <div className="p-4 flex justify-between items-center border-b">
//               <div className="font-bold">April</div>
//               <div className="text-gray-500">2021</div>
//             </div>
//             <div className="p-4">
//               <div className="grid grid-cols-7 gap-2 text-center mb-2">
//                 {daysOfWeek.map((day, index) => (
//                   <div key={index} className="text-xs font-medium text-gray-500">
//                     {day}
//                   </div>
//                 ))}
//               </div>
//               <div className="grid grid-cols-7 gap-2 text-center">
//                 {calendarDays.map((day, index) => (
//                   <div 
//                     key={index} 
//                     className={`text-xs py-1 rounded-full ${
//                       day.month === 'prev' || day.month === 'next' 
//                         ? 'text-gray-300' 
//                         : day.active 
//                           ? 'bg-indigo-600 text-white' 
//                           : 'text-gray-700'
//                     }`}
//                   >
//                     {day.day}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }