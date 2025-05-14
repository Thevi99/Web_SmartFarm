import React, { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from '../../lib/firebase';

export default function ResponsiveChartsRow() {
  const [lineChartData, setLineChartData] = useState([]);
  const [barChartData, setBarChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  // Refs for chart containers
  const lineChartContainerRef = useRef(null);
  const barChartContainerRef = useRef(null);

  // Handle resize event
  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth);
    }

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch data
  useEffect(() => {
    async function fetchSensorData() {
      try {
        // ดึงข้อมูล pH (sensor_id: "1") จาก collection datalog
        const phQuery = query(
          collection(db, "datalog"),
          where("sensor_id", "==", "1")
        );
        
        // ดึงข้อมูล DO (sensor_id: "2") จาก collection datalog
        const doQuery = query(
          collection(db, "datalog"),
          where("sensor_id", "==", "2")
        );
        
        // ดึงข้อมูลพร้อมกันทั้งสองชุด
        const [phSnapshot, doSnapshot] = await Promise.all([
          getDocs(phQuery),
          getDocs(doQuery)
        ]);
        
        // ประมวลผลข้อมูล pH
        const phData = {};
        phSnapshot.forEach((doc) => {
          const data = doc.data();
          
          // ตรวจสอบว่ามี timestamp หรือไม่
          if (!data.timestamp) return;
          
          const timestamp = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
          
          // สร้าง key ตามวันที่
          const day = timestamp.getDate();
          const month = timestamp.getMonth();
          const year = timestamp.getFullYear();
          const dateKey = `${year}-${month}-${day}`;
          
          // จัดรูปแบบวันที่สำหรับแสดงผล
          const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", 
                             "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
          const displayDate = `${day} ${monthNames[month]}`;
          
          // เก็บค่า pH พร้อมกับ timestamp
          if (!phData[dateKey]) {
            phData[dateKey] = {
              values: [],
              displayDate,
              shortName: day.toString(),
              timestamp
            };
          }
          
          // เก็บค่า pH (ตรวจสอบฟิลด์ที่เก็บค่า)
          const sensorValue = data.value !== undefined ? data.value : 
                             (data.ph !== undefined ? data.ph : null);
          
          if (sensorValue !== null) {
            phData[dateKey].values.push(parseFloat(sensorValue));
          }
        });
        
        // ประมวลผลข้อมูล DO
        const doData = {};
        doSnapshot.forEach((doc) => {
          const data = doc.data();
          
          // ตรวจสอบว่ามี timestamp หรือไม่
          if (!data.timestamp) return;
          
          const timestamp = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
          
          // สร้าง key ตามวันที่
          const day = timestamp.getDate();
          const month = timestamp.getMonth();
          const year = timestamp.getFullYear();
          const dateKey = `${year}-${month}-${day}`;
          
          // จัดรูปแบบวันที่สำหรับแสดงผล
          const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", 
                             "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
          const displayDate = `${day} ${monthNames[month]}`;
          
          // เก็บค่า DO พร้อมกับ timestamp
          if (!doData[dateKey]) {
            doData[dateKey] = {
              values: [],
              displayDate,
              shortName: day.toString(),
              timestamp
            };
          }
          
          // เก็บค่า DO (ตรวจสอบฟิลด์ที่เก็บค่า)
          const sensorValue = data.value !== undefined ? data.value : 
                             (data.do !== undefined ? data.do : null);
          
          if (sensorValue !== null) {
            doData[dateKey].values.push(parseFloat(sensorValue));
          }
        });
        
        // รวมข้อมูลและคำนวณค่าเฉลี่ย
        const allDates = [...new Set([...Object.keys(phData), ...Object.keys(doData)])];
        
        const processedData = allDates.map(dateKey => {
          // คำนวณค่าเฉลี่ย pH
          const phValues = phData[dateKey]?.values || [];
          const phAvg = phValues.length > 0 
            ? phValues.reduce((sum, val) => sum + val, 0) / phValues.length 
            : 0;
          
          // คำนวณค่าเฉลี่ย DO
          const doValues = doData[dateKey]?.values || [];
          const doAvg = doValues.length > 0 
            ? doValues.reduce((sum, val) => sum + val, 0) / doValues.length 
            : 0;
          
          // ใช้ข้อมูลการแสดงผลจาก dataset ที่มี
          const displayInfo = phData[dateKey] || doData[dateKey];
          
          return {
            dateKey,
            name: displayInfo.displayDate,
            shortName: displayInfo.shortName,
            ph: phAvg,
            do: doAvg,
            // ข้อมูลอุณหภูมิ (ถ้ามี)
            temp: 26, // ค่าเริ่มต้นกรณีไม่มีข้อมูลอุณหภูมิ
            timestamp: displayInfo.timestamp
          };
        });
        
        // เรียงตามวันที่
        processedData.sort((a, b) => a.timestamp - b.timestamp);
        
        // เลือกเฉพาะ 5 วันล่าสุด
        const recentData = processedData.slice(-5);
        
        // จัดรูปแบบข้อมูลสำหรับกราฟ
        const lineData = recentData.map(item => ({
          name: item.name,
          ph: parseFloat(item.ph.toFixed(1)),
          do: parseFloat(item.do.toFixed(1))
        }));
        
        const barData = recentData.map(item => ({
          name: item.shortName,
          do: parseFloat(item.do.toFixed(1)),
          ph: parseFloat(item.ph.toFixed(1)),
          temp: parseFloat(item.temp.toFixed(1))
        }));
        
        setLineChartData(lineData);
        setBarChartData(barData);
      } catch (error) {
        console.error("Error fetching sensor data:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchSensorData();
  }, []);

  // Get chart heights based on device size
  const getChartHeight = () => {
    if (windowWidth < 640) {
      return 200; // Mobile
    } else if (windowWidth < 1024) {
      return 220; // Tablet
    } else {
      return 150; // Desktop
    }
  };

  // Get number of ticks for X axis based on screen width
  const getXAxisTicks = () => {
    if (windowWidth < 480) {
      return 3; // Small mobiles
    } else if (windowWidth < 768) {
      return 4; // Larger mobiles
    } else {
      return 5; // Tablets and desktop
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 mb-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
          <div className="text-center py-8">กำลังโหลดข้อมูลเซ็นเซอร์...</div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
          <div className="text-center py-8">กำลังโหลดข้อมูลเซ็นเซอร์...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="grid grid-cols-1 gap-6 mb-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
          <div className="text-center py-8 text-red-500">เกิดข้อผิดพลาด: {error}</div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
          <div className="text-center py-8 text-red-500">ไม่สามารถโหลดข้อมูลได้</div>
        </div>
      </div>
    );
  }

  // Simplify data for mobile
  const simplifiedLineData = windowWidth < 640 
    ? lineChartData.filter((_, index) => index % 2 === 0 || index === lineChartData.length - 1)
    : lineChartData;

  return (
    <div className="flex flex-col lg:flex-row justify-center items-start gap-4 sm:gap-6 mb-6 px-2 sm:px-4">
      {/* Ph / DO History Line Chart */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition w-full max-w-[600px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">DO / Ph Trend</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-800">ค่าเฉลี่ยรายวัน</div>
          </div>
          {/* Legend for mobile */}
          <div className="fflex flex-wrap justify-center sm:justify-start mt-2 sm:mt-0 gap-2">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-indigo-500 mr-1"></div>
              <span className="text-xs">pH</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-cyan-500 mr-1"></div>
              <span className="text-xs">DO</span>
            </div>
          </div>
        </div>
        <div ref={lineChartContainerRef} className="w-full overflow-hidden">
          <ResponsiveContainer width="100%" height={getChartHeight()}>
            <LineChart data={simplifiedLineData}>
              <CartesianGrid vertical={false} stroke="#eee" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false}
                interval="preserveStartEnd"
                tick={{ fontSize: windowWidth < 768 ? 10 : 12 }} 
              />
              <Tooltip wrapperStyle={{ fontSize: '12px' }} />
              <Line 
                type="monotone" 
                dataKey="ph" 
                stroke="#6366F1" 
                strokeWidth={3} 
                dot={windowWidth > 768} 
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="do" 
                stroke="#06B6D4" 
                strokeWidth={3} 
                dot={windowWidth > 768}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sensor Values Bar Chart */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-md transition w-full max-w-[600px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
          <div className="text-md font-bold mb-2 sm:mb-0">สถิติเซ็นเซอร์รายวัน (ค่าเฉลี่ย)</div>
          
          {/* Legend for mobile */}
          <div className="flex flex-wrap justify-center sm:justify-start gap-2">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-indigo-500 mr-1"></div>
              <span className="text-xs">DO</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-cyan-500 mr-1"></div>
              <span className="text-xs">pH</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-indigo-200 mr-1"></div>
              <span className="text-xs">Temp</span>
            </div>
          </div>
        </div>
        <div ref={barChartContainerRef} className="w-full overflow-hidden">
          <ResponsiveContainer width="100%" height={getChartHeight()}>
            <BarChart data={barChartData} maxBarSize={windowWidth < 640 ? 15 : 30}>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: windowWidth < 768 ? 10 : 12 }}
              />
              <Tooltip wrapperStyle={{ fontSize: '12px' }} />
              <Bar 
                dataKey="do" 
                stackId="a" 
                fill="#6366F1" 
                radius={[6, 6, 0, 0]} 
              />
              <Bar 
                dataKey="ph" 
                stackId="a" 
                fill="#06B6D4" 
                radius={[6, 6, 0, 0]} 
              />
              <Bar 
                dataKey="temp" 
                stackId="a" 
                fill="#A5B4FC" 
                radius={[6, 6, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}


//////// MAIN /////////
// import React, { useState, useEffect } from "react";
// import {
//   LineChart,
//   Line,
//   BarChart,
//   Bar,
//   XAxis,
//   CartesianGrid,
//   ResponsiveContainer,
//   Tooltip
// } from "recharts";
// import { collection, query, where, getDocs } from "firebase/firestore";
// import { db } from '../../lib/firebase';

// export default function ChartsRow() {
//   const [lineChartData, setLineChartData] = useState([]);
//   const [barChartData, setBarChartData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     async function fetchSensorData() {
//       try {
//         // ดึงข้อมูล pH (sensor_id: "1") จาก collection datalog
//         const phQuery = query(
//           collection(db, "datalog"),
//           where("sensor_id", "==", "1")
//         );
        
//         // ดึงข้อมูล DO (sensor_id: "2") จาก collection datalog
//         const doQuery = query(
//           collection(db, "datalog"),
//           where("sensor_id", "==", "2")
//         );
        
//         // ดึงข้อมูลพร้อมกันทั้งสองชุด
//         const [phSnapshot, doSnapshot] = await Promise.all([
//           getDocs(phQuery),
//           getDocs(doQuery)
//         ]);
        
//         // ประมวลผลข้อมูล pH
//         const phData = {};
//         phSnapshot.forEach((doc) => {
//           const data = doc.data();
          
//           // ตรวจสอบว่ามี timestamp หรือไม่
//           if (!data.timestamp) return;
          
//           const timestamp = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
          
//           // สร้าง key ตามวันที่
//           const day = timestamp.getDate();
//           const month = timestamp.getMonth();
//           const year = timestamp.getFullYear();
//           const dateKey = `${year}-${month}-${day}`;
          
//           // จัดรูปแบบวันที่สำหรับแสดงผล
//           const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", 
//                              "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
//           const displayDate = `${day} ${monthNames[month]}`;
          
//           // เก็บค่า pH พร้อมกับ timestamp
//           if (!phData[dateKey]) {
//             phData[dateKey] = {
//               values: [],
//               displayDate,
//               shortName: day.toString(),
//               timestamp
//             };
//           }
          
//           // เก็บค่า pH (ตรวจสอบฟิลด์ที่เก็บค่า)
//           const sensorValue = data.value !== undefined ? data.value : 
//                              (data.ph !== undefined ? data.ph : null);
          
//           if (sensorValue !== null) {
//             phData[dateKey].values.push(parseFloat(sensorValue));
//           }
//         });
        
//         // ประมวลผลข้อมูล DO
//         const doData = {};
//         doSnapshot.forEach((doc) => {
//           const data = doc.data();
          
//           // ตรวจสอบว่ามี timestamp หรือไม่
//           if (!data.timestamp) return;
          
//           const timestamp = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
          
//           // สร้าง key ตามวันที่
//           const day = timestamp.getDate();
//           const month = timestamp.getMonth();
//           const year = timestamp.getFullYear();
//           const dateKey = `${year}-${month}-${day}`;
          
//           // จัดรูปแบบวันที่สำหรับแสดงผล
//           const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", 
//                              "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
//           const displayDate = `${day} ${monthNames[month]}`;
          
//           // เก็บค่า DO พร้อมกับ timestamp
//           if (!doData[dateKey]) {
//             doData[dateKey] = {
//               values: [],
//               displayDate,
//               shortName: day.toString(),
//               timestamp
//             };
//           }
          
//           // เก็บค่า DO (ตรวจสอบฟิลด์ที่เก็บค่า)
//           const sensorValue = data.value !== undefined ? data.value : 
//                              (data.do !== undefined ? data.do : null);
          
//           if (sensorValue !== null) {
//             doData[dateKey].values.push(parseFloat(sensorValue));
//           }
//         });
        
//         // รวมข้อมูลและคำนวณค่าเฉลี่ย
//         const allDates = [...new Set([...Object.keys(phData), ...Object.keys(doData)])];
        
//         const processedData = allDates.map(dateKey => {
//           // คำนวณค่าเฉลี่ย pH
//           const phValues = phData[dateKey]?.values || [];
//           const phAvg = phValues.length > 0 
//             ? phValues.reduce((sum, val) => sum + val, 0) / phValues.length 
//             : 0;
          
//           // คำนวณค่าเฉลี่ย DO
//           const doValues = doData[dateKey]?.values || [];
//           const doAvg = doValues.length > 0 
//             ? doValues.reduce((sum, val) => sum + val, 0) / doValues.length 
//             : 0;
          
//           // ใช้ข้อมูลการแสดงผลจาก dataset ที่มี
//           const displayInfo = phData[dateKey] || doData[dateKey];
          
//           return {
//             dateKey,
//             name: displayInfo.displayDate,
//             shortName: displayInfo.shortName,
//             ph: phAvg,
//             do: doAvg,
//             // ข้อมูลอุณหภูมิ (ถ้ามี)
//             temp: 26, // ค่าเริ่มต้นกรณีไม่มีข้อมูลอุณหภูมิ
//             timestamp: displayInfo.timestamp
//           };
//         });
        
//         // เรียงตามวันที่
//         processedData.sort((a, b) => a.timestamp - b.timestamp);
        
//         // เลือกเฉพาะ 5 วันล่าสุด
//         const recentData = processedData.slice(-5);
        
//         // จัดรูปแบบข้อมูลสำหรับกราฟ
//         const lineData = recentData.map(item => ({
//           name: item.name,
//           ph: parseFloat(item.ph.toFixed(1)),
//           do: parseFloat(item.do.toFixed(1))
//         }));
        
//         const barData = recentData.map(item => ({
//           name: item.shortName,
//           do: parseFloat(item.do.toFixed(1)),
//           ph: parseFloat(item.ph.toFixed(1)),
//           temp: parseFloat(item.temp.toFixed(1))
//         }));
        
//         setLineChartData(lineData);
//         setBarChartData(barData);
//       } catch (error) {
//         console.error("Error fetching sensor data:", error);
//         setError(error.message);
//       } finally {
//         setLoading(false);
//       }
//     }
    
//     fetchSensorData();
//   }, []);

//   if (loading) {
//     return (
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
//         <div className="bg-white p-6 rounded-xl shadow-md">
//           <div className="text-center py-8">กำลังโหลดข้อมูลเซ็นเซอร์...</div>
//         </div>
//         <div className="bg-white p-6 rounded-xl shadow-md">
//           <div className="text-center py-8">กำลังโหลดข้อมูลเซ็นเซอร์...</div>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
//         <div className="bg-white p-6 rounded-xl shadow-md">
//           <div className="text-center py-8 text-red-500">เกิดข้อผิดพลาด: {error}</div>
//         </div>
//         <div className="bg-white p-6 rounded-xl shadow-md">
//           <div className="text-center py-8 text-red-500">ไม่สามารถโหลดข้อมูลได้</div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
//       {/* Ph / DO History Line Chart */}
//       <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition">
//         <div className="flex justify-between items-center mb-4">
//           <div>
//             <div className="text-xs text-gray-500 mb-1">DO / Ph Trend</div>
//             <div className="text-2xl font-bold text-gray-800">ค่าเฉลี่ยรายวัน</div>
//           </div>
//         </div>
//         <ResponsiveContainer width="100%" height={150}>
//           <LineChart data={lineChartData}>
//             <CartesianGrid vertical={false} stroke="#eee" />
//             <XAxis dataKey="name" axisLine={false} tickLine={false} />
//             <Tooltip />
//             <Line type="monotone" dataKey="ph" stroke="#6366F1" strokeWidth={3} dot={false} />
//             <Line type="monotone" dataKey="do" stroke="#06B6D4" strokeWidth={3} dot={false} />
//           </LineChart>
//         </ResponsiveContainer>
//       </div>

//       {/* Sensor Values Bar Chart */}
//       <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition">
//         <div className="flex justify-between items-center mb-4">
//           <div className="text-md font-bold">สถิติเซ็นเซอร์รายวัน (ค่าเฉลี่ย)</div>
//         </div>
//         <ResponsiveContainer width="100%" height={150}>
//           <BarChart data={barChartData}>
//             <XAxis dataKey="name" axisLine={false} tickLine={false} />
//             <Tooltip />
//             <Bar dataKey="do" stackId="a" fill="#6366F1" radius={[10, 10, 0, 0]} />
//             <Bar dataKey="ph" stackId="a" fill="#06B6D4" radius={[10, 10, 0, 0]} />
//             <Bar dataKey="temp" stackId="a" fill="#A5B4FC" radius={[10, 10, 0, 0]} />
//           </BarChart>
//         </ResponsiveContainer>
//       </div>
//     </div>
//   );
// }



// import React from "react";
// import {
//   LineChart,
//   Line,
//   BarChart,
//   Bar,
//   XAxis,
//   CartesianGrid,
//   ResponsiveContainer,
//   Tooltip
// } from "recharts";

// // DO/Ph รายวันย้อนหลัง
// const lineChartData = [
//   { name: "17 APR", ph: 6.3, do: 6.9 },
//   { name: "18 APR", ph: 6.2, do: 7.1 },
//   { name: "19 APR", ph: 6.4, do: 7.3 },
//   { name: "20 APR", ph: 6.3, do: 7.0 },
//   { name: "21 APR", ph: 6.4, do: 7.2 },
// ];

// // สถิติ Sensor รายวัน: DO / PH / TEMP (stack bar)
// const barChartData = [
//   { name: "17", do: 7.1, ph: 6.3, temp: 26 },
//   { name: "18", do: 7.2, ph: 6.4, temp: 27 },
//   { name: "19", do: 7.3, ph: 6.2, temp: 26.5 },
//   { name: "20", do: 7.0, ph: 6.4, temp: 27.1 },
//   { name: "21", do: 7.1, ph: 6.3, temp: 26.8 },
// ];

// export default function ChartsRow() {
//   return (
//     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
//       {/* Ph / DO History Line Chart */}
//       <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition">
//         <div className="flex justify-between items-center mb-4">
//           <div>
//             <div className="text-xs text-gray-500 mb-1">DO / Ph Trend</div>
//             <div className="text-2xl font-bold text-gray-800">Daily Sensor Overview</div>
//           </div>
//         </div>
//         <ResponsiveContainer width="100%" height={150}>
//           <LineChart data={lineChartData}>
//             <CartesianGrid vertical={false} stroke="#eee" />
//             <XAxis dataKey="name" axisLine={false} tickLine={false} />
//             <Tooltip />
//             <Line type="monotone" dataKey="ph" stroke="#6366F1" strokeWidth={3} dot={false} />
//             <Line type="monotone" dataKey="do" stroke="#06B6D4" strokeWidth={3} dot={false} />
//           </LineChart>
//         </ResponsiveContainer>
//       </div>

//       {/* Sensor Values Bar Chart */}
//       <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition">
//         <div className="flex justify-between items-center mb-4">
//           <div className="text-md font-bold">Daily Sensor Stats</div>
//         </div>
//         <ResponsiveContainer width="100%" height={150}>
//           <BarChart data={barChartData}>
//             <XAxis dataKey="name" axisLine={false} tickLine={false} />
//             <Tooltip />
//             <Bar dataKey="do" stackId="a" fill="#6366F1" radius={[10, 10, 0, 0]} />
//             <Bar dataKey="ph" stackId="a" fill="#06B6D4" radius={[10, 10, 0, 0]} />
//             <Bar dataKey="temp" stackId="a" fill="#A5B4FC" radius={[10, 10, 0, 0]} />
//           </BarChart>
//         </ResponsiveContainer>
//       </div>
//     </div>
//   );
// }