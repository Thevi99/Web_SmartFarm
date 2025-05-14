import React, { useState } from "react";
import { Link } from "react-router-dom";

const menuItems = [
  { icon: "🏠", label: "Dashboard", to: "/dashboard" },
  { icon: "🚨", label: "Notification", to: "/notification" },
  { icon: "⚙️", label: "Settings", to: "/settings" },
];

export default function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        className="md:hidden fixed top-4 left-4 z-50 bg-white p-2 rounded-md shadow-md" 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? "✕" : "☰"}
      </button>

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 
        h-screen w-48
        bg-white shadow-md 
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
        transition-transform duration-300 ease-in-out
        z-40
      `}>
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-blue-700">SMART FARM AMI</h1>
        </div>
        
        <nav className="mt-4">
          <ul>
            {menuItems.map((item, index) => (
              <li key={index}>
                <Link
                  to={item.to}
                  className="px-4 py-3 flex items-center hover:bg-gray-100 hover:text-blue-700 text-gray-600"
                  onClick={() => setIsMobileOpen(false)}
                >
                  <span className="mr-3">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}


///////////// main
// import React from "react";
// import { Link } from "react-router-dom";

// const menuItems = [
//   { icon: "🏠", label: "Dashboard", to: "/dashboard" },
//   { icon: "🚨", label: "Notification", to: "/notification" },
// ];

// export default function Siderbar() {
//   return (
//     <div className="fixed inset-y-0 left-0 bg-white w-48 shadow-md block sm:block">
//       <div className="p-4">
//         <h1 className="text-lg font-bold text-indigo-700">SMART FARM AMI</h1>
//       </div>
//       <nav className="mt-4">
//         <ul>
//           {menuItems.map((item, index) => (
//             <li key={index}>
//               <Link
//                 to={item.to}
//                 className="px-4 py-2 flex items-center rounded-lg transition-colors duration-200 cursor-pointer text-gray-500 hover:bg-gray-100 hover:text-indigo-600"
//               >
//                 <span className="mr-2">{item.icon}</span>
//                 <span>{item.label}</span>
//               </Link>
//             </li>
//           ))}
//         </ul>
//       </nav>
//     </div>
//   );
// }



// import React from 'react';
// import SidebarMenuItem from '../common/SidebarMenuItem';

// export default function Sidebar() {
//   const menuItems = [
//     { icon: '🏠', label: 'Dashboard', active: true },
//     { icon: '🛒', label: 'NFT Marketplace', active: false },
//     { icon: '📊', label: 'Tables', active: false },
//     { icon: '👤', label: 'Profile', active: false },
//     { icon: '🔐', label: 'Sign In', active: false },
//   ];

//   return (
//     <div className="fixed inset-y-0 left-0 bg-white w-48 shadow-md hidden sm:block">
//       <div className="p-4">
//         <h1 className="text-lg font-bold text-indigo-700">SMART FARM AMI</h1>
//       </div>
//       <nav className="mt-4">
//         <ul>
//           {menuItems.map((item, index) => (
//             <SidebarMenuItem 
//               key={index}
//               icon={item.icon}
//               label={item.label}
//               active={item.active}
//             />
//           ))}
//         </ul>
//       </nav>
//     </div>
//   );
// }