// // ✅ TablesRow.js - Updated with Real Dates in Calendar
// import React from "react";
// import { Check, X, AlertTriangle } from "lucide-react";
// import { BarChart, Bar, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// const tableData = [
//   { name: "Horizon UI PRO", progress: 17.5, quantity: 2458, date: new Date().toLocaleDateString() },
//   { name: "Horizon UI Free", progress: 10.8, quantity: 1485, date: new Date().toLocaleDateString() },
//   { name: "Weekly Update", progress: 21.3, quantity: 1024, date: new Date().toLocaleDateString() },
//   { name: "Venus 3D Asset", progress: 31.5, quantity: 858, date: new Date().toLocaleDateString() },
// ];

// const pieData = [
//   { name: "Blue", value: 63, color: "#4318FF" },
//   { name: "Teal", value: 25, color: "#6AD2FF" },
//   { name: "Other", value: 12, color: "#EFF4FB" },
// ];

// const trafficData = [
//   { name: "1", value: 20 }, { name: "2", value: 40 }, { name: "3", value: 30 },
//   { name: "4", value: 50 }, { name: "5", value: 40 }, { name: "6", value: 60 },
//   { name: "7", value: 35 }, { name: "8", value: 55 }, { name: "9", value: 45 },
//   { name: "10", value: 65 },
// ];

// const tasksData = [
//   { name: "Landing Page Design", completed: false },
//   { name: "Dashboard Builder", completed: true },
//   { name: "Mobile App Design", completed: true },
//   { name: "Illustrations", completed: false },
//   { name: "Promotional LP", completed: true },
// ];

// const daysOfWeek = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
// const now = new Date();
// const currentMonth = now.getMonth();
// const currentYear = now.getFullYear();
// const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
// const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
//   const date = new Date(currentYear, currentMonth, i + 1);
//   const isToday = date.toDateString() === now.toDateString();
//   return {
//     day: date.getDate(),
//     month: "current",
//     active: isToday,
//   };
// });

// export default function TablesRow() {
//   return (
//     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
//       {/* Table */}
//       <div className="bg-white rounded-xl shadow-sm col-span-1">
//         <div className="p-4 flex justify-between items-center border-b">
//           <div className="font-bold">Check Table</div>
//         </div>
//         <div className="p-4">
//           <table className="w-full text-sm">
//             <thead>
//               <tr className="text-gray-500 uppercase text-xs">
//                 <th className="pb-3 text-left">NAME</th>
//                 <th className="pb-3 text-left">PROGRESS</th>
//                 <th className="pb-3 text-left">QUANTITY</th>
//                 <th className="pb-3 text-left">DATE</th>
//               </tr>
//             </thead>
//             <tbody>
//               {tableData.map((item, index) => (
//                 <tr key={index} className="border-t border-gray-100">
//                   <td className="py-3 flex items-center">
//                     <input type="checkbox" className="mr-2" />
//                     {item.name}
//                   </td>
//                   <td className="py-3">{item.progress}%</td>
//                   <td className="py-3">{item.quantity}</td>
//                   <td className="py-3">{item.date}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Traffic + Pie */}
//       <div className="flex flex-col gap-6">
//         <div className="bg-white rounded-xl shadow-sm">
//           <div className="p-4 border-b">
//             <div className="font-bold">Daily Traffic</div>
//             <div className="text-2xl font-bold">2,579 <span className="text-xs text-gray-500">Visitors</span></div>
//             <div className="text-xs text-green-500">+2.45%</div>
//           </div>
//           <div className="p-4">
//             <ResponsiveContainer width="100%" height={120}>
//               <BarChart data={trafficData} barSize={4}>
//                 <YAxis axisLine={false} tickLine={false} />
//                 <Bar dataKey="value" fill="#4318FF" radius={[10, 10, 0, 0]} />
//               </BarChart>
//             </ResponsiveContainer>
//           </div>
//         </div>

//         <div className="bg-white rounded-xl shadow-sm">
//           <div className="p-4 border-b font-bold">Your Pie Chart</div>
//           <div className="p-4 flex items-center justify-center">
//             <div className="w-24 h-24 relative">
//               <ResponsiveContainer width="100%" height="100%">
//                 <PieChart>
//                   <Pie data={pieData} cx="50%" cy="50%" innerRadius={25} outerRadius={45} dataKey="value">
//                     {pieData.map((entry, index) => (
//                       <Cell key={`cell-${index}`} fill={entry.color} />
//                     ))}
//                   </Pie>
//                 </PieChart>
//               </ResponsiveContainer>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Tasks + Calendar */}
//       <div className="flex flex-col gap-6">
//         <div className="bg-white rounded-xl shadow-sm">
//           <div className="p-4 font-bold border-b">Tasks</div>
//           <div className="p-4">
//             <ul>
//               {tasksData.map((task, index) => (
//                 <li key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
//                   <div className="flex items-center">
//                     <input type="checkbox" className="mr-2" checked={task.completed} readOnly />
//                     <span>{task.name}</span>
//                   </div>
//                 </li>
//               ))}
//             </ul>
//           </div>
//         </div>

//         <div className="bg-white rounded-xl shadow-sm">
//           <div className="p-4 flex justify-between items-center border-b">
//             <div className="font-bold">{now.toLocaleString('default', { month: 'long' })}</div>
//             <div className="text-gray-500">{currentYear}</div>
//           </div>
//           <div className="p-4">
//             <div className="grid grid-cols-7 gap-2 text-center mb-2">
//               {daysOfWeek.map((day, index) => (
//                 <div key={index} className="text-xs font-medium text-gray-500">{day}</div>
//               ))}
//             </div>
//             <div className="grid grid-cols-7 gap-2 text-center">
//               {calendarDays.map((day, index) => (
//                 <div
//                   key={index}
//                   className={`text-xs py-1 rounded-full ${day.active ? "bg-indigo-600 text-white" : "text-gray-700"}`}
//                 >
//                   {day.day}
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
