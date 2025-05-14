import React, { useState, useEffect } from "react";
import { Check, DropletIcon, Thermometer, Calendar } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function StatsCards() {
  const [phValue, setPhValue] = useState(null);
  const [doValue, setDoValue] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  async function fetchData() {
    try {
      setIsLoading(true);
      const snapshot1 = await getDocs(query(collection(db, "datalog"), where("sensor_id", "==", "1")));
      const snapshot2 = await getDocs(query(collection(db, "datalog"), where("sensor_id", "==", "2")));

      const data1 = snapshot1.docs.map(doc => doc.data());
      const data2 = snapshot2.docs.map(doc => doc.data());

      const latest1 = data1.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
      const latest2 = data2.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

      setPhValue(latest1?.value || "No value");
      setDoValue(latest2?.value || "No value");
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  
    // 1. Load refresh interval from localStorage or fallback to 10s
    const savedIntervalId = localStorage.getItem("refreshInterval") || "10s";
  
    // 2. Define mapping for seconds
    const refreshMap = {
      '10s': 10000,
      '5m': 5 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '3h': 3 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
    };
  
    // 3. Use the mapped value or default to 10s
    const refreshDelay = refreshMap[savedIntervalId] || 10000;
  
    const intervalId = setInterval(() => {
      console.log("Refreshing data...");
      fetchData();
    }, refreshDelay);
  
    return () => clearInterval(intervalId);
  }, []);
  

  // Get current date for calendar
  const today = new Date();
  const currentDate = today.getDate();
  
  // Format last refreshed time
  const formatTime = (date) => {
    return date.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  // Generate pH status 
  const getPhStatus = (value) => {
    if (isLoading || error || value === "No value") return null;
    const numValue = parseFloat(value);
    if (numValue < 6.5) return { color: "text-amber-500", text: "ต่ำ" };
    if (numValue > 8.5) return { color: "text-red-500", text: "สูง" };
    return { color: "text-green-500", text: "ปกติ" };
  };

  const phStatus = getPhStatus(phValue);
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* pH Value Card */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden group hover:shadow-lg transition-shadow duration-300">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 p-1.5 rounded-full">
                <Thermometer className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-sm font-medium text-gray-700">pH Value (Sensor 1)</div>
            </div>
            {phStatus && (
              <span className={`text-xs font-medium ${phStatus.color} bg-white px-2 py-0.5 rounded-full`}>
                {phStatus.text}
              </span>
            )}
          </div>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
              กำลังโหลด...
            </div>
          ) : error ? (
            <div className="text-sm text-red-500 flex items-center">
              <span className="bg-red-100 p-1 rounded-full mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </span>
              {error}
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="text-3xl font-bold text-gray-800">{phValue}</div>
              <div className="text-xs text-gray-500 mt-1">Last updated: {formatTime(lastRefreshed)}</div>
            </div>
          )}
        </div>
      </div>

      {/* DO Value Card */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden group hover:shadow-lg transition-shadow duration-300">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-2 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-100 p-1.5 rounded-full">
                <DropletIcon className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-sm font-medium text-gray-700">DO Value (Sensor 2)</div>
            </div>
          </div>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-2"></div>
              กำลังโหลด...
            </div>
          ) : error ? (
            <div className="text-sm text-red-500 flex items-center">
              <span className="bg-red-100 p-1 rounded-full mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </span>
              {error}
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="text-3xl font-bold text-gray-800">{doValue}</div>
              <div className="text-xs text-gray-500 mt-1">Last updated: {formatTime(lastRefreshed)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden group hover:shadow-lg transition-shadow duration-300">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-3 py-2 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-green-100 p-1.5 rounded-full">
                <svg className="h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                  <path d="M10 4a1 1 0 011 1v5a1 1 0 01-1 1 1 1 0 01-1-1V5a1 1 0 011-1z" />
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-700">Status</div>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center">
            <div className="bg-green-500 p-2 rounded-full mr-3">
              <Check className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">On</div>
              <div className="text-xs text-gray-500">ระบบทำงานปกติ</div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Card */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden group hover:shadow-lg transition-shadow duration-300">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-amber-100 p-1.5 rounded-full">
                <Calendar className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-sm font-medium text-gray-700">April {today.getFullYear()}</div>
            </div>
          </div>
        </div>
        <div className="p-2">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mt-1">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d, i) => (
              <div key={i} className="py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 mt-1 text-center text-xs">
            {[...Array(30)].map((_, i) => {
              const day = i + 1;
              const isToday = day === currentDate;
              return (
                <div
                  key={i}
                  className={`py-1 rounded-full cursor-pointer ${
                    isToday 
                      ? "bg-amber-500 text-white font-medium" 
                      : "text-gray-700 hover:bg-amber-100"
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


//////// main auto refresh
// import React, { useState, useEffect } from "react";
// import { Check, DropletIcon, Thermometer, Calendar } from "lucide-react";
// import { db } from "../../lib/firebase";
// import { collection, getDocs, query, where } from "firebase/firestore";

// export default function StatsCards() {
//   const [phValue, setPhValue] = useState(null);
//   const [doValue, setDoValue] = useState(null);
//   const [error, setError] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [lastRefreshed, setLastRefreshed] = useState(new Date());

//   async function fetchData() {
//     try {
//       setIsLoading(true);
//       const snapshot1 = await getDocs(query(collection(db, "datalog"), where("sensor_id", "==", "1")));
//       const snapshot2 = await getDocs(query(collection(db, "datalog"), where("sensor_id", "==", "2")));

//       const data1 = snapshot1.docs.map(doc => doc.data());
//       const data2 = snapshot2.docs.map(doc => doc.data());

//       const latest1 = data1.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
//       const latest2 = data2.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

//       setPhValue(latest1?.value || "No value");
//       setDoValue(latest2?.value || "No value");
//       setLastRefreshed(new Date());
//     } catch (err) {
//       console.error("Error fetching data:", err);
//       setError("ไม่สามารถโหลดข้อมูลได้");
//     } finally {
//       setIsLoading(false);
//     }
//   }

//   useEffect(() => {
//     // Initial data fetch
//     fetchData();
    
//     // Set up automatic refresh every 5 seconds
//     const intervalId = setInterval(() => {
//       console.log("Refreshing data...");
//       fetchData();
//     }, 5000);
    
//     // Clean up the interval when component unmounts
//     return () => {
//       clearInterval(intervalId);
//     };
//   }, []);

//   // Get current date for calendar
//   const today = new Date();
//   const currentDate = today.getDate();
  
//   // Format last refreshed time
//   const formatTime = (date) => {
//     return date.toLocaleTimeString('th-TH', { 
//       hour: '2-digit', 
//       minute: '2-digit',
//       second: '2-digit'
//     });
//   };
  
//   // Generate pH status 
//   const getPhStatus = (value) => {
//     if (isLoading || error || value === "No value") return null;
//     const numValue = parseFloat(value);
//     if (numValue < 6.5) return { color: "text-amber-500", text: "ต่ำ" };
//     if (numValue > 8.5) return { color: "text-red-500", text: "สูง" };
//     return { color: "text-green-500", text: "ปกติ" };
//   };

//   const phStatus = getPhStatus(phValue);
  
//   return (
//     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
//       {/* pH Value Card */}
//       <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden group hover:shadow-lg transition-shadow duration-300">
//         <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 border-b border-gray-100">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-2">
//               <div className="bg-blue-100 p-1.5 rounded-full">
//                 <Thermometer className="h-4 w-4 text-blue-600" />
//               </div>
//               <div className="text-sm font-medium text-gray-700">pH Value (Sensor 1)</div>
//             </div>
//             {phStatus && (
//               <span className={`text-xs font-medium ${phStatus.color} bg-white px-2 py-0.5 rounded-full`}>
//                 {phStatus.text}
//               </span>
//             )}
//           </div>
//         </div>
//         <div className="p-4">
//           {isLoading ? (
//             <div className="flex items-center text-sm text-gray-500">
//               <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
//               กำลังโหลด...
//             </div>
//           ) : error ? (
//             <div className="text-sm text-red-500 flex items-center">
//               <span className="bg-red-100 p-1 rounded-full mr-2">
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-500" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
//                 </svg>
//               </span>
//               {error}
//             </div>
//           ) : (
//             <div className="flex flex-col">
//               <div className="text-3xl font-bold text-gray-800">{phValue}</div>
//               <div className="text-xs text-gray-500 mt-1">Last updated: {formatTime(lastRefreshed)}</div>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* DO Value Card */}
//       <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden group hover:shadow-lg transition-shadow duration-300">
//         <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-2 border-b border-gray-100">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-2">
//               <div className="bg-indigo-100 p-1.5 rounded-full">
//                 <DropletIcon className="h-4 w-4 text-indigo-600" />
//               </div>
//               <div className="text-sm font-medium text-gray-700">DO Value (Sensor 2)</div>
//             </div>
//           </div>
//         </div>
//         <div className="p-4">
//           {isLoading ? (
//             <div className="flex items-center text-sm text-gray-500">
//               <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-2"></div>
//               กำลังโหลด...
//             </div>
//           ) : error ? (
//             <div className="text-sm text-red-500 flex items-center">
//               <span className="bg-red-100 p-1 rounded-full mr-2">
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-500" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
//                 </svg>
//               </span>
//               {error}
//             </div>
//           ) : (
//             <div className="flex flex-col">
//               <div className="text-3xl font-bold text-gray-800">{doValue}</div>
//               <div className="text-xs text-gray-500 mt-1">Last updated: {formatTime(lastRefreshed)}</div>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Status Card */}
//       <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden group hover:shadow-lg transition-shadow duration-300">
//         <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-3 py-2 border-b border-gray-100">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-2">
//               <div className="bg-green-100 p-1.5 rounded-full">
//                 <svg className="h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
//                   <path d="M10 4a1 1 0 011 1v5a1 1 0 01-1 1 1 1 0 01-1-1V5a1 1 0 011-1z" />
//                 </svg>
//               </div>
//               <div className="text-sm font-medium text-gray-700">Status</div>
//             </div>
//           </div>
//         </div>
//         <div className="p-4">
//           <div className="flex items-center">
//             <div className="bg-green-500 p-2 rounded-full mr-3">
//               <Check className="h-4 w-4 text-white" />
//             </div>
//             <div>
//               <div className="text-2xl font-bold text-gray-800">On</div>
//               <div className="text-xs text-gray-500">ระบบทำงานปกติ</div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Calendar Card */}
//       <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden group hover:shadow-lg transition-shadow duration-300">
//         <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 border-b border-gray-100">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-2">
//               <div className="bg-amber-100 p-1.5 rounded-full">
//                 <Calendar className="h-4 w-4 text-amber-600" />
//               </div>
//               <div className="text-sm font-medium text-gray-700">April {today.getFullYear()}</div>
//             </div>
//           </div>
//         </div>
//         <div className="p-2">
//           <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mt-1">
//             {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d, i) => (
//               <div key={i} className="py-1">{d}</div>
//             ))}
//           </div>
//           <div className="grid grid-cols-7 gap-1 mt-1 text-center text-xs">
//             {[...Array(30)].map((_, i) => {
//               const day = i + 1;
//               const isToday = day === currentDate;
//               return (
//                 <div
//                   key={i}
//                   className={`py-1 rounded-full cursor-pointer ${
//                     isToday 
//                       ? "bg-amber-500 text-white font-medium" 
//                       : "text-gray-700 hover:bg-amber-100"
//                   }`}
//                 >
//                   {day}
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }


//////// main real /////////
// import React, { useState, useEffect } from "react";
// import { Check, DropletIcon, Thermometer, Calendar } from "lucide-react";
// import { db } from "../../lib/firebase";
// import { collection, getDocs, query, where } from "firebase/firestore";

// export default function StatsCards() {
//   const [phValue, setPhValue] = useState(null);
//   const [doValue, setDoValue] = useState(null);
//   const [error, setError] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     async function fetchData() {
//       try {
//         const snapshot1 = await getDocs(query(collection(db, "datalog"), where("sensor_id", "==", "1")));
//         const snapshot2 = await getDocs(query(collection(db, "datalog"), where("sensor_id", "==", "2")));

//         const data1 = snapshot1.docs.map(doc => doc.data());
//         const data2 = snapshot2.docs.map(doc => doc.data());

//         const latest1 = data1.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
//         const latest2 = data2.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

//         setPhValue(latest1?.value || "No value");
//         setDoValue(latest2?.value || "No value");
//       } catch (err) {
//         console.error("Error fetching data:", err);
//         setError("ไม่สามารถโหลดข้อมูลได้");
//       } finally {
//         setIsLoading(false);
//       }
//     }

//     fetchData();
//   }, []);

//   // Get current date for calendar
//   const today = new Date();
//   const currentDate = today.getDate();
  
//   // Generate pH status 
//   const getPhStatus = (value) => {
//     if (isLoading || error || value === "No value") return null;
//     const numValue = parseFloat(value);
//     if (numValue < 6.5) return { color: "text-amber-500", text: "ต่ำ" };
//     if (numValue > 8.5) return { color: "text-red-500", text: "สูง" };
//     return { color: "text-green-500", text: "ปกติ" };
//   };

//   const phStatus = getPhStatus(phValue);
  
//   return (
//     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
//       {/* pH Value Card */}
//       <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden group hover:shadow-lg transition-shadow duration-300">
//         <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 border-b border-gray-100">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-2">
//               <div className="bg-blue-100 p-1.5 rounded-full">
//                 <Thermometer className="h-4 w-4 text-blue-600" />
//               </div>
//               <div className="text-sm font-medium text-gray-700">pH Value (Sensor 1)</div>
//             </div>
//             {phStatus && (
//               <span className={`text-xs font-medium ${phStatus.color} bg-white px-2 py-0.5 rounded-full`}>
//                 {phStatus.text}
//               </span>
//             )}
//           </div>
//         </div>
//         <div className="p-4">
//           {isLoading ? (
//             <div className="flex items-center text-sm text-gray-500">
//               <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
//               กำลังโหลด...
//             </div>
//           ) : error ? (
//             <div className="text-sm text-red-500 flex items-center">
//               <span className="bg-red-100 p-1 rounded-full mr-2">
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-500" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
//                 </svg>
//               </span>
//               {error}
//             </div>
//           ) : (
//             <div className="flex flex-col">
//               <div className="text-3xl font-bold text-gray-800">{phValue}</div>
//               <div className="text-xs text-gray-500 mt-1">Last updated: Today</div>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* DO Value Card */}
//       <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden group hover:shadow-lg transition-shadow duration-300">
//         <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-2 border-b border-gray-100">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-2">
//               <div className="bg-indigo-100 p-1.5 rounded-full">
//                 <DropletIcon className="h-4 w-4 text-indigo-600" />
//               </div>
//               <div className="text-sm font-medium text-gray-700">DO Value (Sensor 2)</div>
//             </div>
//           </div>
//         </div>
//         <div className="p-4">
//           {isLoading ? (
//             <div className="flex items-center text-sm text-gray-500">
//               <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-2"></div>
//               กำลังโหลด...
//             </div>
//           ) : error ? (
//             <div className="text-sm text-red-500 flex items-center">
//               <span className="bg-red-100 p-1 rounded-full mr-2">
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-500" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
//                 </svg>
//               </span>
//               {error}
//             </div>
//           ) : (
//             <div className="flex flex-col">
//               <div className="text-3xl font-bold text-gray-800">{doValue}</div>
//               <div className="text-xs text-gray-500 mt-1">Last updated: Today</div>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Status Card */}
//       <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden group hover:shadow-lg transition-shadow duration-300">
//         <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-3 py-2 border-b border-gray-100">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-2">
//               <div className="bg-green-100 p-1.5 rounded-full">
//                 <svg className="h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
//                   <path d="M10 4a1 1 0 011 1v5a1 1 0 01-1 1 1 1 0 01-1-1V5a1 1 0 011-1z" />
//                 </svg>
//               </div>
//               <div className="text-sm font-medium text-gray-700">Status</div>
//             </div>
//           </div>
//         </div>
//         <div className="p-4">
//           <div className="flex items-center">
//             <div className="bg-green-500 p-2 rounded-full mr-3">
//               <Check className="h-4 w-4 text-white" />
//             </div>
//             <div>
//               <div className="text-2xl font-bold text-gray-800">On</div>
//               <div className="text-xs text-gray-500">ระบบทำงานปกติ</div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Calendar Card */}
//       <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden group hover:shadow-lg transition-shadow duration-300">
//         <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 border-b border-gray-100">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-2">
//               <div className="bg-amber-100 p-1.5 rounded-full">
//                 <Calendar className="h-4 w-4 text-amber-600" />
//               </div>
//               <div className="text-sm font-medium text-gray-700">April {today.getFullYear()}</div>
//             </div>
//           </div>
//         </div>
//         <div className="p-2">
//           <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mt-1">
//             {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d, i) => (
//               <div key={i} className="py-1">{d}</div>
//             ))}
//           </div>
//           <div className="grid grid-cols-7 gap-1 mt-1 text-center text-xs">
//             {[...Array(30)].map((_, i) => {
//               const day = i + 1;
//               const isToday = day === currentDate;
//               return (
//                 <div
//                   key={i}
//                   className={`py-1 rounded-full cursor-pointer ${
//                     isToday 
//                       ? "bg-amber-500 text-white font-medium" 
//                       : "text-gray-700 hover:bg-amber-100"
//                   }`}
//                 >
//                   {day}
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

/// Main ver.0.0.1

// import React, { useState, useEffect } from "react";
// import { Check } from "lucide-react";
// import { db } from "../../lib/firebase";
// import { collection, getDocs, query, where } from "firebase/firestore";

// export default function StatsCards() {
//   const [phValue, setPhValue] = useState(null);
//   const [doValue, setDoValue] = useState(null);
//   const [error, setError] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     async function fetchData() {
//       try {
//         const snapshot1 = await getDocs(query(collection(db, "datalog"), where("sensor_id", "==", "1")));
//         const snapshot2 = await getDocs(query(collection(db, "datalog"), where("sensor_id", "==", "2")));

//         const data1 = snapshot1.docs.map(doc => doc.data());
//         const data2 = snapshot2.docs.map(doc => doc.data());

//         const latest1 = data1.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
//         const latest2 = data2.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

//         setPhValue(latest1?.value || "No value");
//         setDoValue(latest2?.value || "No value");
//       } catch (err) {
//         console.error("Error fetching data:", err);
//         setError("ไม่สามารถโหลดข้อมูลได้");
//       } finally {
//         setIsLoading(false);
//       }
//     }

//     fetchData();
//   }, []);

//   return (
//     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
//       {/* pH Value */}
//       <div className="bg-white p-4 rounded-xl shadow-sm col-span-1">
//         <div className="flex items-center justify-between mb-2">
//           <div className="text-xs text-gray-500">pH Value (Sensor 1)</div>
//           <div className="bg-indigo-100 p-2 rounded-lg">
//             <div className="w-4 h-4 bg-indigo-500 rounded-md"></div>
//           </div>
//         </div>
//         {isLoading ? <div>กำลังโหลด...</div> : error ? <div className="text-red-500">{error}</div> : <div className="text-2xl font-bold">{phValue}</div>}
//       </div>

//       {/* DO Value */}
//       <div className="bg-white p-4 rounded-xl shadow-sm col-span-1">
//         <div className="flex items-center justify-between mb-2">
//           <div className="text-xs text-gray-500">DO Value (Sensor 2)</div>
//           <div className="bg-indigo-100 p-2 rounded-lg">
//             <div className="w-4 h-4 bg-indigo-500 rounded-md"></div>
//           </div>
//         </div>
//         {isLoading ? <div>กำลังโหลด...</div> : error ? <div className="text-red-500">{error}</div> : <div className="text-2xl font-bold">{doValue}</div>}
//       </div>

//       {/* Status */}
//       <div className="bg-white p-4 rounded-xl shadow-sm col-span-1">
//         <div className="flex items-center justify-between mb-2">
//           <div className="text-xs text-gray-500">Status</div>
//           <div className="bg-blue-500 p-2 rounded-full">
//             <Check className="h-4 w-4 text-white" />
//           </div>
//         </div>
//         <div className="text-2xl font-bold">On</div>
//       </div>

//       {/* Card สำหรับ Calendar */}
//       <div className="bg-white p-4 rounded-xl shadow-sm col-span-1">
//         <div className="flex justify-between items-center mb-2">
//             <div className="font-bold">April</div>
//             <div className="text-sm text-gray-500">{new Date().getFullYear()}</div>
//         </div>
//         <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-600">
//             {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d, i) => (
//             <div key={i} className="font-medium">{d}</div>
//             ))}
//         </div>
//         <div className="grid grid-cols-7 gap-1 mt-1 text-center text-xs">
//             {[...Array(30)].map((_, i) => {
//             const day = i + 1;
//             const isToday = day === new Date().getDate();
//             return (
//                 <div
//                 key={i}
//                 className={`py-1 rounded-full ${isToday ? "bg-indigo-600 text-white" : "text-gray-700"}`}
//                 >
//                 {day}
//                 </div>
//             );
//             })}
//         </div>
//       </div>
//     </div>
//   );
// }











// import React from "react";
// import { Check } from "lucide-react";

// export default function StatsCards() {
//     return (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
//             <div className="bg-white p-4 rounded-xl shadow-sm">
//                 <div className="flex items-center  justify-between mb-2">
//                     <div className="text-xs text-gray-500"> Ph Value </div>
//                     <div className="bg-indigo-100 p-2 rounded-lg">
//                         <div className="w-4 h-4 bg-indigo-500 rounded-md"></div>
//                     </div>
//                 </div>
//                 <div className="text-2xl font-bold"> 6.3</div>     {/* example value */}
//             </div>

//             <div className="bg-white p-4 rounded-xl shadow-sm">
//                 <div className="flex items-center  justify-between mb-2">
//                     <div className="text-xs text-gray-500"> Do Value</div>
//                     <div className="bg-indigo-100 p-2 rounded-lg">
//                         <div className="w-4 h-4 bg-indigo-500 rounded-md"></div>
//                     </div>
//                 </div>
//                 <div className="text-2xl font-bold"> 7 mg/L</div>     {/* example Do value */}
//                 <div className="text-xs text-green-500"> Quality: +Healty</div>
//             </div>

//             <div className="bg-white p-4 rounded-xl shadow-sm">
//                 <div className="flex items-center justify-between mb-2">
//                 <div className="text-xs text-gray-500">Status</div>
//                 <div className="bg-blue-500 p-2 rounded-full">
//                     <Check className="h-4 w-4 text-white" />
//                 </div>
//                 </div>
//                 <div className="text-2xl font-bold">On</div>
//             </div>

//             <div className="bg-white p-6 rounded-xl shadow-sm">
//                 <div className="flex justify-between items-center mb-2">
//                 <div className="font-bold">April</div>
//                 <div className="text-sm text-gray-500">2024</div>
//                 </div>
//                 <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-600">
//                 {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d, i) => (
//                     <div key={i} className="font-medium">{d}</div>
//                 ))}
//                 </div>
//                 <div className="grid grid-cols-7 gap-1 mt-1 text-center text-xs">
//                 {[...Array(30)].map((_, i) => {
//                     const day = i + 1;
//                     const isToday = day === new Date().getDate();
//                     return (
//                     <div
//                         key={i}
//                         className={`py-1 rounded-full ${isToday ? "bg-indigo-600 text-white" : "text-gray-700"}`}
//                     >
//                         {day}
//                     </div>
//                     );
//                 })}
//                 </div>
//             </div>
//         </div>
//     );
// }