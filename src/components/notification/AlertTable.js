import React, { useState, useEffect } from "react";
import { Check, X, AlertCircle, AlertTriangle, CheckCircle, Bell, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const pHLimits = {
    min: 6.5,
    max: 8.5,
    dangerousLow: 5.0,
    dangerousHigh: 9.0,
};
  
const doLimits = {
    min: 5.0,
    max: 12.0,
};

const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Unknown";
    let date = new Date(
        typeof timestamp === 'string' ? timestamp :
        timestamp?.seconds ? timestamp.seconds * 1000 :
        timestamp
    );
    return date.toLocaleString('th-TH', { hour12: false });
};

export default function AlertTable() {
    // State for alerts and filters
    const [alerts, setAlerts] = useState([]);
    const [filter, setFilter] = useState("all");
    const [isLoading, setIsLoading] = useState(true);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const alertsPerPage = 10; // จำนวนแจ้งเตือนต่อหน้า

    // Load settings and alerts on component mount
    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                setIsLoading(true);
                
                // สร้าง collection สำหรับเก็บการแจ้งเตือน
                const alertsRef = collection(db, 'alerts');
                
                // สร้าง query ตามเงื่อนไขการกรอง
                let alertQuery;
                if (filter === "all") {
                    alertQuery = query(
                        alertsRef, 
                        orderBy("timestamp", "desc"), 
                        limit(alertsPerPage * currentPage)
                    );
                } else if (filter === "unread") {
                    alertQuery = query(
                        alertsRef, 
                        where("read", "==", false),
                        orderBy("timestamp", "desc"), 
                        limit(alertsPerPage * currentPage)
                    );
                } else if (filter === "error" || filter === "warning") {
                    alertQuery = query(
                        alertsRef, 
                        where("type", "==", filter),
                        orderBy("timestamp", "desc"), 
                        limit(alertsPerPage * currentPage)
                    );
                }
                
                // ดึงข้อมูลการแจ้งเตือน
                const snapshot = await getDocs(alertQuery);
                
                // คำนวณจำนวนหน้าทั้งหมด
                const totalCount = snapshot.size;
                setTotalPages(Math.ceil(totalCount / alertsPerPage));
                
                // แปลงข้อมูลจาก Firestore
                const fetchedAlerts = [];
                snapshot.forEach(doc => {
                    fetchedAlerts.push({
                        id: doc.id,
                        ...doc.data(),
                        timestamp: formatTimestamp(doc.data().timestamp)
                    });
                });
                
                setAlerts(fetchedAlerts);
            } catch (error) {
                console.error("Error fetching alerts:", error);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchAlerts();
        
        // ดึงข้อมูลล่าสุดและสร้างการแจ้งเตือนใหม่
        const fetchLatestData = async () => {
            try {
                const datalogRef = collection(db, 'datalog');
                const snapshot = await getDocs(datalogRef);
                
                const rawPH = [];
                const rawDO = [];
                
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const id = doc.id;
                    if (data.sensor_id === "1") rawPH.push({ id, ...data });
                    else if (data.sensor_id === "2") rawDO.push({ id, ...data });
                });
                
                const getLatest = (arr) =>
                    arr
                    .filter(d => d.timestamp)
                    .sort((a, b) => {
                        const ta = a.timestamp?.seconds || new Date(a.timestamp).getTime() / 1000;
                        const tb = b.timestamp?.seconds || new Date(b.timestamp).getTime() / 1000;
                        return tb - ta;
                    })[0];
                
                const latestPH = getLatest(rawPH);
                const latestDO = getLatest(rawDO);
                
                // สร้างการแจ้งเตือน
                const alertsRef = collection(db, 'alerts');
                
                // ตรวจสอบค่า pH
                if (latestPH) {
                    const value = parseFloat(latestPH.value || 0);
                    let type = 'success';
                    let message = `ค่า pH วัดได้ ${value}`;
                    
                    if (value < pHLimits.dangerousLow || value > pHLimits.dangerousHigh) {
                        type = 'error';
                        message += ` (อันตราย)`;
                    } else if (value < pHLimits.min || value > pHLimits.max) {
                        type = 'warning';
                        message += ` (ควรระวัง)`;
                    } else {
                        message += ` (อยู่ในเกณฑ์)`;
                    }
                    
                    // เพิ่มการแจ้งเตือนใหม่ไปยัง Firestore
                    if (type !== 'success' || localStorage.getItem('showSuccessAlerts') === 'true') {
                        await addDoc(alertsRef, {
                            type,
                            title: "แจ้งเตือนค่า pH",
                            message,
                            timestamp: serverTimestamp(),
                            read: false,
                            sensor: "pH",
                            location: "บ่อเลี้ยงปลา A",
                            value: value,
                            sensorId: "1",
                            // เพิ่ม TTL (Time To Live) - ระยะเวลาหมดอายุ 7 วัน
                            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                        });
                    }
                }
                
                // ตรวจสอบค่า DO
                if (latestDO) {
                    const value = parseFloat(latestDO.value || 0);
                    let type = 'success';
                    let message = `ค่า DO วัดได้ ${value} mg/L`;
                    
                    if (value < doLimits.min) {
                        type = 'warning';
                        message += ` (ต่ำกว่าเกณฑ์)`;
                    } else if (value > doLimits.max) {
                        type = 'warning';
                        message += ` (สูงกว่าเกณฑ์)`;
                    } else {
                        message += ` (อยู่ในเกณฑ์)`;
                    }
                    
                    // เพิ่มการแจ้งเตือนใหม่ไปยัง Firestore
                    if (type !== 'success' || localStorage.getItem('showSuccessAlerts') === 'true') {
                        await addDoc(alertsRef, {
                            type,
                            title: "แจ้งเตือนค่า DO",
                            message,
                            timestamp: serverTimestamp(),
                            read: false,
                            sensor: "DO",
                            location: "บ่อเลี้ยงกุ้ง B",
                            value: value,
                            sensorId: "2",
                            // เพิ่ม TTL (Time To Live) - ระยะเวลาหมดอายุ 7 วัน
                            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                        });
                    }
                }
                
                // รีเฟรชข้อมูลการแจ้งเตือน
                fetchAlerts();
                
            } catch (error) {
                console.error("Error creating alerts:", error);
            }
        };
        
        // รันครั้งแรกเมื่อโหลดคอมโพเนนต์
        fetchLatestData();
        
        // ตั้งเวลาเช็คข้อมูลตามการตั้งค่า
        const intervalMs = {
            '10s': 10_000,
            '5m': 5 * 60_000,
            '30m': 30 * 60_000,
            '3h': 3 * 60 * 60_000,
            '24h': 24 * 60 * 60_000
        };
        
        const refreshDelay = intervalMs[localStorage.getItem('refreshInterval') || '10s'];
        const interval = setInterval(fetchLatestData, refreshDelay);
        
        // ลบ Cloud Function (Firebase) ทำงานอัตโนมัติเพื่อลบการแจ้งเตือนที่หมดอายุ
        // (ต้องสร้าง Cloud Function แยกต่างหาก)
        
        return () => clearInterval(interval);
    }, [filter, currentPage]);

    // Mark alert as read
    const markAsRead = async (id) => {
        try {
            const alertRef = doc(db, 'alerts', id);
            await updateDoc(alertRef, {
                read: true
            });
            
            // อัปเดต state ท้องถิ่น
            setAlerts(alerts.map(alert => 
                alert.id === id ? { ...alert, read: true } : alert
            ));
        } catch (error) {
            console.error("Error marking alert as read:", error);
        }
    };

    // Dismiss alert
    const dismissAlert = async (id) => {
        try {
            // ลบการแจ้งเตือนจาก Firestore
            await deleteDoc(doc(db, 'alerts', id));
            
            // อัปเดต state ท้องถิ่น
            setAlerts(alerts.filter(alert => alert.id !== id));
        } catch (error) {
            console.error("Error dismissing alert:", error);
        }
    };

    // ฟังก์ชันเปลี่ยนหน้า
    const goToPage = (page) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    // Get notification settings
    const shouldShowPHAlerts = localStorage.getItem('showPHAlerts') !== 'false';
    const shouldShowDOAlerts = localStorage.getItem('showDOAlerts') !== 'false';

    return (
        <div className="w-full bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            {/* Header with title and filters */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div className="flex items-center mb-4 sm:mb-0">
                        <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                            <Bell className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">การแจ้งเตือน</h2>
                            <p className="text-sm text-gray-600 mt-1">
                                {isLoading 
                                    ? "กำลังโหลดข้อมูล..." 
                                    : `${alerts.length} รายการ ${alerts.filter(a => !a.read).length ? `(${alerts.filter(a => !a.read).length} รายการใหม่)` : ''}`
                                }
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center mt-4 sm:mt-0">
                        <div className="relative">
                            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg">
                                <div className="p-2 border-r border-gray-200">
                                    <Filter className="h-4 w-4 text-gray-500" />
                                </div>
                                <select 
                                    className="bg-transparent border-none text-sm sm:text-base p-2 pr-8 focus:ring-0 focus:outline-none text-gray-700"
                                    value={filter}
                                    onChange={(e) => {
                                        setFilter(e.target.value);
                                        setCurrentPage(1); // รีเซ็ตหน้าเมื่อเปลี่ยนตัวกรอง
                                    }}
                                >
                                    <option value="all">ทั้งหมด</option>
                                    <option value="unread">ยังไม่อ่าน</option>
                                    <option value="error">เตือนวิกฤต</option>
                                    <option value="warning">เตือนเบื้องต้น</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap space-x-2 mb-4">
                    <button 
                        className={`px-4 py-2 rounded-lg text-sm transition ${filter === 'all' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        onClick={() => {
                            setFilter('all');
                            setCurrentPage(1);
                        }}
                    >
                        ทั้งหมด
                    </button>
                    <button 
                        className={`px-4 py-2 rounded-lg text-sm transition ${filter === 'unread' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        onClick={() => {
                            setFilter('unread');
                            setCurrentPage(1);
                        }}
                    >
                        ยังไม่อ่าน
                    </button>
                    <button 
                        className={`px-4 py-2 rounded-lg text-sm transition ${filter === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        onClick={() => {
                            setFilter('error');
                            setCurrentPage(1);
                        }}
                    >
                        เตือนวิกฤต
                    </button>
                    <button 
                        className={`px-4 py-2 rounded-lg text-sm transition ${filter === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        onClick={() => {
                            setFilter('warning');
                            setCurrentPage(1);
                        }}
                    >
                        เตือนเบื้องต้น
                    </button>
                </div>
            </div>

            {/* Loading state */}
            {isLoading && (
                <div className="flex justify-center items-center py-12">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
            )}

            {/* Empty state */}
            {!isLoading && alerts.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Bell className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">ไม่มีการแจ้งเตือน</h3>
                    <p className="mt-2 text-sm text-gray-500">ไม่พบการแจ้งเตือนที่ตรงกับเงื่อนไขการกรอง</p>
                </div>
            )}

            {/* Alert list */}
            {!isLoading && alerts.length > 0 && (
                <div className="space-y-4">
                    {alerts.map((alert) => {
                        // Filter based on notification settings
                        if (alert.sensor === "pH" && !shouldShowPHAlerts) return null;
                        if (alert.sensor === "DO" && !shouldShowDOAlerts) return null;
                        
                        return (
                            <div 
                                key={alert.id} 
                                className={`w-full relative bg-white border rounded-lg overflow-hidden hover:bg-gray-50 transition ${!alert.read ? 'border-gray-300' : 'border-gray-200'}`}
                            >
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                                    alert.type === "error"
                                    ? "bg-red-500"
                                    : alert.type === "warning"
                                    ? "bg-yellow-500"
                                    : alert.type === "success"
                                    ? "bg-green-500"
                                    : "bg-gray-500"
                                }`}
                                ></div>

                                <div className={`p-4 pl-6 flex justify-between items-start w-full ${!alert.read ? 'bg-indigo-50/30' : ''}`}>
                                    <div className="w-full">
                                        <div className="flex items-center">
                                            {alert.type === "error" && <AlertCircle className="text-red-500 mr-2 h-5 w-5"/>}
                                            {alert.type === "warning" && <AlertTriangle className="text-yellow-500 mr-2 h-5 w-5"/>}
                                            {alert.type === "success" && <CheckCircle className="text-green-500 mr-2 h-5 w-5"/>}
                                            <h3 className={`font-medium ${!alert.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                                {alert.title}
                                                {!alert.read && <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full"></span>}
                                            </h3>
                                        </div>
                                        <p className={`text-sm mt-1 ${!alert.read ? 'text-gray-700' : 'text-gray-600'}`}>{alert.message}</p>
                                        <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1 items-center">
                                            <span className="inline-flex items-center">
                                                <span className="w-1 h-1 bg-gray-400 rounded-full mr-1.5"></span>
                                                {alert.timestamp}
                                            </span>
                                            <span className="inline-flex items-center">
                                                <span className="w-1 h-1 bg-gray-400 rounded-full mr-1.5"></span>
                                                เซนเซอร์: {alert.sensor}
                                            </span>
                                            <span className="inline-flex items-center">
                                                <span className="w-1 h-1 bg-gray-400 rounded-full mr-1.5"></span>
                                                ตำแหน่ง: {alert.location}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex space-x-2 ml-4">
                                        <button 
                                            onClick={() => markAsRead(alert.id)}
                                            className="w-8 h-8 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full flex items-center justify-center transition"
                                            title="ทำเครื่องหมายว่าอ่านแล้ว"
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button 
                                            onClick={() => dismissAlert(alert.id)}
                                            className="w-8 h-8 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full flex items-center justify-center transition"
                                            title="ลบการแจ้งเตือน"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-6">
                    <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`p-2 rounded-md ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-indigo-600 hover:bg-indigo-50'}`}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={`w-8 h-8 rounded-md ${currentPage === page ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-indigo-50'}`}
                        >
                            {page}
                        </button>
                    ))}
                    
                    <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`p-2 rounded-md ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-indigo-600 hover:bg-indigo-50'}`}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
            
            {/* Settings Integration Notice */}
            <div className="mt-6 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
                <p>การแสดงผลการแจ้งเตือนนี้อ้างอิงจากการตั้งค่าในหน้า <strong>ตั้งค่าระบบ</strong></p>
                <p className="mt-1">ระยะเวลารีเฟรช: {localStorage.getItem('refreshInterval') === '10s' ? '10 วินาที' : 
                                           localStorage.getItem('refreshInterval') === '5m' ? '5 นาที' : 
                                           localStorage.getItem('refreshInterval') === '30m' ? '30 นาที' : 
                                           localStorage.getItem('refreshInterval') === '3h' ? '3 ชั่วโมง' : 
                                           '24 ชั่วโมง'}</p>
                <p className="mt-1">การแจ้งเตือนจะถูกลบอัตโนมัติหลังจาก 7 วัน</p>
            </div>
        </div>
    );
}


///////// main
// import React, { useState, useEffect } from "react";
// import { Check, X, AlertCircle, AlertTriangle, CheckCircle, Bell, Filter } from "lucide-react";
// import { db } from '../../lib/firebase';
// import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';


// const pHLimits = {
//     min: 6.5,
//     max: 8.5,
//     dangerousLow: 5.0,
//     dangerousHigh: 9.0,
// };
  
// const doLimits = {
//     min: 5.0,
//     max: 12.0,
// };

// const formatTimestamp = (timestamp) => {
//     if (!timestamp) return "Unknown";
//     let date = new Date(
//       typeof timestamp === 'string' ? timestamp :
//       timestamp?.seconds ? timestamp.seconds * 1000 :
//       timestamp
//     );
//     return date.toLocaleString('th-TH', { hour12: false });
// };

// export default function AlertTable() {
//     // State for alerts and filters
//     const [alerts, setAlerts] = useState([]);
//     const [filter, setFilter] = useState("all");
//     const [isLoading, setIsLoading] = useState(true);

//     // Example data
//     const mockAlerts = [
//         {
//             id: 1,
//             type: "error",
//             title: "ค่า pH ต่ำเกินไป",
//             message: "ค่า pH วัดได้ 4.2 (ต่ำกว่าเกณฑ์ 6.5)",
//             timestamp: "2025-04-20 16:00 น.",
//             read: false,
//             sensor: "pH",
//             location: "บ่อเลี้ยงปลา A",
//         },
//         {
//             id: 2,
//             type: "warning",
//             title: "ค่า DO ต่ำกว่าเกณฑ์",
//             message: "ค่า DO วัดได้ 3.2 mg/L (ต่ำกว่า 4.0 mg/L)",
//             timestamp: "2025-04-20 18:00 น.",
//             read: false,
//             sensor: "DO",
//             location: "บ่อเลี้ยงกุ้ง B",
//         },
//         {
//             id: 3,
//             type: "success",
//             title: "ค่า pH กลับสู่ค่าปกติ",
//             message: "ค่า pH วัดได้ 6.9 (อยู่ในช่วง 6.5-8.5)",
//             timestamp: "2025-04-20 18:30 น.",
//             read: true,
//             sensor: "pH",
//             location: "บ่อเลี้ยงปลา A",
//         },
//         {
//             id: 4,
//             type: "warning",
//             title: "อุณหภูมิน้ำสูงกว่าปกติ",
//             message: "อุณหภูมิวัดได้ 32°C (สูงกว่า 30°C)",
//             timestamp: "2025-04-20 14:30 น.",
//             read: false,
//             sensor: "Temperature",
//             location: "บ่อเลี้ยงปลา C",
//         },
//         {
//             id: 5,
//             type: "error",
//             title: "ค่า DO วิกฤต",
//             message: "ค่า DO วัดได้ 2.1 mg/L (ต่ำกว่า 3.0 mg/L)",
//             timestamp: "2025-04-21 06:15 น.",
//             read: false,
//             sensor: "DO",
//             location: "บ่อเลี้ยงกุ้ง B",
//         }
//     ];

//     // Load settings and alerts on component mount
//     useEffect(() => {
//         // Keep track of existing alert IDs to prevent duplicates
//         const existingAlertIds = new Set();
        
//         const fetchLatestData = async () => {
//           try {
//             // Get current alert IDs for duplicate checking
//             setAlerts((currentAlerts) => {
//               currentAlerts.forEach(alert => existingAlertIds.add(alert.id));
//               return currentAlerts;
//             });
            
//             const datalogRef = collection(db, 'datalog');
//             const snapshot = await getDocs(datalogRef);
      
//             const rawPH = [];
//             const rawDO = [];
      
//             snapshot.forEach((doc) => {
//               const data = doc.data();
//               const id = doc.id;
//               if (data.sensor_id === "1") rawPH.push({ id, ...data });
//               else if (data.sensor_id === "2") rawDO.push({ id, ...data });
//             });
      
//             const getLatest = (arr) =>
//               arr
//                 .filter(d => d.timestamp)
//                 .sort((a, b) => {
//                   const ta = a.timestamp?.seconds || new Date(a.timestamp).getTime() / 1000;
//                   const tb = b.timestamp?.seconds || new Date(b.timestamp).getTime() / 1000;
//                   return tb - ta;
//                 })[0];
      
//             const latestPH = getLatest(rawPH);
//             const latestDO = getLatest(rawDO);
      
//             const newAlerts = [];
      
//             if (latestPH) {
//                 // Generate a truly unique ID with timestamp, random string and doc ID
//                 const tsPH = latestPH.timestamp?.seconds ?? Math.floor(new Date(latestPH.timestamp).getTime() / 1000) ?? Date.now();
//                 const randomPart = Math.random().toString(36).substring(2, 8);
//                 const id = `ph-${tsPH}-${latestPH.id}-${randomPart}`;
                
//                 // Check if this alert already exists using the Set
//                 if (!existingAlertIds.has(id)) {
//                     const value = parseFloat(latestPH.value || 0);
//                     let type = 'success';
//                     let message = `ค่า pH วัดได้ ${value}`;
        
//                     if (value < pHLimits.dangerousLow || value > pHLimits.dangerousHigh) {
//                         type = 'error';
//                         message += ` (อันตราย)`;
//                     } else if (value < pHLimits.min || value > pHLimits.max) {
//                         type = 'warning';
//                         message += ` (ควรระวัง)`;
//                     } else {
//                         message += ` (อยู่ในเกณฑ์)`;
//                     }
        
//                     newAlerts.push({
//                         id,
//                         type,
//                         title: "แจ้งเตือนค่า pH",
//                         message,
//                         timestamp: formatTimestamp(latestPH.timestamp),
//                         read: false,
//                         sensor: "pH",
//                         location: "บ่อเลี้ยงปลา A"
//                     });
                    
//                     // Add to tracking set
//                     existingAlertIds.add(id);
//                 }
//             }
      
//             if (latestDO) {
//                 // Generate a truly unique ID with timestamp, random string and doc ID
//                 const tsDO = latestDO.timestamp?.seconds ?? Math.floor(new Date(latestDO.timestamp).getTime() / 1000) ?? Date.now();
//                 const randomPart = Math.random().toString(36).substring(2, 8);
//                 const id = `do-${tsDO}-${latestDO.id}-${randomPart}`;
                
//                 // Check if this alert already exists using the Set
//                 if (!existingAlertIds.has(id)) {
//                     const value = parseFloat(latestDO.value || 0);
//                     let type = 'success';
//                     let message = `ค่า DO วัดได้ ${value} mg/L`;
        
//                     if (value < doLimits.min) {
//                         type = 'warning';
//                         message += ` (ต่ำกว่าเกณฑ์)`;
//                     } else if (value > doLimits.max) {
//                         type = 'warning';
//                         message += ` (สูงกว่าเกณฑ์)`;
//                     } else {
//                         message += ` (อยู่ในเกณฑ์)`;
//                     }
        
//                     newAlerts.push({
//                         id,
//                         type,
//                         title: "แจ้งเตือนค่า DO",
//                         message,
//                         timestamp: formatTimestamp(latestDO.timestamp),
//                         read: false,
//                         sensor: "DO",
//                         location: "บ่อเลี้ยงกุ้ง B"
//                     });
                    
//                     // Add to tracking set
//                     existingAlertIds.add(id);
//                 }
//             }
      
//             // Add new alerts to state if there are any
//             if (newAlerts.length > 0) {
//               setAlerts(prev => [...newAlerts, ...prev]);
//             }
//           } catch (error) {
//             console.error("Error fetching alerts:", error);
//           } finally {
//             setIsLoading(false);
//           }
//         };
      
//         fetchLatestData();
      
//         const intervalMs = {
//           '10s': 10_000,
//           '5m': 5 * 60_000,
//           '30m': 30 * 60_000,
//           '3h': 3 * 60 * 60_000,
//           '24h': 24 * 60 * 60_000
//         };
      
//         const refreshDelay = intervalMs[localStorage.getItem('refreshInterval') || '10s'];
//         const interval = setInterval(fetchLatestData, refreshDelay);
      
//         return () => clearInterval(interval);
//     }, []);

//     // Mark alert as read
//     const markAsRead = (id) => {
//         setAlerts(alerts.map(alert => 
//             alert.id === id ? { ...alert, read: true } : alert
//         ));
//     };

//     // Dismiss alert
//     const dismissAlert = (id) => {
//         setAlerts(alerts.filter(alert => alert.id !== id));
//     };

//     // Filter alerts based on current filter
//     const filteredAlerts = filter === "all" 
//         ? alerts 
//         : filter === "unread" 
//             ? alerts.filter(alert => !alert.read)
//             : filter === "error"
//                 ? alerts.filter(alert => alert.type === "error")
//                 : filter === "warning"
//                     ? alerts.filter(alert => alert.type === "warning")
//                     : alerts;

//     // Get notification settings to check if certain alerts should be shown
//     const shouldShowPHAlerts = localStorage.getItem('showPHAlerts') !== 'false';
//     const shouldShowDOAlerts = localStorage.getItem('showDOAlerts') !== 'false';

//     return (
//         <div className="w-full bg-white rounded-xl shadow-sm p-4 border border-gray-100">
//             {/* Header with title and filters */}
//             <div className="mb-6">
//                 <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
//                     <div className="flex items-center mb-4 md:mb-0">
//                         <div className="bg-indigo-100 p-2 rounded-lg mr-3">
//                             <Bell className="h-5 w-5 text-indigo-600" />
//                         </div>
//                         <div>
//                             <h2 className="text-xl font-semibold text-gray-800">การแจ้งเตือน</h2>
//                             <p className="text-sm text-gray-600 mt-1">
//                                 {isLoading 
//                                     ? "กำลังโหลดข้อมูล..." 
//                                     : `${filteredAlerts.length} รายการ ${filteredAlerts.filter(a => !a.read).length ? `(${filteredAlerts.filter(a => !a.read).length} รายการใหม่)` : ''}`
//                                 }
//                             </p>
//                         </div>
//                     </div>
                    
//                     <div className="flex items-center">
//                         <div className="relative">
//                             <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg">
//                                 <div className="p-2 border-r border-gray-200">
//                                     <Filter className="h-4 w-4 text-gray-500" />
//                                 </div>
//                                 <select 
//                                     className="bg-transparent border-none text-sm p-2 pr-8 focus:ring-0 focus:outline-none text-gray-700"
//                                     value={filter}
//                                     onChange={(e) => setFilter(e.target.value)}
//                                 >
//                                     <option value="all">ทั้งหมด</option>
//                                     <option value="unread">ยังไม่อ่าน</option>
//                                     <option value="error">เตือนวิกฤต</option>
//                                     <option value="warning">เตือนเบื้องต้น</option>
//                                 </select>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 <div className="flex flex-wrap space-x-2 mb-4">
//                     <button 
//                         className={`px-4 py-2 rounded-lg text-sm transition ${filter === 'all' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
//                         onClick={() => setFilter('all')}
//                     >
//                         ทั้งหมด
//                     </button>
//                     <button 
//                         className={`px-4 py-2 rounded-lg text-sm transition ${filter === 'unread' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
//                         onClick={() => setFilter('unread')}
//                     >
//                         ยังไม่อ่าน
//                     </button>
//                     <button 
//                         className={`px-4 py-2 rounded-lg text-sm transition ${filter === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
//                         onClick={() => setFilter('error')}
//                     >
//                         เตือนวิกฤต
//                     </button>
//                     <button 
//                         className={`px-4 py-2 rounded-lg text-sm transition ${filter === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
//                         onClick={() => setFilter('warning')}
//                     >
//                         เตือนเบื้องต้น
//                     </button>
//                 </div>
//             </div>

//             {/* Loading state */}
//             {isLoading && (
//                 <div className="flex justify-center items-center py-12">
//                     <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
//                 </div>
//             )}

//             {/* Empty state */}
//             {!isLoading && filteredAlerts.length === 0 && (
//                 <div className="text-center py-12 bg-gray-50 rounded-lg">
//                     <Bell className="mx-auto h-12 w-12 text-gray-400" />
//                     <h3 className="mt-4 text-lg font-medium text-gray-900">ไม่มีการแจ้งเตือน</h3>
//                     <p className="mt-2 text-sm text-gray-500">ไม่พบการแจ้งเตือนที่ตรงกับเงื่อนไขการกรอง</p>
//                 </div>
//             )}

//             {/* Alert list */}
//             {!isLoading && filteredAlerts.length > 0 && (
//                 <div className="space-y-4">
//                     {filteredAlerts.map((alert) => {
//                         // Filter based on notification settings from Settings page
//                         if (alert.sensor === "pH" && !shouldShowPHAlerts) return null;
//                         if (alert.sensor === "DO" && !shouldShowDOAlerts) return null;
                        
//                         return (
//                             <div 
//                                 key={alert.id} 
//                                 className={`w-full relative bg-white border rounded-lg overflow-hidden hover:bg-gray-50 transition ${!alert.read ? 'border-gray-300' : 'border-gray-200'}`}
//                             >
//                                 <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
//                                     alert.type === "error"
//                                     ? "bg-red-500"
//                                     : alert.type === "warning"
//                                     ? "bg-yellow-500"
//                                     : alert.type === "success"
//                                     ? "bg-green-500"
//                                     : "bg-gray-500"
//                                 }`}
//                                 ></div>

//                                 <div className={`p-4 pl-6 flex justify-between items-start w-full ${!alert.read ? 'bg-indigo-50/30' : ''}`}>
//                                     <div className="w-full">
//                                         <div className="flex items-center">
//                                             {alert.type === "error" && <AlertCircle className="text-red-500 mr-2 h-5 w-5"/>}
//                                             {alert.type === "warning" && <AlertTriangle className="text-yellow-500 mr-2 h-5 w-5"/>}
//                                             {alert.type === "success" && <CheckCircle className="text-green-500 mr-2 h-5 w-5"/>}
//                                             <h3 className={`font-medium ${!alert.read ? 'text-gray-900' : 'text-gray-700'}`}>
//                                                 {alert.title}
//                                                 {!alert.read && <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full"></span>}
//                                             </h3>
//                                         </div>
//                                         <p className={`text-sm mt-1 ${!alert.read ? 'text-gray-700' : 'text-gray-600'}`}>{alert.message}</p>
//                                         <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1 items-center">
//                                             <span className="inline-flex items-center">
//                                                 <span className="w-1 h-1 bg-gray-400 rounded-full mr-1.5"></span>
//                                                 {alert.timestamp}
//                                             </span>
//                                             <span className="inline-flex items-center">
//                                                 <span className="w-1 h-1 bg-gray-400 rounded-full mr-1.5"></span>
//                                                 เซนเซอร์: {alert.sensor}
//                                             </span>
//                                             <span className="inline-flex items-center">
//                                                 <span className="w-1 h-1 bg-gray-400 rounded-full mr-1.5"></span>
//                                                 ตำแหน่ง: {alert.location}
//                                             </span>
//                                         </div>
//                                     </div>

//                                     <div className="flex space-x-2 ml-4">
//                                         <button 
//                                             onClick={() => markAsRead(alert.id)}
//                                             className="w-8 h-8 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full flex items-center justify-center transition"
//                                             title="ทำเครื่องหมายว่าอ่านแล้ว"
//                                         >
//                                             <Check size={16} />
//                                         </button>
//                                         <button 
//                                             onClick={() => dismissAlert(alert.id)}
//                                             className="w-8 h-8 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full flex items-center justify-center transition"
//                                             title="ลบการแจ้งเตือน"
//                                         >
//                                             <X size={16} />
//                                         </button>
//                                     </div>
//                                 </div>
//                             </div>
//                         );
//                     })}
//                 </div>
//             )}
            
//             {/* Settings Integration Notice */}
//             <div className="mt-6 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
//                 <p>การแสดงผลการแจ้งเตือนนี้อ้างอิงจากการตั้งค่าในหน้า <strong>ตั้งค่าระบบ</strong></p>
//                 <p className="mt-1">ระยะเวลารีเฟรช: {localStorage.getItem('refreshInterval') === '10s' ? '10 วินาที' : 
//                                            localStorage.getItem('refreshInterval') === '5m' ? '5 นาที' : 
//                                            localStorage.getItem('refreshInterval') === '30m' ? '30 นาที' : 
//                                            localStorage.getItem('refreshInterval') === '3h' ? '3 ชั่วโมง' : 
//                                            '24 ชั่วโมง'}</p>
//             </div>
//         </div>
//     );
// }



// import React, {useState} from "react";
// import { Check, X, AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";

// export default function AlertTable() {
//     // example value 
//     const mockAlerts = [
//         {id: 1,
//             type: "error",
//             title: "ค่า ph ต่ำเกินไป",
//             message: "ค่า pH วัดได้ 4.2",
//             timestamp: "2025-04-20:16.00น.",
//             read: false,
//             sensor: "ph",
//             location: "บ่อเลี้ยงปลา A",
//         },
//         {id: 2,
//             type: "warning",
//             title: "ค่า DO ต่ำกว่าเกณฑ์",
//             message: "ค่า DO วัดได้ 3.2",
//             timestamp: "2025-04-20:18.00น.",
//             read: false,
//             sensor: "DO",
//             location: "บ่อเลี้ยงกุ้ง B",
//         },
//         {id: 3,
//             type: "normal",
//             title: "ค่า ph อยู่ในเกณฑ์ปกติ",
//             message: "ค่า DO วัดได้ 6.9",
//             timestamp: "2025-04-20:18.00น.",
//             read: true,
//             sensor: "DO",
//             location: "บ่อเลี้ยงปลา C",
//         },
//     ];

//     return (
//         <div className="w-full min-h-screen bg-white rounded-xl shadow-sm p-4 border border-gray-20">
//             <div className="mb-4">
//             <h2 className="mb-6 text-3xl font-semibold text-gray-800">Notification</h2>
//             </div>

//             <div className="flex space-x-3 mb-6">
//                 <button className="px-4 py-2 rounded-lg text-sm bg-indigo-100 text-indigo-700">All</button>
//                 <button className="px-4 py-2 rounded-lg text-sm bg-indigo-100 text-indigo-700">Unread</button>
//             </div>

//             <div className="space-y-4">
//                 {mockAlerts.map((alert) => (
//                     <div key={alert.id} className="w-full relative bg-indigo-50 rounded-lg overflow-hidden hover:bg-indigo-100 transition">
//                         <div className={`absolute left-0 top-0 bottom-0 w-2 ${
//                             alert.type === "error"
//                             ? "bg-red-500"
//                             :alert.type === "warning"
//                             ?"bg-yellow-500"
//                             :alert.type === "normal"
//                             ?"bg-green-500"
//                             :"bg-gray-500"
//                         }`}
//                         ></div>

//                     <div className="p-5 pl-8 flex justify-between items-start w-full">
//                         <div className="w-full">
//                             <div className="flex items-center">
//                                 {alert.type === "error" && <AlertCircle className="text-red-500 mr-2"/>}
//                                 {alert.type === "warning" && <AlertTriangle className="text-yellow-500 mr-2"/>}
//                                 {alert.type === "normal" && <CheckCircle className="text-green-500 mr-2"/>}
//                                 <h3 className="font-medium text-gray-900">{alert.title}</h3>
//                             </div>
//                             <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
//                             <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-x-2 gap-y-1">
//                                 <span>{alert.timestamp}</span>
//                                 <span>เซนเซอร์: {alert.sensor}</span>
//                                 <span>ตำแหน่ง: {alert.location}</span>
//                             </div>
//                         </div>

//                         <div className="flex space-x-1">
//                             <button className="w-8 h-8 text-gray-500 hover:text-gray-700 rounded-full border border-gray-200 bg-white flex items-center justify-center transition"><Check size={16} /></button>
//                             <button className="w-8 h-8 text-gray-500 hover:text-gray-700 rounded-full border border-gray-200 bg-white flex items-center justify-center transition"><X size={16} /></button>
//                         </div>
//                     </div>
//                 </div>
//             ))}
//             </div>
//         </div>
//     );
// }