import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Area, AreaChart, ComposedChart } from 'recharts';
import { useMediaQuery } from 'react-responsive';



const DOPhCharts = () => {
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const isDesktop = useMediaQuery({ minWidth: 1024 });
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 });
  const isMobile = useMediaQuery({ maxWidth: 767 });

  // ฟังก์ชันสำหรับกำหนดความสูงของกราฟตามขนาดหน้าจอ
  const getChartHeight = () => {
    if (isDesktop) return 360;
    if (isTablet) return 300;
    return 240; // Mobile
  };

  const [pHData, setPHData] = useState([]);
  const [doData, setDOData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debug, setDebug] = useState(null);
  const [displayMode, setDisplayMode] = useState('chart'); // 'chart', 'table', or 'both'
  const [chartType, setChartType] = useState('line'); // 'line', 'area', or 'composed'
  const [showRefLines, setShowRefLines] = useState(true);
  // Removed timeRange state and set a fixed limit of 10
  const timeRange = '10'; // Fixed to 10 items

  // pH limits and their consequences
  const pHLimits = {
    min: 6.5,
    max: 8.5,
    dangerousLow: 5.0,
    dangerousHigh: 9.0
  };

  // DO limits
  const doLimits = {
    min: 5.0,
    max: 12.0
  };

  // ฟังก์ชันแปลง timestamp เป็นวันที่ที่อ่านได้
  const formatTimestamp = (timestamp) => {
    try {
      if (!timestamp) return "Unknown";
      
      let date;
      if (timestamp instanceof Date) {
        date = timestamp;
      } else if (timestamp.seconds) {
        // กรณีเป็น Firestore Timestamp
        date = new Date(timestamp.seconds * 1000);
      } else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else {
        return String(timestamp).substring(0, 10);
      }
      
      return date.toLocaleDateString('en-GB', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
      });
    } catch (e) {
      console.error("Error formatting timestamp:", e);
      return String(timestamp).substring(0, 10);
    }
  };

  // ฟังก์ชันสำหรับแปลงจากค่า pH เป็นสถานะ
  const getPHStatus = (value) => {
    if (value < pHLimits.dangerousLow || value > pHLimits.dangerousHigh) {
      return 'อันตราย';
    } else if (value < pHLimits.min || value > pHLimits.max) {
      return 'ควรระวัง';
    } else {
      return 'เหมาะสม';
    }
  };

  // ฟังก์ชันสำหรับแปลงจากค่า DO เป็นสถานะ
  const getDOStatus = (value) => {
    if (value < doLimits.min) {
      return 'ออกซิเจนต่ำ';
    } else if (value > doLimits.max) {
      return 'ออกซิเจนสูง';
    } else {
      return 'เหมาะสม';
    }
  };

  // Custom tooltip for better display
  const CustomTooltip = ({ active, payload, label, sensorType }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      let status, statusColor;
      
      if (sensorType === 'pH') {
        status = getPHStatus(value);
        if (status === 'อันตราย') {
          statusColor = 'text-red-600 font-bold';
        } else if (status === 'ควรระวัง') {
          statusColor = 'text-yellow-600 font-bold';
        } else {
          statusColor = 'text-green-600 font-bold';
        }
      } else { // DO
        status = getDOStatus(value);
        if (status === 'ออกซิเจนต่ำ') {
          statusColor = 'text-red-600 font-bold';
        } else if (status === 'ออกซิเจนสูง') {
          statusColor = 'text-yellow-600 font-bold';
        } else {
          statusColor = 'text-green-600 font-bold';
        }
      }
      
      return (
        <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
          <p className="text-gray-600">{label}</p>
          <p className="font-medium">
            {sensorType === 'pH' ? 'pH Level: ' : 'DO Level: '}
            <span className="text-blue-600">{value.toFixed(2)}</span>
            {sensorType === 'DO' && ' mg/L'}
          </p>
          <p className="mt-1">
            สถานะ: <span className={statusColor}>{status}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // ดึงข้อมูลจาก Firestore
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const datalogRef = collection(db, "datalog");
        
        // ดึงข้อมูลเฉพาะ sensor_id "1" สำหรับกราฟ pH (เปลี่ยนจากการดึงทั้งหมด)
        const pHQuery = query(datalogRef, where("sensor_id", "==", "1"));
        const pHSnapshot = await getDocs(pHQuery);
        
        // ดึงข้อมูลเฉพาะ sensor_id "2" สำหรับกราฟ DO
        const doQuery = query(datalogRef, where("sensor_id", "==", "2"));
        const doSnapshot = await getDocs(doQuery);
        
        // เก็บข้อมูลดิบไว้เพื่อ debug
        const rawPHData = [];
        const rawDOData = [];
        
        // แปลงข้อมูล pH
        pHSnapshot.forEach((doc) => {
          const data = doc.data();
          rawPHData.push({ id: doc.id, ...data });
        });
        
        // แปลงข้อมูล DO
        doSnapshot.forEach((doc) => {
          const data = doc.data();
          rawDOData.push({ id: doc.id, ...data });
        });
        
        // บันทึกข้อมูลดิบไว้เพื่อตรวจสอบ
        setDebug({ pHData: rawPHData, doData: rawDOData });
        
        // จัดรูปแบบข้อมูล pH
        const formattedPHData = rawPHData.map((item) => {
          const value = parseFloat(item.value || item.pH || item.ph || item.PH || 0);
          const status = getPHStatus(value);
          return {
            name: formatTimestamp(item.timestamp),
            value: value,
            status: status,
            // ค่าสำหรับทำ area chart
            safeZoneMin: pHLimits.min,
            safeZoneMax: pHLimits.max,
            // เก็บ timestamp ดิบไว้เพื่อการเรียงลำดับ
            rawTimestamp: item.timestamp instanceof Date ? item.timestamp.getTime() : 
                          item.timestamp?.seconds ? item.timestamp.seconds * 1000 : 
                          typeof item.timestamp === 'number' ? item.timestamp : 
                          new Date(item.timestamp || 0).getTime()
          };
        });
        
        // จัดรูปแบบข้อมูล DO
        const formattedDOData = rawDOData.map((item) => {
          const value = parseFloat(item.value || item.DO || item.do || 0);
          const status = getDOStatus(value);
          return {
            name: formatTimestamp(item.timestamp),
            value: value,
            status: status,
            // ค่าสำหรับทำ area chart
            safeZoneMin: doLimits.min,
            safeZoneMax: doLimits.max,
            // เก็บ timestamp ดิบไว้เพื่อการเรียงลำดับ
            rawTimestamp: item.timestamp instanceof Date ? item.timestamp.getTime() : 
                          item.timestamp?.seconds ? item.timestamp.seconds * 1000 : 
                          typeof item.timestamp === 'number' ? item.timestamp : 
                          new Date(item.timestamp || 0).getTime()
          };
        });

        // จัดเรียงข้อมูลตามเวลา
        formattedPHData.sort((a, b) => a.rawTimestamp - b.rawTimestamp);
        formattedDOData.sort((a, b) => a.rawTimestamp - b.rawTimestamp);

        // Always limit to 10 items
        const limitPHData = () => {
          const limit = parseInt(timeRange);
          return formattedPHData.length > limit ? formattedPHData.slice(-limit) : formattedPHData;
        };

        const limitDOData = () => {
          const limit = parseInt(timeRange);
          return formattedDOData.length > limit ? formattedDOData.slice(-limit) : formattedDOData;
        };

        setPHData(limitPHData());
        setDOData(limitDOData());

        setLastUpdated(new Date());
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("ไม่สามารถโหลดข้อมูลได้: " + err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();

    const savedIntervalId = localStorage.getItem("refreshInterval") || "10s";

    const refreshMap = {
      '10s': 10000,
      '5m': 5 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '3h': 3 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
    };

    const refreshDelay = refreshMap[savedIntervalId] || 10000;

    const intervalId = setInterval(() => {
      console.log("Refreshing data...");
      fetchData();
    }, refreshDelay);

    
    if (pHData.length > 0 || doData.length > 0) {
      console.log('Data updated, re-rendering chart...');
    }

    // ทำ cleanup เมื่อ component ถูก unmount
    return () => clearInterval(intervalId);

  }, []); // Removed timeRange from dependency array since it's now fixed

  // คำนวณ domain ของ YAxis สำหรับกราฟ DO
  const calculateDODomain = () => {
    if (doData.length === 0) return [0, 15]; // typical DO range
    
    // หาค่า min/max จากข้อมูล
    const values = doData.map(item => item.value);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    
    // สร้าง domain ให้มีช่องว่างมากกว่าข้อมูลเล็กน้อย
    return [
      Math.max(0, Math.min(dataMin - 2, doLimits.min - 1)),
      Math.max(dataMax + 2, doLimits.max + 1)
    ];
  };

  // DO domain
  const doDomain = calculateDODomain();

  // สีสำหรับกราฟ
  const chartColors = {
    ph: {
      line: '#3B82F6', // blue-500
      area: 'rgba(59, 130, 246, 0.2)', // transparent blue
      safeZone: 'rgba(16, 185, 129, 0.1)', // transparent green
    },
    do: {
      line: '#10B981', // emerald-500
      area: 'rgba(16, 185, 129, 0.2)', // transparent emerald
      safeZone: 'rgba(245, 158, 11, 0.1)', // transparent amber
    }
  };

  // สร้าง Chart ตามประเภทที่เลือก
  const renderPHChart = () => {
    if (pHData.length === 0) {
      return <div className="text-center py-10 bg-gray-50 rounded-lg">ไม่พบข้อมูล pH จาก Sensor ID 1</div>;
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={getChartHeight()}>
          <LineChart 
            data={pHData}
            margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#6B7280', fontSize: 12 }} 
              tickLine={{ stroke: '#9CA3AF' }}
              axisLine={{ stroke: '#9CA3AF' }}
            />
            <YAxis 
              domain={[0, 14]} 
              ticks={[0, 2, 4, 6, 8, 10, 12, 14]} 
              tick={{ fill: '#6B7280', fontSize: 12 }}
              tickLine={{ stroke: '#9CA3AF' }}
              axisLine={{ stroke: '#9CA3AF' }}
            />
            <Tooltip content={<CustomTooltip sensorType="pH" />} />
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            
            {showRefLines && (
              <>
                <ReferenceLine y={pHLimits.min} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${pHLimits.min}`, position: 'left', fill: '#10B981', fontSize: 12 }} />
                <ReferenceLine y={pHLimits.max} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${pHLimits.max}`, position: 'left', fill: '#10B981', fontSize: 12 }} />
                <ReferenceLine y={pHLimits.dangerousLow} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Danger: ${pHLimits.dangerousLow}`, position: 'left', fill: '#EF4444', fontSize: 12 }} />
                <ReferenceLine y={pHLimits.dangerousHigh} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Danger: ${pHLimits.dangerousHigh}`, position: 'left', fill: '#EF4444', fontSize: 12 }} />
              </>
            )}
            
            <Line
              name="pH Level"
              type="monotone"
              dataKey="value"
              stroke={chartColors.ph.line}
              strokeWidth={3}
              dot={{ r: 5, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
              activeDot={{ r: 7, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
              connectNulls={true}
              animationDuration={1000}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    } else if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={getChartHeight()}>
          <AreaChart 
            data={pHData}
            margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorPH" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.ph.line} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={chartColors.ph.line} stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="safeZonePH" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.2}/>
                <stop offset="100%" stopColor="#10B981" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#6B7280', fontSize: 12 }} 
              tickLine={{ stroke: '#9CA3AF' }}
              axisLine={{ stroke: '#9CA3AF' }}
            />
            <YAxis 
              domain={[0, 14]} 
              ticks={[0, 2, 4, 6, 8, 10, 12, 14]} 
              tick={{ fill: '#6B7280', fontSize: 12 }}
              tickLine={{ stroke: '#9CA3AF' }}
              axisLine={{ stroke: '#9CA3AF' }}
            />
            <Tooltip content={<CustomTooltip sensorType="pH" />} />
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            
            {showRefLines && (
              <>
                {/* Dangerous Low (red dashed) */}
                <ReferenceLine 
                  y={pHLimits.dangerousLow} 
                  stroke="#EF4444" 
                  strokeWidth={1.5} 
                  strokeDasharray="6 4" 
                  label={{
                    value: `อันตรายต่ำ < ${pHLimits.dangerousLow}`, 
                    position: 'left', 
                    fill: '#EF4444', 
                    fontSize: 12
                  }} 
                />

                {/* Warning Low (yellow dashed) */}
                <ReferenceLine 
                  y={pHLimits.min} 
                  stroke="#FBBF24" 
                  strokeWidth={1.5} 
                  strokeDasharray="6 4" 
                  label={{
                    value: `ควรระวัง < ${pHLimits.min}`, 
                    position: 'left', 
                    fill: '#FBBF24', 
                    fontSize: 12
                  }} 
                />

                {/* Warning High (yellow dashed) */}
                <ReferenceLine 
                  y={pHLimits.max} 
                  stroke="#FBBF24" 
                  strokeWidth={1.5} 
                  strokeDasharray="6 4" 
                  label={{
                    value: `ควรระวัง > ${pHLimits.max}`, 
                    position: 'left', 
                    fill: '#FBBF24', 
                    fontSize: 12
                  }} 
                />

                {/* Dangerous High (red dashed) */}
                <ReferenceLine 
                  y={pHLimits.dangerousHigh} 
                  stroke="#EF4444" 
                  strokeWidth={1.5} 
                  strokeDasharray="6 4" 
                  label={{
                    value: `อันตรายสูง > ${pHLimits.dangerousHigh}`, 
                    position: 'left', 
                    fill: '#EF4444', 
                    fontSize: 12
                  }} 
                />
              </>
            )}

            
            <Area
              name="Safe pH Zone"
              type="monotone"
              dataKey="safeZoneMax"
              stroke="none"
              fillOpacity={1}
              fill="url(#safeZonePH)"
              legendType="none"
            />
            
            <Area
              name="pH Level"
              type="monotone"
              dataKey="value"
              stroke={chartColors.ph.line}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorPH)"
              dot={{ r: 5, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
              activeDot={{ r: 7, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
              connectNulls={true}
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    } else { // composed
      return (
        <ResponsiveContainer width="100%" height={getChartHeight()}>
          <ComposedChart 
            data={pHData}
            margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorPH" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.ph.line} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={chartColors.ph.line} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#6B7280', fontSize: 12 }} 
              tickLine={{ stroke: '#9CA3AF' }}
              axisLine={{ stroke: '#9CA3AF' }}
            />
            <YAxis 
              domain={[0, 14]} 
              ticks={[0, 2, 4, 6, 8, 10, 12, 14]} 
              tick={{ fill: '#6B7280', fontSize: 12 }}
              tickLine={{ stroke: '#9CA3AF' }}
              axisLine={{ stroke: '#9CA3AF' }}
            />
            <Tooltip content={<CustomTooltip sensorType="pH" />} />
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            
            {showRefLines && (
              <>
                <ReferenceLine y={pHLimits.min} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${pHLimits.min}`, position: 'left', fill: '#10B981', fontSize: 12 }} />
                <ReferenceLine y={pHLimits.max} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${pHLimits.max}`, position: 'left', fill: '#10B981', fontSize: 12 }} />
                <ReferenceLine y={pHLimits.dangerousLow} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Danger: ${pHLimits.dangerousLow}`, position: 'left', fill: '#EF4444', fontSize: 12 }} />
                <ReferenceLine y={pHLimits.dangerousHigh} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Danger: ${pHLimits.dangerousHigh}`, position: 'left', fill: '#EF4444', fontSize: 12 }} />
              </>
            )}
            
            <Area
              name="pH Level Area"
              type="monotone"
              dataKey="value"
              fill="url(#colorPH)"
              fillOpacity={0.4}
              stroke="none"
              legendType="none"
            />
            
            <Line
              name="pH Level"
              type="monotone"
              dataKey="value"
              stroke={chartColors.ph.line}
              strokeWidth={3}
              dot={{ r: 5, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
              activeDot={{ r: 7, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
              connectNulls={true}
              animationDuration={1000}
            />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }
  };

  const renderDOChart = () => {
    if (doData.length === 0) {
      return <div className="text-center py-10 bg-gray-50 rounded-lg">ไม่พบข้อมูล DO จาก Sensor ID 2</div>;
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={getChartHeight()}>
          <LineChart 
            data={doData}
            margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#6B7280', fontSize: 12 }} 
              tickLine={{ stroke: '#9CA3AF' }}
              axisLine={{ stroke: '#9CA3AF' }}
            />
            <YAxis 
              domain={doDomain} 
              tick={{ fill: '#6B7280', fontSize: 12 }}
              tickLine={{ stroke: '#9CA3AF' }}
              axisLine={{ stroke: '#9CA3AF' }}
            />
            <Tooltip content={<CustomTooltip sensorType="DO" />} />
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            
            {showRefLines && (
              <>
                <ReferenceLine y={doLimits.min} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${doLimits.min} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
                <ReferenceLine y={doLimits.max} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${doLimits.max} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
              </>
            )}
            
            <Line
              name="DO Level (mg/L)"
              type="monotone"
              dataKey="value"
              stroke={chartColors.do.line}
              strokeWidth={3}
              dot={{ r: 5, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
              activeDot={{ r: 7, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
              connectNulls={true}
              animationDuration={1000}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    } else if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={getChartHeight()}>
          <AreaChart 
            data={doData}
            margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorDO" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.do.line} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={chartColors.do.line} stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="safeZoneDO" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.2}/>
                <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#6B7280', fontSize: 12 }} 
              tickLine={{ stroke: '#9CA3AF' }}
              axisLine={{ stroke: '#9CA3AF' }}
            />
            <YAxis 
              domain={doDomain} 
              tick={{ fill: '#6B7280', fontSize: 12 }}
              tickLine={{ stroke: '#9CA3AF' }}
              axisLine={{ stroke: '#9CA3AF' }}
            />
            <Tooltip content={<CustomTooltip sensorType="DO" />} />
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            
            {showRefLines && (
              <>
                <ReferenceLine y={doLimits.min} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${doLimits.min} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
                <ReferenceLine y={doLimits.max} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${doLimits.max} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
              </>
            )}
            
            <Area
              name="Safe DO Zone"
              type="monotone"
              dataKey="safeZoneMax"
              stroke="none"
              fillOpacity={1}
              fill="url(#safeZoneDO)"
              legendType="none"
            />
            
            <Area
              name="DO Level (mg/L)"
              type="monotone"
              dataKey="value"
              stroke={chartColors.do.line}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorDO)"
              dot={{ r: 5, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
              activeDot={{ r: 7, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
              connectNulls={true}
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    } else { // composed chart for DO
      return (
        <ResponsiveContainer width="100%" height={getChartHeight()}>
          <ComposedChart 
            data={doData}
            margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorDO" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.do.line} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={chartColors.do.line} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#6B7280', fontSize: 12 }} 
              tickLine={{ stroke: '#9CA3AF' }}
              axisLine={{ stroke: '#9CA3AF' }}
            />
            <YAxis 
              domain={doDomain} 
              tick={{ fill: '#6B7280', fontSize: 12 }}
              tickLine={{ stroke: '#9CA3AF' }}
              axisLine={{ stroke: '#9CA3AF' }}
            />
            <Tooltip content={<CustomTooltip sensorType="DO" />} />
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            
            {showRefLines && (
              <>
                <ReferenceLine y={doLimits.min} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${doLimits.min} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
                <ReferenceLine y={doLimits.max} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${doLimits.max} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
              </>
            )}
            
            <Area
              name="DO Level Area"
              type="monotone"
              dataKey="value"
              fill="url(#colorDO)"
              fillOpacity={0.4}
              stroke="none"
              legendType="none"
            />
            
            <Line
              name="DO Level (mg/L)"
              type="monotone"
              dataKey="value"
              stroke={chartColors.do.line}
              strokeWidth={3}
              dot={{ r: 5, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
              activeDot={{ r: 7, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
              connectNulls={true}
              animationDuration={1000}
            />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }
  };

  // Render table component for data
  const renderTable = (data, type) => {
    const headers = type === 'pH' 
      ? ['วันที่', 'ค่า pH', 'สถานะ'] 
      : ['วันที่', 'ค่า DO (mg/L)', 'สถานะ'];
    
    return (
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header, index) => (
                <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => {
              let statusClass = '';
              if (type === 'pH') {
                statusClass = item.status === 'อันตราย' ? 'text-red-600 font-medium' 
                  : item.status === 'ควรระวัง' ? 'text-yellow-600 font-medium' 
                  : 'text-green-600 font-medium';
              } else {
                statusClass = item.status === 'ออกซิเจนต่ำ' ? 'text-red-600 font-medium' 
                  : item.status === 'ออกซิเจนสูง' ? 'text-yellow-600 font-medium' 
                  : 'text-green-600 font-medium';
              }
              
              return (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.value.toFixed(2)}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${statusClass}`}>{item.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ส่วนแสดงผลของ Component
  const containerClass = `p-4 rounded-lg shadow ${isDesktop ? 'max-w-[1200px] mx-auto' : 'w-full'} ${isMobile ? 'px-2' : 'px-6'}`;
  const flexWrapResponsive = isMobile ? 'flex-col space-y-4' : 'flex-row space-x-6';

  const chartBoxClass = `bg-white p-4 rounded-lg shadow w-full ${isMobile ? 'mb-6' : 'mb-8'}`;
  return (
    <div className={`bg-gray-100 ${containerClass}`}>
      {/* Controls for display options */}
      <div className={`mb-6 bg-white p-4 rounded-lg shadow flex flex-wrap gap-4 ${flexWrapResponsive}`}>  
        <div className={`${isMobile ? 'w-full' : 'w-auto'} mb-2`}>
          <label htmlFor="displayMode" className="block text-sm font-medium text-gray-700 mb-1">รูปแบบการแสดงผล</label>
          <select
            id="displayMode"
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="chart">กราฟ</option>
            <option value="table">ตาราง</option>
            <option value="both">กราฟและตาราง</option>
          </select>
        </div>
        
        {(displayMode === 'chart' || displayMode === 'both') && (
          <>
            <div className={`${isMobile ? 'w-full' : 'w-auto'} mb-2`}>
              <label htmlFor="chartType" className="block text-sm font-medium text-gray-700 mb-1">ประเภทกราฟ</label>
              <select
                id="chartType"
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="line">Line Chart</option>
                <option value="area">Area Chart</option>
                <option value="composed">Composed Chart</option>
              </select>
            </div>
            
            <div className={`flex items-end ${isMobile ? 'w-full mt-2' : 'w-auto'}`}>
              <label className="inline-flex items-center mt-1">
                <input
                  type="checkbox"
                  checked={showRefLines}
                  onChange={() => setShowRefLines(!showRefLines)}
                  className="form-checkbox h-5 w-5 text-indigo-600 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">แสดงเส้นขีดจำกัด</span>
              </label>
            </div>
          </>
        )}
      </div>
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow">
          <svg className="animate-spin h-10 w-10 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="ml-3 text-lg text-gray-700">กำลังโหลดข้อมูล...</span>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700 mb-6">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {/* Content display based on mode */}
      {!isLoading && !error && (
        <div className="space-y-8">
          {/* pH section */}
          {/* <div className="bg-white p-4 rounded-lg shadow"> */}
          <div className={chartBoxClass}>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="inline-block w-4 h-4 rounded-full bg-blue-500 mr-2"></span>
              ค่าความเป็นกรด-ด่าง (pH)
            </h2>
            
            {(displayMode === 'chart' || displayMode === 'both') && renderPHChart()}
            
            {(displayMode === 'table' || displayMode === 'both') && (
              <div className={displayMode === 'both' ? 'mt-6' : ''}>
                {renderTable(pHData, 'pH')}
              </div>
            )}
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-medium">คำแนะนำ:</span> ค่า pH ที่เหมาะสมในน้ำควรอยู่ระหว่าง {pHLimits.min} - {pHLimits.max} 
                หากต่ำกว่า {pHLimits.min} น้ำจะเป็นกรด หากสูงกว่า {pHLimits.max} น้ำจะเป็นด่าง 
                โดยค่าที่ต่ำกว่า {pHLimits.dangerousLow} หรือสูงกว่า {pHLimits.dangerousHigh} อาจเป็นอันตรายต่อสิ่งมีชีวิตในน้ำ
              </p>
            </div>
          </div>
          
          {/* DO section */}
          {/* <div className="bg-white p-4 rounded-lg shadow"> */}
          <div className={chartBoxClass}>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="inline-block w-4 h-4 rounded-full bg-emerald-500 mr-2"></span>
              ค่าออกซิเจนละลายในน้ำ (DO)
            </h2>
            
            {(displayMode === 'chart' || displayMode === 'both') && renderDOChart()}
            
            {(displayMode === 'table' || displayMode === 'both') && (
              <div className={displayMode === 'both' ? 'mt-6' : ''}>
                {renderTable(doData, 'DO')}
              </div>
            )}
            
            <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-medium">คำแนะนำ:</span> ค่า DO ที่เหมาะสมในน้ำควรอยู่ระหว่าง {doLimits.min} - {doLimits.max} mg/L 
                หากต่ำกว่า {doLimits.min} mg/L อาจไม่เพียงพอต่อสิ่งมีชีวิตในน้ำ ทำให้สัตว์น้ำอ่อนแอและเสี่ยงต่อการเกิดโรค
              </p>
            </div>
          </div>
          
          {/* Last Updated */}
          <div className="bg-white p-3 rounded-lg shadow text-center">
            <p className="text-sm text-gray-500">
              แสดงข้อมูลล่าสุด {timeRange} รายการ | อัพเดทล่าสุด: {lastUpdated.toLocaleString('th-TH')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DOPhCharts;



// import React, { useState, useEffect } from 'react';
// import { db } from '../../lib/firebase';
// import { collection, getDocs, query, where } from 'firebase/firestore';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Area, AreaChart, ComposedChart } from 'recharts';
// import { useMediaQuery } from 'react-responsive';



// const DOPhCharts = () => {
//   const [lastUpdated, setLastUpdated] = useState(new Date());

//   const isDesktop = useMediaQuery({ minWidth: 1024 });
//   const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 });
//   const isMobile = useMediaQuery({ maxWidth: 767 });

//   // ฟังก์ชันสำหรับกำหนดความสูงของกราฟตามขนาดหน้าจอ
//   const getChartHeight = () => {
//     if (isDesktop) return 360;
//     if (isTablet) return 300;
//     return 240; // Mobile
//   };

//   const [pHData, setPHData] = useState([]);
//   const [doData, setDOData] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [debug, setDebug] = useState(null);
//   const [displayMode, setDisplayMode] = useState('chart'); // 'chart', 'table', or 'both'
//   const [chartType, setChartType] = useState('line'); // 'line', 'area', or 'composed'
//   const [showRefLines, setShowRefLines] = useState(true);
//   // Removed timeRange state and set a fixed limit of 10
//   const timeRange = '10'; // Fixed to 10 items

//   // pH limits and their consequences
//   const pHLimits = {
//     min: 6.5,
//     max: 8.5,
//     dangerousLow: 5.0,
//     dangerousHigh: 9.0
//   };

//   // DO limits
//   const doLimits = {
//     min: 5.0,
//     max: 12.0
//   };

//   // ฟังก์ชันแปลง timestamp เป็นวันที่ที่อ่านได้
//   const formatTimestamp = (timestamp) => {
//     try {
//       if (!timestamp) return "Unknown";
      
//       let date;
//       if (timestamp instanceof Date) {
//         date = timestamp;
//       } else if (timestamp.seconds) {
//         // กรณีเป็น Firestore Timestamp
//         date = new Date(timestamp.seconds * 1000);
//       } else if (typeof timestamp === 'number') {
//         date = new Date(timestamp);
//       } else if (typeof timestamp === 'string') {
//         date = new Date(timestamp);
//       } else {
//         return String(timestamp).substring(0, 10);
//       }
      
//       return date.toLocaleDateString('en-GB', { 
//         weekday: 'short', 
//         year: 'numeric', 
//         month: 'short', 
//         day: 'numeric',
//         hour: '2-digit', 
//         minute: '2-digit'
//       });
//     } catch (e) {
//       console.error("Error formatting timestamp:", e);
//       return String(timestamp).substring(0, 10);
//     }
//   };

//   // ฟังก์ชันสำหรับแปลงจากค่า pH เป็นสถานะ
//   const getPHStatus = (value) => {
//     if (value < pHLimits.dangerousLow || value > pHLimits.dangerousHigh) {
//       return 'อันตราย';
//     } else if (value < pHLimits.min || value > pHLimits.max) {
//       return 'ควรระวัง';
//     } else {
//       return 'เหมาะสม';
//     }
//   };

//   // ฟังก์ชันสำหรับแปลงจากค่า DO เป็นสถานะ
//   const getDOStatus = (value) => {
//     if (value < doLimits.min) {
//       return 'ออกซิเจนต่ำ';
//     } else if (value > doLimits.max) {
//       return 'ออกซิเจนสูง';
//     } else {
//       return 'เหมาะสม';
//     }
//   };

//   // Custom tooltip for better display
//   const CustomTooltip = ({ active, payload, label, sensorType }) => {
//     if (active && payload && payload.length) {
//       const value = payload[0].value;
//       let status, statusColor;
      
//       if (sensorType === 'pH') {
//         status = getPHStatus(value);
//         if (status === 'อันตราย') {
//           statusColor = 'text-red-600 font-bold';
//         } else if (status === 'ควรระวัง') {
//           statusColor = 'text-yellow-600 font-bold';
//         } else {
//           statusColor = 'text-green-600 font-bold';
//         }
//       } else { // DO
//         status = getDOStatus(value);
//         if (status === 'ออกซิเจนต่ำ') {
//           statusColor = 'text-red-600 font-bold';
//         } else if (status === 'ออกซิเจนสูง') {
//           statusColor = 'text-yellow-600 font-bold';
//         } else {
//           statusColor = 'text-green-600 font-bold';
//         }
//       }
      
//       return (
//         <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
//           <p className="text-gray-600">{label}</p>
//           <p className="font-medium">
//             {sensorType === 'pH' ? 'pH Level: ' : 'DO Level: '}
//             <span className="text-blue-600">{value.toFixed(2)}</span>
//             {sensorType === 'DO' && ' mg/L'}
//           </p>
//           <p className="mt-1">
//             สถานะ: <span className={statusColor}>{status}</span>
//           </p>
//         </div>
//       );
//     }
//     return null;
//   };

//   // ดึงข้อมูลจาก Firestore
//   useEffect(() => {
//     async function fetchData() {
//       try {
//         setIsLoading(true);
//         const datalogRef = collection(db, "datalog");
        
//         // ดึงข้อมูลเฉพาะ sensor_id "1" สำหรับกราฟ pH (เปลี่ยนจากการดึงทั้งหมด)
//         const pHQuery = query(datalogRef, where("sensor_id", "==", "1"));
//         const pHSnapshot = await getDocs(pHQuery);
        
//         // ดึงข้อมูลเฉพาะ sensor_id "2" สำหรับกราฟ DO
//         const doQuery = query(datalogRef, where("sensor_id", "==", "2"));
//         const doSnapshot = await getDocs(doQuery);
        
//         // เก็บข้อมูลดิบไว้เพื่อ debug
//         const rawPHData = [];
//         const rawDOData = [];
        
//         // แปลงข้อมูล pH
//         pHSnapshot.forEach((doc) => {
//           const data = doc.data();
//           rawPHData.push({ id: doc.id, ...data });
//         });
        
//         // แปลงข้อมูล DO
//         doSnapshot.forEach((doc) => {
//           const data = doc.data();
//           rawDOData.push({ id: doc.id, ...data });
//         });
        
//         // บันทึกข้อมูลดิบไว้เพื่อตรวจสอบ
//         setDebug({ pHData: rawPHData, doData: rawDOData });
        
//         // จัดรูปแบบข้อมูล pH
//         const formattedPHData = rawPHData.map((item) => {
//           const value = parseFloat(item.value || item.pH || item.ph || item.PH || 0);
//           const status = getPHStatus(value);
//           return {
//             name: formatTimestamp(item.timestamp),
//             value: value,
//             status: status,
//             // ค่าสำหรับทำ area chart
//             safeZoneMin: pHLimits.min,
//             safeZoneMax: pHLimits.max,
//             // เก็บ timestamp ดิบไว้เพื่อการเรียงลำดับ
//             rawTimestamp: item.timestamp instanceof Date ? item.timestamp.getTime() : 
//                           item.timestamp?.seconds ? item.timestamp.seconds * 1000 : 
//                           typeof item.timestamp === 'number' ? item.timestamp : 
//                           new Date(item.timestamp || 0).getTime()
//           };
//         });
        
//         // จัดรูปแบบข้อมูล DO
//         const formattedDOData = rawDOData.map((item) => {
//           const value = parseFloat(item.value || item.DO || item.do || 0);
//           const status = getDOStatus(value);
//           return {
//             name: formatTimestamp(item.timestamp),
//             value: value,
//             status: status,
//             // ค่าสำหรับทำ area chart
//             safeZoneMin: doLimits.min,
//             safeZoneMax: doLimits.max,
//             // เก็บ timestamp ดิบไว้เพื่อการเรียงลำดับ
//             rawTimestamp: item.timestamp instanceof Date ? item.timestamp.getTime() : 
//                           item.timestamp?.seconds ? item.timestamp.seconds * 1000 : 
//                           typeof item.timestamp === 'number' ? item.timestamp : 
//                           new Date(item.timestamp || 0).getTime()
//           };
//         });

//         // จัดเรียงข้อมูลตามเวลา
//         formattedPHData.sort((a, b) => a.rawTimestamp - b.rawTimestamp);
//         formattedDOData.sort((a, b) => a.rawTimestamp - b.rawTimestamp);

//         // Always limit to 10 items
//         const limitPHData = () => {
//           const limit = parseInt(timeRange);
//           return formattedPHData.length > limit ? formattedPHData.slice(-limit) : formattedPHData;
//         };

//         const limitDOData = () => {
//           const limit = parseInt(timeRange);
//           return formattedDOData.length > limit ? formattedDOData.slice(-limit) : formattedDOData;
//         };

//         setPHData(limitPHData());
//         setDOData(limitDOData());

//         setLastUpdated(new Date());
//       } catch (err) {
//         console.error("Error fetching data:", err);
//         setError("ไม่สามารถโหลดข้อมูลได้: " + err.message);
//       } finally {
//         setIsLoading(false);
//       }
//     }

//     fetchData();

//     const intervalId = setInterval(() => {
//       console.log("Refreshing data...");
//       fetchData();
//     }, 5000);
    
//     if (pHData.length > 0 || doData.length > 0) {
//       console.log('Data updated, re-rendering chart...');
//     }

//     // ทำ cleanup เมื่อ component ถูก unmount
//     return () => clearInterval(intervalId);

//   }, []); // Removed timeRange from dependency array since it's now fixed

//   // คำนวณ domain ของ YAxis สำหรับกราฟ DO
//   const calculateDODomain = () => {
//     if (doData.length === 0) return [0, 15]; // typical DO range
    
//     // หาค่า min/max จากข้อมูล
//     const values = doData.map(item => item.value);
//     const dataMin = Math.min(...values);
//     const dataMax = Math.max(...values);
    
//     // สร้าง domain ให้มีช่องว่างมากกว่าข้อมูลเล็กน้อย
//     return [
//       Math.max(0, Math.min(dataMin - 2, doLimits.min - 1)),
//       Math.max(dataMax + 2, doLimits.max + 1)
//     ];
//   };

//   // DO domain
//   const doDomain = calculateDODomain();

//   // สีสำหรับกราฟ
//   const chartColors = {
//     ph: {
//       line: '#3B82F6', // blue-500
//       area: 'rgba(59, 130, 246, 0.2)', // transparent blue
//       safeZone: 'rgba(16, 185, 129, 0.1)', // transparent green
//     },
//     do: {
//       line: '#10B981', // emerald-500
//       area: 'rgba(16, 185, 129, 0.2)', // transparent emerald
//       safeZone: 'rgba(245, 158, 11, 0.1)', // transparent amber
//     }
//   };

//   // สร้าง Chart ตามประเภทที่เลือก
//   const renderPHChart = () => {
//     if (pHData.length === 0) {
//       return <div className="text-center py-10 bg-gray-50 rounded-lg">ไม่พบข้อมูล pH จาก Sensor ID 1</div>;
//     }

//     if (chartType === 'line') {
//       return (
//         <ResponsiveContainer width="100%" height={getChartHeight()}>
//           <LineChart 
//             data={pHData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={[0, 14]} 
//               ticks={[0, 2, 4, 6, 8, 10, 12, 14]} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="pH" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 <ReferenceLine y={pHLimits.min} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${pHLimits.min}`, position: 'left', fill: '#10B981', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.max} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${pHLimits.max}`, position: 'left', fill: '#10B981', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.dangerousLow} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Danger: ${pHLimits.dangerousLow}`, position: 'left', fill: '#EF4444', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.dangerousHigh} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Danger: ${pHLimits.dangerousHigh}`, position: 'left', fill: '#EF4444', fontSize: 12 }} />
//               </>
//             )}
            
//             <Line
//               name="pH Level"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.ph.line}
//               strokeWidth={3}
//               dot={{ r: 5, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </LineChart>
//         </ResponsiveContainer>
//       );
//     } else if (chartType === 'area') {
//       return (
//         <ResponsiveContainer width="100%" height={getChartHeight()}>
//           <AreaChart 
//             data={pHData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <defs>
//               <linearGradient id="colorPH" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="5%" stopColor={chartColors.ph.line} stopOpacity={0.8}/>
//                 <stop offset="95%" stopColor={chartColors.ph.line} stopOpacity={0.1}/>
//               </linearGradient>
//               <linearGradient id="safeZonePH" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="0%" stopColor="#10B981" stopOpacity={0.2}/>
//                 <stop offset="100%" stopColor="#10B981" stopOpacity={0.1}/>
//               </linearGradient>
//             </defs>
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={[0, 14]} 
//               ticks={[0, 2, 4, 6, 8, 10, 12, 14]} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="pH" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 {/* Dangerous Low (red dashed) */}
//                 <ReferenceLine 
//                   y={pHLimits.dangerousLow} 
//                   stroke="#EF4444" 
//                   strokeWidth={1.5} 
//                   strokeDasharray="6 4" 
//                   label={{
//                     value: `อันตรายต่ำ < ${pHLimits.dangerousLow}`, 
//                     position: 'left', 
//                     fill: '#EF4444', 
//                     fontSize: 12
//                   }} 
//                 />

//                 {/* Warning Low (yellow dashed) */}
//                 <ReferenceLine 
//                   y={pHLimits.min} 
//                   stroke="#FBBF24" 
//                   strokeWidth={1.5} 
//                   strokeDasharray="6 4" 
//                   label={{
//                     value: `ควรระวัง < ${pHLimits.min}`, 
//                     position: 'left', 
//                     fill: '#FBBF24', 
//                     fontSize: 12
//                   }} 
//                 />

//                 {/* Warning High (yellow dashed) */}
//                 <ReferenceLine 
//                   y={pHLimits.max} 
//                   stroke="#FBBF24" 
//                   strokeWidth={1.5} 
//                   strokeDasharray="6 4" 
//                   label={{
//                     value: `ควรระวัง > ${pHLimits.max}`, 
//                     position: 'left', 
//                     fill: '#FBBF24', 
//                     fontSize: 12
//                   }} 
//                 />

//                 {/* Dangerous High (red dashed) */}
//                 <ReferenceLine 
//                   y={pHLimits.dangerousHigh} 
//                   stroke="#EF4444" 
//                   strokeWidth={1.5} 
//                   strokeDasharray="6 4" 
//                   label={{
//                     value: `อันตรายสูง > ${pHLimits.dangerousHigh}`, 
//                     position: 'left', 
//                     fill: '#EF4444', 
//                     fontSize: 12
//                   }} 
//                 />
//               </>
//             )}

            
//             <Area
//               name="Safe pH Zone"
//               type="monotone"
//               dataKey="safeZoneMax"
//               stroke="none"
//               fillOpacity={1}
//               fill="url(#safeZonePH)"
//               legendType="none"
//             />
            
//             <Area
//               name="pH Level"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.ph.line}
//               strokeWidth={3}
//               fillOpacity={1}
//               fill="url(#colorPH)"
//               dot={{ r: 5, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </AreaChart>
//         </ResponsiveContainer>
//       );
//     } else { // composed
//       return (
//         <ResponsiveContainer width="100%" height={getChartHeight()}>
//           <ComposedChart 
//             data={pHData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <defs>
//               <linearGradient id="colorPH" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="5%" stopColor={chartColors.ph.line} stopOpacity={0.8}/>
//                 <stop offset="95%" stopColor={chartColors.ph.line} stopOpacity={0.1}/>
//               </linearGradient>
//             </defs>
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={[0, 14]} 
//               ticks={[0, 2, 4, 6, 8, 10, 12, 14]} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="pH" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 <ReferenceLine y={pHLimits.min} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${pHLimits.min}`, position: 'left', fill: '#10B981', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.max} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${pHLimits.max}`, position: 'left', fill: '#10B981', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.dangerousLow} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Danger: ${pHLimits.dangerousLow}`, position: 'left', fill: '#EF4444', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.dangerousHigh} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Danger: ${pHLimits.dangerousHigh}`, position: 'left', fill: '#EF4444', fontSize: 12 }} />
//               </>
//             )}
            
//             <Area
//               name="pH Level Area"
//               type="monotone"
//               dataKey="value"
//               fill="url(#colorPH)"
//               fillOpacity={0.4}
//               stroke="none"
//               legendType="none"
//             />
            
//             <Line
//               name="pH Level"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.ph.line}
//               strokeWidth={3}
//               dot={{ r: 5, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </ComposedChart>
//         </ResponsiveContainer>
//       );
//     }
//   };

//   const renderDOChart = () => {
//     if (doData.length === 0) {
//       return <div className="text-center py-10 bg-gray-50 rounded-lg">ไม่พบข้อมูล DO จาก Sensor ID 2</div>;
//     }

//     if (chartType === 'line') {
//       return (
//         <ResponsiveContainer width="100%" height={getChartHeight()}>
//           <LineChart 
//             data={doData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={doDomain} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="DO" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 <ReferenceLine y={doLimits.min} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${doLimits.min} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//                 <ReferenceLine y={doLimits.max} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${doLimits.max} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//               </>
//             )}
            
//             <Line
//               name="DO Level (mg/L)"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.do.line}
//               strokeWidth={3}
//               dot={{ r: 5, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </LineChart>
//         </ResponsiveContainer>
//       );
//     } else if (chartType === 'area') {
//       return (
//         <ResponsiveContainer width="100%" height={getChartHeight()}>
//           <AreaChart 
//             data={doData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <defs>
//               <linearGradient id="colorDO" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="5%" stopColor={chartColors.do.line} stopOpacity={0.8}/>
//                 <stop offset="95%" stopColor={chartColors.do.line} stopOpacity={0.1}/>
//               </linearGradient>
//               <linearGradient id="safeZoneDO" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.2}/>
//                 <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.1}/>
//               </linearGradient>
//             </defs>
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={doDomain} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="DO" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 <ReferenceLine y={doLimits.min} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${doLimits.min} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//                 <ReferenceLine y={doLimits.max} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${doLimits.max} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//               </>
//             )}
            
//             <Area
//               name="Safe DO Zone"
//               type="monotone"
//               dataKey="safeZoneMax"
//               stroke="none"
//               fillOpacity={1}
//               fill="url(#safeZoneDO)"
//               legendType="none"
//             />
            
//             <Area
//               name="DO Level (mg/L)"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.do.line}
//               strokeWidth={3}
//               fillOpacity={1}
//               fill="url(#colorDO)"
//               dot={{ r: 5, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </AreaChart>
//         </ResponsiveContainer>
//       );
//     } else { // composed chart for DO
//       return (
//         <ResponsiveContainer width="100%" height={getChartHeight()}>
//           <ComposedChart 
//             data={doData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <defs>
//               <linearGradient id="colorDO" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="5%" stopColor={chartColors.do.line} stopOpacity={0.8}/>
//                 <stop offset="95%" stopColor={chartColors.do.line} stopOpacity={0.1}/>
//               </linearGradient>
//             </defs>
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={doDomain} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="DO" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 <ReferenceLine y={doLimits.min} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${doLimits.min} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//                 <ReferenceLine y={doLimits.max} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${doLimits.max} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//               </>
//             )}
            
//             <Area
//               name="DO Level Area"
//               type="monotone"
//               dataKey="value"
//               fill="url(#colorDO)"
//               fillOpacity={0.4}
//               stroke="none"
//               legendType="none"
//             />
            
//             <Line
//               name="DO Level (mg/L)"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.do.line}
//               strokeWidth={3}
//               dot={{ r: 5, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </ComposedChart>
//         </ResponsiveContainer>
//       );
//     }
//   };

//   // Render table component for data
//   const renderTable = (data, type) => {
//     const headers = type === 'pH' 
//       ? ['วันที่', 'ค่า pH', 'สถานะ'] 
//       : ['วันที่', 'ค่า DO (mg/L)', 'สถานะ'];
    
//     return (
//       <div className="overflow-x-auto bg-white rounded-lg shadow">
//         <table className="min-w-full">
//           <thead className="bg-gray-50">
//             <tr>
//               {headers.map((header, index) => (
//                 <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   {header}
//                 </th>
//               ))}
//             </tr>
//           </thead>
//           <tbody className="bg-white divide-y divide-gray-200">
//             {data.map((item, index) => {
//               let statusClass = '';
//               if (type === 'pH') {
//                 statusClass = item.status === 'อันตราย' ? 'text-red-600 font-medium' 
//                   : item.status === 'ควรระวัง' ? 'text-yellow-600 font-medium' 
//                   : 'text-green-600 font-medium';
//               } else {
//                 statusClass = item.status === 'ออกซิเจนต่ำ' ? 'text-red-600 font-medium' 
//                   : item.status === 'ออกซิเจนสูง' ? 'text-yellow-600 font-medium' 
//                   : 'text-green-600 font-medium';
//               }
              
//               return (
//                 <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.name}</td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.value.toFixed(2)}</td>
//                   <td className={`px-6 py-4 whitespace-nowrap text-sm ${statusClass}`}>{item.status}</td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>
//     );
//   };

//   // ส่วนแสดงผลของ Component
//   const containerClass = `p-4 rounded-lg shadow ${isDesktop ? 'max-w-[1200px] mx-auto' : 'w-full'} ${isMobile ? 'px-2' : 'px-6'}`;
//   const flexWrapResponsive = isMobile ? 'flex-col space-y-4' : 'flex-row space-x-6';

//   const chartBoxClass = `bg-white p-4 rounded-lg shadow w-full ${isMobile ? 'mb-6' : 'mb-8'}`;
//   return (
//     <div className={`bg-gray-100 ${containerClass}`}>
//       {/* Controls for display options */}
//       <div className={`mb-6 bg-white p-4 rounded-lg shadow flex flex-wrap gap-4 ${flexWrapResponsive}`}>  
//         <div className={`${isMobile ? 'w-full' : 'w-auto'} mb-2`}>
//           <label htmlFor="displayMode" className="block text-sm font-medium text-gray-700 mb-1">รูปแบบการแสดงผล</label>
//           <select
//             id="displayMode"
//             value={displayMode}
//             onChange={(e) => setDisplayMode(e.target.value)}
//             className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
//           >
//             <option value="chart">กราฟ</option>
//             <option value="table">ตาราง</option>
//             <option value="both">กราฟและตาราง</option>
//           </select>
//         </div>
        
//         {(displayMode === 'chart' || displayMode === 'both') && (
//           <>
//             <div className={`${isMobile ? 'w-full' : 'w-auto'} mb-2`}>
//               <label htmlFor="chartType" className="block text-sm font-medium text-gray-700 mb-1">ประเภทกราฟ</label>
//               <select
//                 id="chartType"
//                 value={chartType}
//                 onChange={(e) => setChartType(e.target.value)}
//                 className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
//               >
//                 <option value="line">Line Chart</option>
//                 <option value="area">Area Chart</option>
//                 <option value="composed">Composed Chart</option>
//               </select>
//             </div>
            
//             <div className={`flex items-end ${isMobile ? 'w-full mt-2' : 'w-auto'}`}>
//               <label className="inline-flex items-center mt-1">
//                 <input
//                   type="checkbox"
//                   checked={showRefLines}
//                   onChange={() => setShowRefLines(!showRefLines)}
//                   className="form-checkbox h-5 w-5 text-indigo-600 rounded"
//                 />
//                 <span className="ml-2 text-sm text-gray-700">แสดงเส้นขีดจำกัด</span>
//               </label>
//             </div>
//           </>
//         )}
//       </div>
      
//       {/* Loading state */}
//       {isLoading && (
//         <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow">
//           <svg className="animate-spin h-10 w-10 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//           </svg>
//           <span className="ml-3 text-lg text-gray-700">กำลังโหลดข้อมูล...</span>
//         </div>
//       )}
      
//       {/* Error state */}
//       {error && (
//         <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700 mb-6">
//           <div className="flex">
//             <svg className="h-5 w-5 text-red-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
//             </svg>
//             <span>{error}</span>
//           </div>
//         </div>
//       )}
      
//       {/* Content display based on mode */}
//       {!isLoading && !error && (
//         <div className="space-y-8">
//           {/* pH section */}
//           {/* <div className="bg-white p-4 rounded-lg shadow"> */}
//           <div className={chartBoxClass}>
//             <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
//               <span className="inline-block w-4 h-4 rounded-full bg-blue-500 mr-2"></span>
//               ค่าความเป็นกรด-ด่าง (pH)
//             </h2>
            
//             {(displayMode === 'chart' || displayMode === 'both') && renderPHChart()}
            
//             {(displayMode === 'table' || displayMode === 'both') && (
//               <div className={displayMode === 'both' ? 'mt-6' : ''}>
//                 {renderTable(pHData, 'pH')}
//               </div>
//             )}
            
//             <div className="mt-4 p-3 bg-blue-50 rounded-lg">
//               <p className="text-sm text-gray-700">
//                 <span className="font-medium">คำแนะนำ:</span> ค่า pH ที่เหมาะสมในน้ำควรอยู่ระหว่าง {pHLimits.min} - {pHLimits.max} 
//                 หากต่ำกว่า {pHLimits.min} น้ำจะเป็นกรด หากสูงกว่า {pHLimits.max} น้ำจะเป็นด่าง 
//                 โดยค่าที่ต่ำกว่า {pHLimits.dangerousLow} หรือสูงกว่า {pHLimits.dangerousHigh} อาจเป็นอันตรายต่อสิ่งมีชีวิตในน้ำ
//               </p>
//             </div>
//           </div>
          
//           {/* DO section */}
//           {/* <div className="bg-white p-4 rounded-lg shadow"> */}
//           <div className={chartBoxClass}>
//             <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
//               <span className="inline-block w-4 h-4 rounded-full bg-emerald-500 mr-2"></span>
//               ค่าออกซิเจนละลายในน้ำ (DO)
//             </h2>
            
//             {(displayMode === 'chart' || displayMode === 'both') && renderDOChart()}
            
//             {(displayMode === 'table' || displayMode === 'both') && (
//               <div className={displayMode === 'both' ? 'mt-6' : ''}>
//                 {renderTable(doData, 'DO')}
//               </div>
//             )}
            
//             <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
//               <p className="text-sm text-gray-700">
//                 <span className="font-medium">คำแนะนำ:</span> ค่า DO ที่เหมาะสมในน้ำควรอยู่ระหว่าง {doLimits.min} - {doLimits.max} mg/L 
//                 หากต่ำกว่า {doLimits.min} mg/L อาจไม่เพียงพอต่อสิ่งมีชีวิตในน้ำ ทำให้สัตว์น้ำอ่อนแอและเสี่ยงต่อการเกิดโรค
//               </p>
//             </div>
//           </div>
          
//           {/* Last Updated */}
//           <div className="bg-white p-3 rounded-lg shadow text-center">
//             <p className="text-sm text-gray-500">
//               แสดงข้อมูลล่าสุด {timeRange} รายการ | อัพเดทล่าสุด: {lastUpdated.toLocaleString('th-TH')}
//             </p>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default DOPhCharts;

/////////// main ////////////
// import React, { useState, useEffect } from 'react';
// import { db } from '../../lib/firebase';
// import { collection, getDocs, query, where } from 'firebase/firestore';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Area, AreaChart, ComposedChart } from 'recharts';

// const DOPhCharts = () => {
//   const [pHData, setPHData] = useState([]);
//   const [doData, setDOData] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [debug, setDebug] = useState(null);
//   const [displayMode, setDisplayMode] = useState('chart'); // 'chart', 'table', or 'both'
//   const [chartType, setChartType] = useState('line'); // 'line', 'area', or 'composed'
//   const [showRefLines, setShowRefLines] = useState(true);
//   // Removed timeRange state and set a fixed limit of 10
//   const timeRange = '10'; // Fixed to 10 items

//   // pH limits and their consequences
//   const pHLimits = {
//     min: 6.5,
//     max: 8.5,
//     dangerousLow: 5.0,
//     dangerousHigh: 9.0
//   };

//   // DO limits
//   const doLimits = {
//     min: 5.0,
//     max: 12.0
//   };

//   // ฟังก์ชันแปลง timestamp เป็นวันที่ที่อ่านได้
//   const formatTimestamp = (timestamp) => {
//     try {
//       if (!timestamp) return "Unknown";
      
//       let date;
//       if (timestamp instanceof Date) {
//         date = timestamp;
//       } else if (timestamp.seconds) {
//         // กรณีเป็น Firestore Timestamp
//         date = new Date(timestamp.seconds * 1000);
//       } else if (typeof timestamp === 'number') {
//         date = new Date(timestamp);
//       } else if (typeof timestamp === 'string') {
//         date = new Date(timestamp);
//       } else {
//         return String(timestamp).substring(0, 10);
//       }
      
//       return date.toLocaleDateString('en-GB', { 
//         weekday: 'short', 
//         year: 'numeric', 
//         month: 'short', 
//         day: 'numeric',
//         hour: '2-digit', 
//         minute: '2-digit'
//       });
//     } catch (e) {
//       console.error("Error formatting timestamp:", e);
//       return String(timestamp).substring(0, 10);
//     }
//   };

//   // ฟังก์ชันสำหรับแปลงจากค่า pH เป็นสถานะ
//   const getPHStatus = (value) => {
//     if (value < pHLimits.dangerousLow || value > pHLimits.dangerousHigh) {
//       return 'อันตราย';
//     } else if (value < pHLimits.min || value > pHLimits.max) {
//       return 'ควรระวัง';
//     } else {
//       return 'เหมาะสม';
//     }
//   };

//   // ฟังก์ชันสำหรับแปลงจากค่า DO เป็นสถานะ
//   const getDOStatus = (value) => {
//     if (value < doLimits.min) {
//       return 'ออกซิเจนต่ำ';
//     } else if (value > doLimits.max) {
//       return 'ออกซิเจนสูง';
//     } else {
//       return 'เหมาะสม';
//     }
//   };

//   // Custom tooltip for better display
//   const CustomTooltip = ({ active, payload, label, sensorType }) => {
//     if (active && payload && payload.length) {
//       const value = payload[0].value;
//       let status, statusColor;
      
//       if (sensorType === 'pH') {
//         status = getPHStatus(value);
//         if (status === 'อันตราย') {
//           statusColor = 'text-red-600 font-bold';
//         } else if (status === 'ควรระวัง') {
//           statusColor = 'text-yellow-600 font-bold';
//         } else {
//           statusColor = 'text-green-600 font-bold';
//         }
//       } else { // DO
//         status = getDOStatus(value);
//         if (status === 'ออกซิเจนต่ำ') {
//           statusColor = 'text-red-600 font-bold';
//         } else if (status === 'ออกซิเจนสูง') {
//           statusColor = 'text-yellow-600 font-bold';
//         } else {
//           statusColor = 'text-green-600 font-bold';
//         }
//       }
      
//       return (
//         <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
//           <p className="text-gray-600">{label}</p>
//           <p className="font-medium">
//             {sensorType === 'pH' ? 'pH Level: ' : 'DO Level: '}
//             <span className="text-blue-600">{value.toFixed(2)}</span>
//             {sensorType === 'DO' && ' mg/L'}
//           </p>
//           <p className="mt-1">
//             สถานะ: <span className={statusColor}>{status}</span>
//           </p>
//         </div>
//       );
//     }
//     return null;
//   };

//   // ดึงข้อมูลจาก Firestore
//   useEffect(() => {
//     async function fetchData() {
//       try {
//         setIsLoading(true);
//         const datalogRef = collection(db, "datalog");
        
//         // ดึงข้อมูลเฉพาะ sensor_id "1" สำหรับกราฟ pH (เปลี่ยนจากการดึงทั้งหมด)
//         const pHQuery = query(datalogRef, where("sensor_id", "==", "1"));
//         const pHSnapshot = await getDocs(pHQuery);
        
//         // ดึงข้อมูลเฉพาะ sensor_id "2" สำหรับกราฟ DO
//         const doQuery = query(datalogRef, where("sensor_id", "==", "2"));
//         const doSnapshot = await getDocs(doQuery);
        
//         // เก็บข้อมูลดิบไว้เพื่อ debug
//         const rawPHData = [];
//         const rawDOData = [];
        
//         // แปลงข้อมูล pH
//         pHSnapshot.forEach((doc) => {
//           const data = doc.data();
//           rawPHData.push({ id: doc.id, ...data });
//         });
        
//         // แปลงข้อมูล DO
//         doSnapshot.forEach((doc) => {
//           const data = doc.data();
//           rawDOData.push({ id: doc.id, ...data });
//         });
        
//         // บันทึกข้อมูลดิบไว้เพื่อตรวจสอบ
//         setDebug({ pHData: rawPHData, doData: rawDOData });
        
//         // จัดรูปแบบข้อมูล pH
//         const formattedPHData = rawPHData.map((item) => {
//           const value = parseFloat(item.value || item.pH || item.ph || item.PH || 0);
//           const status = getPHStatus(value);
//           return {
//             name: formatTimestamp(item.timestamp),
//             value: value,
//             status: status,
//             // ค่าสำหรับทำ area chart
//             safeZoneMin: pHLimits.min,
//             safeZoneMax: pHLimits.max,
//             // เก็บ timestamp ดิบไว้เพื่อการเรียงลำดับ
//             rawTimestamp: item.timestamp instanceof Date ? item.timestamp.getTime() : 
//                           item.timestamp?.seconds ? item.timestamp.seconds * 1000 : 
//                           typeof item.timestamp === 'number' ? item.timestamp : 
//                           new Date(item.timestamp || 0).getTime()
//           };
//         });
        
//         // จัดรูปแบบข้อมูล DO
//         const formattedDOData = rawDOData.map((item) => {
//           const value = parseFloat(item.value || item.DO || item.do || 0);
//           const status = getDOStatus(value);
//           return {
//             name: formatTimestamp(item.timestamp),
//             value: value,
//             status: status,
//             // ค่าสำหรับทำ area chart
//             safeZoneMin: doLimits.min,
//             safeZoneMax: doLimits.max,
//             // เก็บ timestamp ดิบไว้เพื่อการเรียงลำดับ
//             rawTimestamp: item.timestamp instanceof Date ? item.timestamp.getTime() : 
//                           item.timestamp?.seconds ? item.timestamp.seconds * 1000 : 
//                           typeof item.timestamp === 'number' ? item.timestamp : 
//                           new Date(item.timestamp || 0).getTime()
//           };
//         });

//         // จัดเรียงข้อมูลตามเวลา
//         formattedPHData.sort((a, b) => a.rawTimestamp - b.rawTimestamp);
//         formattedDOData.sort((a, b) => a.rawTimestamp - b.rawTimestamp);

//         // Always limit to 10 items
//         const limitPHData = () => {
//           const limit = parseInt(timeRange);
//           return formattedPHData.length > limit ? formattedPHData.slice(-limit) : formattedPHData;
//         };

//         const limitDOData = () => {
//           const limit = parseInt(timeRange);
//           return formattedDOData.length > limit ? formattedDOData.slice(-limit) : formattedDOData;
//         };

//         setPHData(limitPHData());
//         setDOData(limitDOData());
//       } catch (err) {
//         console.error("Error fetching data:", err);
//         setError("ไม่สามารถโหลดข้อมูลได้: " + err.message);
//       } finally {
//         setIsLoading(false);
//       }
//     }

//     fetchData();
//   }, []); // Removed timeRange from dependency array since it's now fixed

//   // คำนวณ domain ของ YAxis สำหรับกราฟ DO
//   const calculateDODomain = () => {
//     if (doData.length === 0) return [0, 15]; // typical DO range
    
//     // หาค่า min/max จากข้อมูล
//     const values = doData.map(item => item.value);
//     const dataMin = Math.min(...values);
//     const dataMax = Math.max(...values);
    
//     // สร้าง domain ให้มีช่องว่างมากกว่าข้อมูลเล็กน้อย
//     return [
//       Math.max(0, Math.min(dataMin - 2, doLimits.min - 1)),
//       Math.max(dataMax + 2, doLimits.max + 1)
//     ];
//   };

//   // DO domain
//   const doDomain = calculateDODomain();

//   // สีสำหรับกราฟ
//   const chartColors = {
//     ph: {
//       line: '#3B82F6', // blue-500
//       area: 'rgba(59, 130, 246, 0.2)', // transparent blue
//       safeZone: 'rgba(16, 185, 129, 0.1)', // transparent green
//     },
//     do: {
//       line: '#10B981', // emerald-500
//       area: 'rgba(16, 185, 129, 0.2)', // transparent emerald
//       safeZone: 'rgba(245, 158, 11, 0.1)', // transparent amber
//     }
//   };

//   // สร้าง Chart ตามประเภทที่เลือก
//   const renderPHChart = () => {
//     if (pHData.length === 0) {
//       return <div className="text-center py-10 bg-gray-50 rounded-lg">ไม่พบข้อมูล pH จาก Sensor ID 1</div>;
//     }

//     if (chartType === 'line') {
//       return (
//         <ResponsiveContainer width="100%" height={300}>
//           <LineChart 
//             data={pHData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={[0, 14]} 
//               ticks={[0, 2, 4, 6, 8, 10, 12, 14]} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="pH" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 <ReferenceLine y={pHLimits.min} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${pHLimits.min}`, position: 'left', fill: '#10B981', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.max} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${pHLimits.max}`, position: 'left', fill: '#10B981', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.dangerousLow} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Danger: ${pHLimits.dangerousLow}`, position: 'left', fill: '#EF4444', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.dangerousHigh} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Danger: ${pHLimits.dangerousHigh}`, position: 'left', fill: '#EF4444', fontSize: 12 }} />
//               </>
//             )}
            
//             <Line
//               name="pH Level"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.ph.line}
//               strokeWidth={3}
//               dot={{ r: 5, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </LineChart>
//         </ResponsiveContainer>
//       );
//     } else if (chartType === 'area') {
//       return (
//         <ResponsiveContainer width="100%" height={300}>
//           <AreaChart 
//             data={pHData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <defs>
//               <linearGradient id="colorPH" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="5%" stopColor={chartColors.ph.line} stopOpacity={0.8}/>
//                 <stop offset="95%" stopColor={chartColors.ph.line} stopOpacity={0.1}/>
//               </linearGradient>
//               <linearGradient id="safeZonePH" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="0%" stopColor="#10B981" stopOpacity={0.2}/>
//                 <stop offset="100%" stopColor="#10B981" stopOpacity={0.1}/>
//               </linearGradient>
//             </defs>
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={[0, 14]} 
//               ticks={[0, 2, 4, 6, 8, 10, 12, 14]} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="pH" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 {/* Dangerous Low (red dashed) */}
//                 <ReferenceLine 
//                   y={pHLimits.dangerousLow} 
//                   stroke="#EF4444" 
//                   strokeWidth={1.5} 
//                   strokeDasharray="6 4" 
//                   label={{
//                     value: `อันตรายต่ำ < ${pHLimits.dangerousLow}`, 
//                     position: 'left', 
//                     fill: '#EF4444', 
//                     fontSize: 12
//                   }} 
//                 />

//                 {/* Warning Low (yellow dashed) */}
//                 <ReferenceLine 
//                   y={pHLimits.min} 
//                   stroke="#FBBF24" 
//                   strokeWidth={1.5} 
//                   strokeDasharray="6 4" 
//                   label={{
//                     value: `ควรระวัง < ${pHLimits.min}`, 
//                     position: 'left', 
//                     fill: '#FBBF24', 
//                     fontSize: 12
//                   }} 
//                 />

//                 {/* Warning High (yellow dashed) */}
//                 <ReferenceLine 
//                   y={pHLimits.max} 
//                   stroke="#FBBF24" 
//                   strokeWidth={1.5} 
//                   strokeDasharray="6 4" 
//                   label={{
//                     value: `ควรระวัง > ${pHLimits.max}`, 
//                     position: 'left', 
//                     fill: '#FBBF24', 
//                     fontSize: 12
//                   }} 
//                 />

//                 {/* Dangerous High (red dashed) */}
//                 <ReferenceLine 
//                   y={pHLimits.dangerousHigh} 
//                   stroke="#EF4444" 
//                   strokeWidth={1.5} 
//                   strokeDasharray="6 4" 
//                   label={{
//                     value: `อันตรายสูง > ${pHLimits.dangerousHigh}`, 
//                     position: 'left', 
//                     fill: '#EF4444', 
//                     fontSize: 12
//                   }} 
//                 />
//               </>
//             )}

            
//             <Area
//               name="Safe pH Zone"
//               type="monotone"
//               dataKey="safeZoneMax"
//               stroke="none"
//               fillOpacity={1}
//               fill="url(#safeZonePH)"
//               legendType="none"
//             />
            
//             <Area
//               name="pH Level"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.ph.line}
//               strokeWidth={3}
//               fillOpacity={1}
//               fill="url(#colorPH)"
//               dot={{ r: 5, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </AreaChart>
//         </ResponsiveContainer>
//       );
//     } else { // composed
//       return (
//         <ResponsiveContainer width="100%" height={300}>
//           <ComposedChart 
//             data={pHData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <defs>
//               <linearGradient id="colorPH" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="5%" stopColor={chartColors.ph.line} stopOpacity={0.8}/>
//                 <stop offset="95%" stopColor={chartColors.ph.line} stopOpacity={0.1}/>
//               </linearGradient>
//             </defs>
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={[0, 14]} 
//               ticks={[0, 2, 4, 6, 8, 10, 12, 14]} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="pH" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 <ReferenceLine y={pHLimits.min} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${pHLimits.min}`, position: 'left', fill: '#10B981', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.max} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${pHLimits.max}`, position: 'left', fill: '#10B981', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.dangerousLow} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Danger: ${pHLimits.dangerousLow}`, position: 'left', fill: '#EF4444', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.dangerousHigh} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Danger: ${pHLimits.dangerousHigh}`, position: 'left', fill: '#EF4444', fontSize: 12 }} />
//               </>
//             )}
            
//             <Area
//               name="pH Level Area"
//               type="monotone"
//               dataKey="value"
//               fill="url(#colorPH)"
//               fillOpacity={0.4}
//               stroke="none"
//               legendType="none"
//             />
            
//             <Line
//               name="pH Level"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.ph.line}
//               strokeWidth={3}
//               dot={{ r: 5, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </ComposedChart>
//         </ResponsiveContainer>
//       );
//     }
//   };

//   const renderDOChart = () => {
//     if (doData.length === 0) {
//       return <div className="text-center py-10 bg-gray-50 rounded-lg">ไม่พบข้อมูล DO จาก Sensor ID 2</div>;
//     }

//     if (chartType === 'line') {
//       return (
//         <ResponsiveContainer width="100%" height={300}>
//           <LineChart 
//             data={doData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={doDomain} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="DO" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 <ReferenceLine y={doLimits.min} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${doLimits.min} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//                 <ReferenceLine y={doLimits.max} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${doLimits.max} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//               </>
//             )}
            
//             <Line
//               name="DO Level (mg/L)"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.do.line}
//               strokeWidth={3}
//               dot={{ r: 5, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </LineChart>
//         </ResponsiveContainer>
//       );
//     } else if (chartType === 'area') {
//       return (
//         <ResponsiveContainer width="100%" height={300}>
//           <AreaChart 
//             data={doData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <defs>
//               <linearGradient id="colorDO" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="5%" stopColor={chartColors.do.line} stopOpacity={0.8}/>
//                 <stop offset="95%" stopColor={chartColors.do.line} stopOpacity={0.1}/>
//               </linearGradient>
//               <linearGradient id="safeZoneDO" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.2}/>
//                 <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.1}/>
//               </linearGradient>
//             </defs>
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={doDomain} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="DO" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 <ReferenceLine y={doLimits.min} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${doLimits.min} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//                 <ReferenceLine y={doLimits.max} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${doLimits.max} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//               </>
//             )}
            
//             <Area
//               name="Safe DO Zone"
//               type="monotone"
//               dataKey="safeZoneMax"
//               stroke="none"
//               fillOpacity={1}
//               fill="url(#safeZoneDO)"
//               legendType="none"
//             />
            
//             <Area
//               name="DO Level (mg/L)"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.do.line}
//               strokeWidth={3}
//               fillOpacity={1}
//               fill="url(#colorDO)"
//               dot={{ r: 5, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </AreaChart>
//         </ResponsiveContainer>
//       );
//     } else { // composed chart for DO
//       return (
//         <ResponsiveContainer width="100%" height={300}>
//           <ComposedChart 
//             data={doData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <defs>
//               <linearGradient id="colorDO" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="5%" stopColor={chartColors.do.line} stopOpacity={0.8}/>
//                 <stop offset="95%" stopColor={chartColors.do.line} stopOpacity={0.1}/>
//               </linearGradient>
//             </defs>
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={doDomain} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="DO" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 <ReferenceLine y={doLimits.min} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${doLimits.min} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//                 <ReferenceLine y={doLimits.max} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${doLimits.max} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//               </>
//             )}
            
//             <Area
//               name="DO Level Area"
//               type="monotone"
//               dataKey="value"
//               fill="url(#colorDO)"
//               fillOpacity={0.4}
//               stroke="none"
//               legendType="none"
//             />
            
//             <Line
//               name="DO Level (mg/L)"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.do.line}
//               strokeWidth={3}
//               dot={{ r: 5, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </ComposedChart>
//         </ResponsiveContainer>
//       );
//     }
//   };

//   // Render table component for data
//   const renderTable = (data, type) => {
//     const headers = type === 'pH' 
//       ? ['วันที่', 'ค่า pH', 'สถานะ'] 
//       : ['วันที่', 'ค่า DO (mg/L)', 'สถานะ'];
    
//     return (
//       <div className="overflow-x-auto bg-white rounded-lg shadow">
//         <table className="min-w-full">
//           <thead className="bg-gray-50">
//             <tr>
//               {headers.map((header, index) => (
//                 <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   {header}
//                 </th>
//               ))}
//             </tr>
//           </thead>
//           <tbody className="bg-white divide-y divide-gray-200">
//             {data.map((item, index) => {
//               let statusClass = '';
//               if (type === 'pH') {
//                 statusClass = item.status === 'อันตราย' ? 'text-red-600 font-medium' 
//                   : item.status === 'ควรระวัง' ? 'text-yellow-600 font-medium' 
//                   : 'text-green-600 font-medium';
//               } else {
//                 statusClass = item.status === 'ออกซิเจนต่ำ' ? 'text-red-600 font-medium' 
//                   : item.status === 'ออกซิเจนสูง' ? 'text-yellow-600 font-medium' 
//                   : 'text-green-600 font-medium';
//               }
              
//               return (
//                 <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.name}</td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.value.toFixed(2)}</td>
//                   <td className={`px-6 py-4 whitespace-nowrap text-sm ${statusClass}`}>{item.status}</td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>
//     );
//   };

//   // ส่วนแสดงผลของ Component
//   return (
//     <div className="bg-gray-100 p-4 rounded-lg shadow">
//       {/* Controls for display options */}
//       <div className="mb-6 flex flex-wrap gap-4 bg-white p-4 rounded-lg shadow">
//         <div>
//           <label htmlFor="displayMode" className="block text-sm font-medium text-gray-700 mb-1">รูปแบบการแสดงผล</label>
//           <select
//             id="displayMode"
//             value={displayMode}
//             onChange={(e) => setDisplayMode(e.target.value)}
//             className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
//           >
//             <option value="chart">กราฟ</option>
//             <option value="table">ตาราง</option>
//             <option value="both">กราฟและตาราง</option>
//           </select>
//         </div>
        
//         {(displayMode === 'chart' || displayMode === 'both') && (
//           <>
//             <div>
//               <label htmlFor="chartType" className="block text-sm font-medium text-gray-700 mb-1">ประเภทกราฟ</label>
//               <select
//                 id="chartType"
//                 value={chartType}
//                 onChange={(e) => setChartType(e.target.value)}
//                 className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
//               >
//                 <option value="line">Line Chart</option>
//                 <option value="area">Area Chart</option>
//                 <option value="composed">Composed Chart</option>
//               </select>
//             </div>
            
//             <div className="flex items-end">
//               <label className="inline-flex items-center mt-1">
//                 <input
//                   type="checkbox"
//                   checked={showRefLines}
//                   onChange={() => setShowRefLines(!showRefLines)}
//                   className="form-checkbox h-5 w-5 text-indigo-600 rounded"
//                 />
//                 <span className="ml-2 text-sm text-gray-700">แสดงเส้นขีดจำกัด</span>
//               </label>
//             </div>
//           </>
//         )}
//       </div>
      
//       {/* Loading state */}
//       {isLoading && (
//         <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow">
//           <svg className="animate-spin h-10 w-10 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//           </svg>
//           <span className="ml-3 text-lg text-gray-700">กำลังโหลดข้อมูล...</span>
//         </div>
//       )}
      
//       {/* Error state */}
//       {error && (
//         <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700 mb-6">
//           <div className="flex">
//             <svg className="h-5 w-5 text-red-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
//             </svg>
//             <span>{error}</span>
//           </div>
//         </div>
//       )}
      
//       {/* Content display based on mode */}
//       {!isLoading && !error && (
//         <div className="space-y-8">
//           {/* pH section */}
//           <div className="bg-white p-4 rounded-lg shadow">
//             <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
//               <span className="inline-block w-4 h-4 rounded-full bg-blue-500 mr-2"></span>
//               ค่าความเป็นกรด-ด่าง (pH)
//             </h2>
            
//             {(displayMode === 'chart' || displayMode === 'both') && renderPHChart()}
            
//             {(displayMode === 'table' || displayMode === 'both') && (
//               <div className={displayMode === 'both' ? 'mt-6' : ''}>
//                 {renderTable(pHData, 'pH')}
//               </div>
//             )}
            
//             <div className="mt-4 p-3 bg-blue-50 rounded-lg">
//               <p className="text-sm text-gray-700">
//                 <span className="font-medium">คำแนะนำ:</span> ค่า pH ที่เหมาะสมในน้ำควรอยู่ระหว่าง {pHLimits.min} - {pHLimits.max} 
//                 หากต่ำกว่า {pHLimits.min} น้ำจะเป็นกรด หากสูงกว่า {pHLimits.max} น้ำจะเป็นด่าง 
//                 โดยค่าที่ต่ำกว่า {pHLimits.dangerousLow} หรือสูงกว่า {pHLimits.dangerousHigh} อาจเป็นอันตรายต่อสิ่งมีชีวิตในน้ำ
//               </p>
//             </div>
//           </div>
          
//           {/* DO section */}
//           <div className="bg-white p-4 rounded-lg shadow">
//             <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
//               <span className="inline-block w-4 h-4 rounded-full bg-emerald-500 mr-2"></span>
//               ค่าออกซิเจนละลายในน้ำ (DO)
//             </h2>
            
//             {(displayMode === 'chart' || displayMode === 'both') && renderDOChart()}
            
//             {(displayMode === 'table' || displayMode === 'both') && (
//               <div className={displayMode === 'both' ? 'mt-6' : ''}>
//                 {renderTable(doData, 'DO')}
//               </div>
//             )}
            
//             <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
//               <p className="text-sm text-gray-700">
//                 <span className="font-medium">คำแนะนำ:</span> ค่า DO ที่เหมาะสมในน้ำควรอยู่ระหว่าง {doLimits.min} - {doLimits.max} mg/L 
//                 หากต่ำกว่า {doLimits.min} mg/L อาจไม่เพียงพอต่อสิ่งมีชีวิตในน้ำ ทำให้สัตว์น้ำอ่อนแอและเสี่ยงต่อการเกิดโรค
//               </p>
//             </div>
//           </div>
          
//           {/* Last Updated */}
//           <div className="bg-white p-3 rounded-lg shadow text-center">
//             <p className="text-sm text-gray-500">
//               แสดงข้อมูลล่าสุด {timeRange} รายการ | อัพเดทล่าสุด: {new Date().toLocaleString('th-TH')}
//             </p>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default DOPhCharts;

// import React, { useState, useEffect } from 'react';
// import { db } from '../../lib/firebase';
// import { collection, getDocs, query, where } from 'firebase/firestore';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Area, AreaChart, ComposedChart } from 'recharts';

// const DOPhCharts = () => {
//   const [pHData, setPHData] = useState([]);
//   const [doData, setDOData] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [debug, setDebug] = useState(null);
//   const [displayMode, setDisplayMode] = useState('chart'); // 'chart', 'table', or 'both'
//   const [chartType, setChartType] = useState('line'); // 'line', 'area', or 'composed'
//   const [showRefLines, setShowRefLines] = useState(true);
//   // Removed timeRange state and set a fixed limit of 10
//   const timeRange = '10'; // Fixed to 10 items

//   // pH limits and their consequences
//   const pHLimits = {
//     min: 6.5,
//     max: 8.5,
//     dangerousLow: 5.0,
//     dangerousHigh: 9.0
//   };

//   // DO limits
//   const doLimits = {
//     min: 5.0,
//     max: 12.0
//   };

//   // ฟังก์ชันแปลง timestamp เป็นวันที่ที่อ่านได้
//   const formatTimestamp = (timestamp) => {
//     try {
//       if (!timestamp) return "Unknown";
      
//       let date;
//       if (timestamp instanceof Date) {
//         date = timestamp;
//       } else if (timestamp.seconds) {
//         // กรณีเป็น Firestore Timestamp
//         date = new Date(timestamp.seconds * 1000);
//       } else if (typeof timestamp === 'number') {
//         date = new Date(timestamp);
//       } else if (typeof timestamp === 'string') {
//         date = new Date(timestamp);
//       } else {
//         return String(timestamp).substring(0, 10);
//       }
      
//       return date.toLocaleDateString('en-GB', { 
//         weekday: 'short', 
//         year: 'numeric', 
//         month: 'short', 
//         day: 'numeric',
//         hour: '2-digit', 
//         minute: '2-digit'
//       });
//     } catch (e) {
//       console.error("Error formatting timestamp:", e);
//       return String(timestamp).substring(0, 10);
//     }
//   };

//   // ฟังก์ชันสำหรับแปลงจากค่า pH เป็นสถานะ
//   const getPHStatus = (value) => {
//     if (value < pHLimits.dangerousLow || value > pHLimits.dangerousHigh) {
//       return 'อันตราย';
//     } else if (value < pHLimits.min || value > pHLimits.max) {
//       return 'ควรระวัง';
//     } else {
//       return 'เหมาะสม';
//     }
//   };

//   // ฟังก์ชันสำหรับแปลงจากค่า DO เป็นสถานะ
//   const getDOStatus = (value) => {
//     if (value < doLimits.min) {
//       return 'ออกซิเจนต่ำ';
//     } else if (value > doLimits.max) {
//       return 'ออกซิเจนสูง';
//     } else {
//       return 'เหมาะสม';
//     }
//   };

//   // Custom tooltip for better display
//   const CustomTooltip = ({ active, payload, label, sensorType }) => {
//     if (active && payload && payload.length) {
//       const value = payload[0].value;
//       let status, statusColor;
      
//       if (sensorType === 'pH') {
//         status = getPHStatus(value);
//         if (status === 'อันตราย') {
//           statusColor = 'text-red-600 font-bold';
//         } else if (status === 'ควรระวัง') {
//           statusColor = 'text-yellow-600 font-bold';
//         } else {
//           statusColor = 'text-green-600 font-bold';
//         }
//       } else { // DO
//         status = getDOStatus(value);
//         if (status === 'ออกซิเจนต่ำ') {
//           statusColor = 'text-red-600 font-bold';
//         } else if (status === 'ออกซิเจนสูง') {
//           statusColor = 'text-yellow-600 font-bold';
//         } else {
//           statusColor = 'text-green-600 font-bold';
//         }
//       }
      
//       return (
//         <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
//           <p className="text-gray-600">{label}</p>
//           <p className="font-medium">
//             {sensorType === 'pH' ? 'pH Level: ' : 'DO Level: '}
//             <span className="text-blue-600">{value.toFixed(2)}</span>
//             {sensorType === 'DO' && ' mg/L'}
//           </p>
//           <p className="mt-1">
//             สถานะ: <span className={statusColor}>{status}</span>
//           </p>
//         </div>
//       );
//     }
//     return null;
//   };

//   // ดึงข้อมูลจาก Firestore
//   useEffect(() => {
//     async function fetchData() {
//       try {
//         setIsLoading(true);
//         const datalogRef = collection(db, "datalog");
        
//         // ดึงข้อมูลทั้งหมดสำหรับกราฟ pH
//         const pHSnapshot = await getDocs(datalogRef);
        
//         // ดึงข้อมูลเฉพาะ sensor_id "2" สำหรับกราฟ DO
//         const doQuery = query(datalogRef, where("sensor_id", "==", "2"));
//         const doSnapshot = await getDocs(doQuery);
        
//         // เก็บข้อมูลดิบไว้เพื่อ debug
//         const rawPHData = [];
//         const rawDOData = [];
        
//         // แปลงข้อมูล pH
//         pHSnapshot.forEach((doc) => {
//           const data = doc.data();
//           rawPHData.push({ id: doc.id, ...data });
//         });
        
//         // แปลงข้อมูล DO
//         doSnapshot.forEach((doc) => {
//           const data = doc.data();
//           rawDOData.push({ id: doc.id, ...data });
//         });
        
//         // บันทึกข้อมูลดิบไว้เพื่อตรวจสอบ
//         setDebug({ pHData: rawPHData, doData: rawDOData });
        
//         // จัดรูปแบบข้อมูล pH
//         const formattedPHData = rawPHData.map((item) => {
//           const value = parseFloat(item.value || item.pH || item.ph || item.PH || 0);
//           const status = getPHStatus(value);
//           return {
//             name: formatTimestamp(item.timestamp),
//             value: value,
//             status: status,
//             // ค่าสำหรับทำ area chart
//             safeZoneMin: pHLimits.min,
//             safeZoneMax: pHLimits.max,
//             // เก็บ timestamp ดิบไว้เพื่อการเรียงลำดับ
//             rawTimestamp: item.timestamp instanceof Date ? item.timestamp.getTime() : 
//                           item.timestamp?.seconds ? item.timestamp.seconds * 1000 : 
//                           typeof item.timestamp === 'number' ? item.timestamp : 
//                           new Date(item.timestamp || 0).getTime()
//           };
//         });
        
//         // จัดรูปแบบข้อมูล DO
//         const formattedDOData = rawDOData.map((item) => {
//           const value = parseFloat(item.value || item.DO || item.do || 0);
//           const status = getDOStatus(value);
//           return {
//             name: formatTimestamp(item.timestamp),
//             value: value,
//             status: status,
//             // ค่าสำหรับทำ area chart
//             safeZoneMin: doLimits.min,
//             safeZoneMax: doLimits.max,
//             // เก็บ timestamp ดิบไว้เพื่อการเรียงลำดับ
//             rawTimestamp: item.timestamp instanceof Date ? item.timestamp.getTime() : 
//                           item.timestamp?.seconds ? item.timestamp.seconds * 1000 : 
//                           typeof item.timestamp === 'number' ? item.timestamp : 
//                           new Date(item.timestamp || 0).getTime()
//           };
//         });

//         // จัดเรียงข้อมูลตามเวลา
//         formattedPHData.sort((a, b) => a.rawTimestamp - b.rawTimestamp);
//         formattedDOData.sort((a, b) => a.rawTimestamp - b.rawTimestamp);

//         // Always limit to 10 items
//         const limitPHData = () => {
//           const limit = parseInt(timeRange);
//           return formattedPHData.length > limit ? formattedPHData.slice(-limit) : formattedPHData;
//         };

//         const limitDOData = () => {
//           const limit = parseInt(timeRange);
//           return formattedDOData.length > limit ? formattedDOData.slice(-limit) : formattedDOData;
//         };

//         setPHData(limitPHData());
//         setDOData(limitDOData());
//       } catch (err) {
//         console.error("Error fetching data:", err);
//         setError("ไม่สามารถโหลดข้อมูลได้: " + err.message);
//       } finally {
//         setIsLoading(false);
//       }
//     }

//     fetchData();
//   }, []); // Removed timeRange from dependency array since it's now fixed

//   // คำนวณ domain ของ YAxis สำหรับกราฟ DO
//   const calculateDODomain = () => {
//     if (doData.length === 0) return [0, 15]; // typical DO range
    
//     // หาค่า min/max จากข้อมูล
//     const values = doData.map(item => item.value);
//     const dataMin = Math.min(...values);
//     const dataMax = Math.max(...values);
    
//     // สร้าง domain ให้มีช่องว่างมากกว่าข้อมูลเล็กน้อย
//     return [
//       Math.max(0, Math.min(dataMin - 2, doLimits.min - 1)),
//       Math.max(dataMax + 2, doLimits.max + 1)
//     ];
//   };

//   // DO domain
//   const doDomain = calculateDODomain();

//   // สีสำหรับกราฟ
//   const chartColors = {
//     ph: {
//       line: '#3B82F6', // blue-500
//       area: 'rgba(59, 130, 246, 0.2)', // transparent blue
//       safeZone: 'rgba(16, 185, 129, 0.1)', // transparent green
//     },
//     do: {
//       line: '#10B981', // emerald-500
//       area: 'rgba(16, 185, 129, 0.2)', // transparent emerald
//       safeZone: 'rgba(245, 158, 11, 0.1)', // transparent amber
//     }
//   };

//   // สร้าง Chart ตามประเภทที่เลือก
//   const renderPHChart = () => {
//     if (pHData.length === 0) {
//       return <div className="text-center py-10 bg-gray-50 rounded-lg">ไม่พบข้อมูล pH</div>;
//     }

//     if (chartType === 'line') {
//       return (
//         <ResponsiveContainer width="100%" height={300}>
//           <LineChart 
//             data={pHData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={[0, 14]} 
//               ticks={[0, 2, 4, 6, 8, 10, 12, 14]} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="pH" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 <ReferenceLine y={pHLimits.min} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${pHLimits.min}`, position: 'left', fill: '#10B981', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.max} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${pHLimits.max}`, position: 'left', fill: '#10B981', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.dangerousLow} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Danger: ${pHLimits.dangerousLow}`, position: 'left', fill: '#EF4444', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.dangerousHigh} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Danger: ${pHLimits.dangerousHigh}`, position: 'left', fill: '#EF4444', fontSize: 12 }} />
//               </>
//             )}
            
//             <Line
//               name="pH Level"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.ph.line}
//               strokeWidth={3}
//               dot={{ r: 5, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </LineChart>
//         </ResponsiveContainer>
//       );
//     } else if (chartType === 'area') {
//       return (
//         <ResponsiveContainer width="100%" height={300}>
//           <AreaChart 
//             data={pHData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <defs>
//               <linearGradient id="colorPH" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="5%" stopColor={chartColors.ph.line} stopOpacity={0.8}/>
//                 <stop offset="95%" stopColor={chartColors.ph.line} stopOpacity={0.1}/>
//               </linearGradient>
//               <linearGradient id="safeZonePH" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="0%" stopColor="#10B981" stopOpacity={0.2}/>
//                 <stop offset="100%" stopColor="#10B981" stopOpacity={0.1}/>
//               </linearGradient>
//             </defs>
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={[0, 14]} 
//               ticks={[0, 2, 4, 6, 8, 10, 12, 14]} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="pH" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 {/* Dangerous Low (red dashed) */}
//                 <ReferenceLine 
//                   y={pHLimits.dangerousLow} 
//                   stroke="#EF4444" 
//                   strokeWidth={1.5} 
//                   strokeDasharray="6 4" 
//                   label={{
//                     value: `อันตรายต่ำ < ${pHLimits.dangerousLow}`, 
//                     position: 'left', 
//                     fill: '#EF4444', 
//                     fontSize: 12
//                   }} 
//                 />

//                 {/* Warning Low (yellow dashed) */}
//                 <ReferenceLine 
//                   y={pHLimits.min} 
//                   stroke="#FBBF24" 
//                   strokeWidth={1.5} 
//                   strokeDasharray="6 4" 
//                   label={{
//                     value: `ควรระวัง < ${pHLimits.min}`, 
//                     position: 'left', 
//                     fill: '#FBBF24', 
//                     fontSize: 12
//                   }} 
//                 />

//                 {/* Warning High (yellow dashed) */}
//                 <ReferenceLine 
//                   y={pHLimits.max} 
//                   stroke="#FBBF24" 
//                   strokeWidth={1.5} 
//                   strokeDasharray="6 4" 
//                   label={{
//                     value: `ควรระวัง > ${pHLimits.max}`, 
//                     position: 'left', 
//                     fill: '#FBBF24', 
//                     fontSize: 12
//                   }} 
//                 />

//                 {/* Dangerous High (red dashed) */}
//                 <ReferenceLine 
//                   y={pHLimits.dangerousHigh} 
//                   stroke="#EF4444" 
//                   strokeWidth={1.5} 
//                   strokeDasharray="6 4" 
//                   label={{
//                     value: `อันตรายสูง > ${pHLimits.dangerousHigh}`, 
//                     position: 'left', 
//                     fill: '#EF4444', 
//                     fontSize: 12
//                   }} 
//                 />
//               </>
//             )}

            
//             <Area
//               name="Safe pH Zone"
//               type="monotone"
//               dataKey="safeZoneMax"
//               stroke="none"
//               fillOpacity={1}
//               fill="url(#safeZonePH)"
//               legendType="none"
//             />
            
//             <Area
//               name="pH Level"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.ph.line}
//               strokeWidth={3}
//               fillOpacity={1}
//               fill="url(#colorPH)"
//               dot={{ r: 5, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </AreaChart>
//         </ResponsiveContainer>
//       );
//     } else { // composed
//       return (
//         <ResponsiveContainer width="100%" height={300}>
//           <ComposedChart 
//             data={pHData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <defs>
//               <linearGradient id="colorPH" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="5%" stopColor={chartColors.ph.line} stopOpacity={0.8}/>
//                 <stop offset="95%" stopColor={chartColors.ph.line} stopOpacity={0.1}/>
//               </linearGradient>
//             </defs>
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={[0, 14]} 
//               ticks={[0, 2, 4, 6, 8, 10, 12, 14]} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="pH" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 <ReferenceLine y={pHLimits.min} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${pHLimits.min}`, position: 'left', fill: '#10B981', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.max} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${pHLimits.max}`, position: 'left', fill: '#10B981', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.dangerousLow} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Danger: ${pHLimits.dangerousLow}`, position: 'left', fill: '#EF4444', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.dangerousHigh} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Danger: ${pHLimits.dangerousHigh}`, position: 'left', fill: '#EF4444', fontSize: 12 }} />
//               </>
//             )}
            
//             <Area
//               name="pH Level Area"
//               type="monotone"
//               dataKey="value"
//               fill="url(#colorPH)"
//               fillOpacity={0.4}
//               stroke="none"
//               legendType="none"
//             />
            
//             <Line
//               name="pH Level"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.ph.line}
//               strokeWidth={3}
//               dot={{ r: 5, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </ComposedChart>
//         </ResponsiveContainer>
//       );
//     }
//   };

//   const renderDOChart = () => {
//     if (doData.length === 0) {
//       return <div className="text-center py-10 bg-gray-50 rounded-lg">ไม่พบข้อมูล DO จาก Sensor ID 2</div>;
//     }

//     if (chartType === 'line') {
//       return (
//         <ResponsiveContainer width="100%" height={300}>
//           <LineChart 
//             data={doData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={doDomain} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="DO" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 <ReferenceLine y={doLimits.min} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${doLimits.min} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//                 <ReferenceLine y={doLimits.max} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${doLimits.max} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//               </>
//             )}
            
//             <Line
//               name="DO Level (mg/L)"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.do.line}
//               strokeWidth={3}
//               dot={{ r: 5, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </LineChart>
//         </ResponsiveContainer>
//       );
//     } else if (chartType === 'area') {
//       return (
//         <ResponsiveContainer width="100%" height={300}>
//           <AreaChart 
//             data={doData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <defs>
//               <linearGradient id="colorDO" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="5%" stopColor={chartColors.do.line} stopOpacity={0.8}/>
//                 <stop offset="95%" stopColor={chartColors.do.line} stopOpacity={0.1}/>
//               </linearGradient>
//               <linearGradient id="safeZoneDO" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.2}/>
//                 <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.1}/>
//               </linearGradient>
//             </defs>
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={doDomain} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="DO" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 <ReferenceLine y={doLimits.min} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${doLimits.min} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//                 <ReferenceLine y={doLimits.max} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${doLimits.max} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//               </>
//             )}
            
//             <Area
//               name="Safe DO Zone"
//               type="monotone"
//               dataKey="safeZoneMax"
//               stroke="none"
//               fillOpacity={1}
//               fill="url(#safeZoneDO)"
//               legendType="none"
//             />
            
//             <Area
//               name="DO Level (mg/L)"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.do.line}
//               strokeWidth={3}
//               fillOpacity={1}
//               fill="url(#colorDO)"
//               dot={{ r: 5, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </AreaChart>
//         </ResponsiveContainer>
//       );
//     } else { // composed
//       return (
//         <ResponsiveContainer width="100%" height={300}>
//           <ComposedChart 
//             data={doData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <defs>
//               <linearGradient id="colorDO" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="5%" stopColor={chartColors.do.line} stopOpacity={0.8}/>
//                 <stop offset="95%" stopColor={chartColors.do.line} stopOpacity={0.1}/>
//               </linearGradient>
//             </defs>
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={doDomain} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="DO" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 <ReferenceLine y={doLimits.min} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${doLimits.min} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//                 <ReferenceLine y={doLimits.max} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${doLimits.max} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//               </>
//             )}
            
//             <Area
//               name="DO Level Area"
//               type="monotone"
//               dataKey="value"
//               fill="url(#colorDO)"
//               fillOpacity={0.4}
//               stroke="none"
//               legendType="none"
//             />
            
//             <Line
//               name="DO Level (mg/L)"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.do.line}
//               strokeWidth={3}
//               dot={{ r: 5, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </ComposedChart>
//         </ResponsiveContainer>
//       );
//     }
//   };

//   // การแสดงข้อมูลในรูปแบบตาราง
//   const renderPHTable = () => {
//     if (pHData.length === 0) {
//       return <div className="text-center py-5">ไม่พบข้อมูล pH</div>;
//     }
    
//     return (
//       <div className="overflow-x-auto">
//         <table className="min-w-full bg-white border border-gray-200">
//           <thead>
//             <tr className="bg-gray-100">
//               <th className="py-2 px-4 border-b text-left">เวลา</th>
//               <th className="py-2 px-4 border-b text-left">ค่า pH</th>
//               <th className="py-2 px-4 border-b text-left">สถานะ</th>
//             </tr>
//           </thead>
//           <tbody>
//             {pHData.map((item, index) => {
//               let statusColor = '';
//               if (item.status === 'อันตราย') {
//                 statusColor = 'text-red-600 font-medium';
//               } else if (item.status === 'ควรระวัง') {
//                 statusColor = 'text-yellow-600 font-medium';
//               } else {
//                 statusColor = 'text-green-600 font-medium';
//               }
              
//               return (
//                 <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
//                   <td className="py-2 px-4 border-b">{item.name}</td>
//                   <td className="py-2 px-4 border-b">{item.value.toFixed(2)}</td>
//                   <td className={`py-2 px-4 border-b ${statusColor}`}>{item.status}</td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>
//     );
//   };

//   const renderDOTable = () => {
//     if (doData.length === 0) {
//       return <div className="text-center py-5">ไม่พบข้อมูล DO</div>;
//     }
    
//     return (
//       <div className="overflow-x-auto">
//         <table className="min-w-full bg-white border border-gray-200">
//           <thead>
//             <tr className="bg-gray-100">
//               <th className="py-2 px-4 border-b text-left">เวลา</th>
//               <th className="py-2 px-4 border-b text-left">ค่า DO (mg/L)</th>
//               <th className="py-2 px-4 border-b text-left">สถานะ</th>
//             </tr>
//           </thead>
//           <tbody>
//             {doData.map((item, index) => {
//               let statusColor = '';
//               if (item.status === 'ออกซิเจนต่ำ') {
//                 statusColor = 'text-red-600 font-medium';
//               } else if (item.status === 'ออกซิเจนสูง') {
//                 statusColor = 'text-yellow-600 font-medium';
//               } else {
//                 statusColor = 'text-green-600 font-medium';
//               }
              
//               return (
//                 <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
//                   <td className="py-2 px-4 border-b">{item.name}</td>
//                   <td className="py-2 px-4 border-b">{item.value.toFixed(2)}</td>
//                   <td className={`py-2 px-4 border-b ${statusColor}`}>{item.status}</td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>
//     );
//   };

//   return (
//     <div className="bg-white rounded-lg shadow-md p-6">
//       <div className="flex flex-col md:flex-row justify-between items-center mb-6">
//         <h2 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">ข้อมูลค่า pH และ DO</h2>
        
//         <div className="flex flex-wrap gap-2">
//           <div className="flex items-center">
//             <label htmlFor="chartType" className="mr-2 text-gray-600">รูปแบบกราฟ:</label>
//             <select
//               id="chartType"
//               value={chartType}
//               onChange={(e) => setChartType(e.target.value)}
//               className="border border-gray-300 rounded px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
//             >
//               <option value="line">เส้น</option>
//               <option value="area">พื้นที่</option>
//               <option value="composed">ผสม</option>
//             </select>
//           </div>
          
//           <div className="flex items-center">
//             <label htmlFor="displayMode" className="mr-2 text-gray-600">แสดงข้อมูล:</label>
//             <select
//               id="displayMode"
//               value={displayMode}
//               onChange={(e) => setDisplayMode(e.target.value)}
//               className="border border-gray-300 rounded px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
//             >
//               <option value="chart">กราฟ</option>
//               <option value="table">ตาราง</option>
//               <option value="both">ทั้งหมด</option>
//             </select>
//           </div>
          
//           <div className="flex items-center">
//             <label className="inline-flex items-center cursor-pointer">
//               <input 
//                 type="checkbox" 
//                 checked={showRefLines} 
//                 onChange={() => setShowRefLines(!showRefLines)}
//                 className="sr-only peer" 
//               />
//               <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
//               <span className="ms-3 text-sm font-medium text-gray-600">แสดงเส้นอ้างอิง</span>
//             </label>
//           </div>
//         </div>
//       </div>
      
//       {isLoading ? (
//         <div className="flex justify-center items-center py-10">
//           <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
//           <span className="ml-3 text-gray-600">กำลังโหลดข้อมูล...</span>
//         </div>
//       ) : error ? (
//         <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
//           <div className="flex">
//             <div className="flex-shrink-0">
//               <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
//               </svg>
//             </div>
//             <div className="ml-3">
//               <p className="text-sm text-red-700">{error}</p>
//             </div>
//           </div>
//         </div>
//       ) : (
//         <>
//           {/* pH Section */}
//           <div className="mb-8">
//             <div className="flex items-center mb-4">
//               <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
//               <h3 className="text-xl font-semibold text-gray-700">ค่า pH</h3>
//             </div>
            
//             {(displayMode === 'chart' || displayMode === 'both') && renderPHChart()}
            
//             {(displayMode === 'table' || displayMode === 'both') && (
//               <div className="mt-4">
//                 <h4 className="text-lg font-medium text-gray-700 mb-2">ตารางข้อมูล pH</h4>
//                 {renderPHTable()}
//               </div>
//             )}
            
//             <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
//               <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
//                 <div className="text-sm text-gray-500 mb-1">ค่า pH ที่เหมาะสม</div>
//                 <div className="text-lg font-medium text-blue-600">{pHLimits.min} - {pHLimits.max}</div>
//               </div>
              
//               <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
//                 <div className="text-sm text-gray-500 mb-1">ค่า pH ที่ควรระวัง</div>
//                 <div className="text-lg font-medium text-yellow-600">
//                   {pHLimits.dangerousLow} - {pHLimits.min} และ {pHLimits.max} - {pHLimits.dangerousHigh}
//                 </div>
//               </div>
              
//               <div className="bg-red-50 p-3 rounded-lg border border-red-100">
//                 <div className="text-sm text-gray-500 mb-1">ค่า pH ที่เป็นอันตราย</div>
//                 <div className="text-lg font-medium text-red-600">
//                   &lt; {pHLimits.dangerousLow} และ &gt; {pHLimits.dangerousHigh}
//                 </div>
//               </div>
//             </div>
//           </div>
          
//           {/* DO Section */}
//           <div className="mb-4">
//             <div className="flex items-center mb-4">
//               <div className="w-4 h-4 rounded-full bg-emerald-500 mr-2"></div>
//               <h3 className="text-xl font-semibold text-gray-700">ค่า DO (Dissolved Oxygen)</h3>
//             </div>
            
//             {(displayMode === 'chart' || displayMode === 'both') && renderDOChart()}
            
//             {(displayMode === 'table' || displayMode === 'both') && (
//               <div className="mt-4">
//                 <h4 className="text-lg font-medium text-gray-700 mb-2">ตารางข้อมูล DO</h4>
//                 {renderDOTable()}
//               </div>
//             )}
            
//             <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
//               <div className="bg-green-50 p-3 rounded-lg border border-green-100">
//                 <div className="text-sm text-gray-500 mb-1">ค่า DO ที่เหมาะสม</div>
//                 <div className="text-lg font-medium text-green-600">{doLimits.min} - {doLimits.max} mg/L</div>
//               </div>
              
//               <div className="bg-red-50 p-3 rounded-lg border border-red-100">
//                 <div className="text-sm text-gray-500 mb-1">ค่า DO ที่ต่ำเกินไป</div>
//                 <div className="text-lg font-medium text-red-600">&lt; {doLimits.min} mg/L</div>
//               </div>
              
//               <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
//                 <div className="text-sm text-gray-500 mb-1">ค่า DO ที่สูงเกินไป</div>
//                 <div className="text-lg font-medium text-yellow-600">&gt; {doLimits.max} mg/L</div>
//               </div>
//             </div>
//           </div>
//         </>
//       )}
//     </div>
//   );
// };

// export default DOPhCharts;


// import React, { useState, useEffect } from 'react';
// import { db } from '../../lib/firebase';
// import { collection, getDocs, query, where } from 'firebase/firestore';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Area, AreaChart, ComposedChart } from 'recharts';

// const DOPhCharts = () => {
//   const [pHData, setPHData] = useState([]);
//   const [doData, setDOData] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [debug, setDebug] = useState(null);
//   const [displayMode, setDisplayMode] = useState('chart'); // 'chart', 'table', or 'both'
//   const [chartType, setChartType] = useState('line'); // 'line', 'area', or 'composed'
//   const [showRefLines, setShowRefLines] = useState(true);
//   const [timeRange, setTimeRange] = useState('10'); // '10', '30', 'all'

//   // pH limits and their consequences
//   const pHLimits = {
//     min: 6.5,
//     max: 8.5,
//     dangerousLow: 5.0,
//     dangerousHigh: 9.0
//   };

//   // DO limits
//   const doLimits = {
//     min: 5.0,
//     max: 12.0
//   };

//   // ฟังก์ชันแปลง timestamp เป็นวันที่ที่อ่านได้
//   const formatTimestamp = (timestamp) => {
//     try {
//       if (!timestamp) return "Unknown";
      
//       let date;
//       if (timestamp instanceof Date) {
//         date = timestamp;
//       } else if (timestamp.seconds) {
//         // กรณีเป็น Firestore Timestamp
//         date = new Date(timestamp.seconds * 1000);
//       } else if (typeof timestamp === 'number') {
//         date = new Date(timestamp);
//       } else if (typeof timestamp === 'string') {
//         date = new Date(timestamp);
//       } else {
//         return String(timestamp).substring(0, 10);
//       }
      
//       return date.toLocaleDateString('en-GB', { 
//         weekday: 'short', 
//         year: 'numeric', 
//         month: 'short', 
//         day: 'numeric',
//         hour: '2-digit', 
//         minute: '2-digit'
//       });
//     } catch (e) {
//       console.error("Error formatting timestamp:", e);
//       return String(timestamp).substring(0, 10);
//     }
//   };

//   // ฟังก์ชันสำหรับแปลงจากค่า pH เป็นสถานะ
//   const getPHStatus = (value) => {
//     if (value < pHLimits.dangerousLow || value > pHLimits.dangerousHigh) {
//       return 'อันตราย';
//     } else if (value < pHLimits.min || value > pHLimits.max) {
//       return 'ควรระวัง';
//     } else {
//       return 'เหมาะสม';
//     }
//   };

//   // ฟังก์ชันสำหรับแปลงจากค่า DO เป็นสถานะ
//   const getDOStatus = (value) => {
//     if (value < doLimits.min) {
//       return 'ออกซิเจนต่ำ';
//     } else if (value > doLimits.max) {
//       return 'ออกซิเจนสูง';
//     } else {
//       return 'เหมาะสม';
//     }
//   };

//   // Custom tooltip for better display
//   const CustomTooltip = ({ active, payload, label, sensorType }) => {
//     if (active && payload && payload.length) {
//       const value = payload[0].value;
//       let status, statusColor;
      
//       if (sensorType === 'pH') {
//         status = getPHStatus(value);
//         if (status === 'อันตราย') {
//           statusColor = 'text-red-600 font-bold';
//         } else if (status === 'ควรระวัง') {
//           statusColor = 'text-yellow-600 font-bold';
//         } else {
//           statusColor = 'text-green-600 font-bold';
//         }
//       } else { // DO
//         status = getDOStatus(value);
//         if (status === 'ออกซิเจนต่ำ') {
//           statusColor = 'text-red-600 font-bold';
//         } else if (status === 'ออกซิเจนสูง') {
//           statusColor = 'text-yellow-600 font-bold';
//         } else {
//           statusColor = 'text-green-600 font-bold';
//         }
//       }
      
//       return (
//         <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
//           <p className="text-gray-600">{label}</p>
//           <p className="font-medium">
//             {sensorType === 'pH' ? 'pH Level: ' : 'DO Level: '}
//             <span className="text-blue-600">{value.toFixed(2)}</span>
//             {sensorType === 'DO' && ' mg/L'}
//           </p>
//           <p className="mt-1">
//             สถานะ: <span className={statusColor}>{status}</span>
//           </p>
//         </div>
//       );
//     }
//     return null;
//   };

//   // ดึงข้อมูลจาก Firestore
//   useEffect(() => {
//     async function fetchData() {
//       try {
//         setIsLoading(true);
//         const datalogRef = collection(db, "datalog");
        
//         // ดึงข้อมูลทั้งหมดสำหรับกราฟ pH
//         const pHSnapshot = await getDocs(datalogRef);
        
//         // ดึงข้อมูลเฉพาะ sensor_id "2" สำหรับกราฟ DO
//         const doQuery = query(datalogRef, where("sensor_id", "==", "2"));
//         const doSnapshot = await getDocs(doQuery);
        
//         // เก็บข้อมูลดิบไว้เพื่อ debug
//         const rawPHData = [];
//         const rawDOData = [];
        
//         // แปลงข้อมูล pH
//         pHSnapshot.forEach((doc) => {
//           const data = doc.data();
//           rawPHData.push({ id: doc.id, ...data });
//         });
        
//         // แปลงข้อมูล DO
//         doSnapshot.forEach((doc) => {
//           const data = doc.data();
//           rawDOData.push({ id: doc.id, ...data });
//         });
        
//         // บันทึกข้อมูลดิบไว้เพื่อตรวจสอบ
//         setDebug({ pHData: rawPHData, doData: rawDOData });
        
//         // จัดรูปแบบข้อมูล pH
//         const formattedPHData = rawPHData.map((item) => {
//           const value = parseFloat(item.value || item.pH || item.ph || item.PH || 0);
//           const status = getPHStatus(value);
//           return {
//             name: formatTimestamp(item.timestamp),
//             value: value,
//             status: status,
//             // ค่าสำหรับทำ area chart
//             safeZoneMin: pHLimits.min,
//             safeZoneMax: pHLimits.max,
//             // เก็บ timestamp ดิบไว้เพื่อการเรียงลำดับ
//             rawTimestamp: item.timestamp instanceof Date ? item.timestamp.getTime() : 
//                           item.timestamp?.seconds ? item.timestamp.seconds * 1000 : 
//                           typeof item.timestamp === 'number' ? item.timestamp : 
//                           new Date(item.timestamp || 0).getTime()
//           };
//         });
        
//         // จัดรูปแบบข้อมูล DO
//         const formattedDOData = rawDOData.map((item) => {
//           const value = parseFloat(item.value || item.DO || item.do || 0);
//           const status = getDOStatus(value);
//           return {
//             name: formatTimestamp(item.timestamp),
//             value: value,
//             status: status,
//             // ค่าสำหรับทำ area chart
//             safeZoneMin: doLimits.min,
//             safeZoneMax: doLimits.max,
//             // เก็บ timestamp ดิบไว้เพื่อการเรียงลำดับ
//             rawTimestamp: item.timestamp instanceof Date ? item.timestamp.getTime() : 
//                           item.timestamp?.seconds ? item.timestamp.seconds * 1000 : 
//                           typeof item.timestamp === 'number' ? item.timestamp : 
//                           new Date(item.timestamp || 0).getTime()
//           };
//         });

//         // จัดเรียงข้อมูลตามเวลา
//         formattedPHData.sort((a, b) => a.rawTimestamp - b.rawTimestamp);
//         formattedDOData.sort((a, b) => a.rawTimestamp - b.rawTimestamp);

//         // ตาม timeRange ที่เลือก
//         const limitPHData = () => {
//           if (timeRange === 'all') return formattedPHData;
//           const limit = parseInt(timeRange);
//           return formattedPHData.length > limit ? formattedPHData.slice(-limit) : formattedPHData;
//         };

//         const limitDOData = () => {
//           if (timeRange === 'all') return formattedDOData;
//           const limit = parseInt(timeRange);
//           return formattedDOData.length > limit ? formattedDOData.slice(-limit) : formattedDOData;
//         };

//         setPHData(limitPHData());
//         setDOData(limitDOData());
//       } catch (err) {
//         console.error("Error fetching data:", err);
//         setError("ไม่สามารถโหลดข้อมูลได้: " + err.message);
//       } finally {
//         setIsLoading(false);
//       }
//     }

//     fetchData();
//   }, [timeRange]);

//   // คำนวณ domain ของ YAxis สำหรับกราฟ DO
//   const calculateDODomain = () => {
//     if (doData.length === 0) return [0, 15]; // typical DO range
    
//     // หาค่า min/max จากข้อมูล
//     const values = doData.map(item => item.value);
//     const dataMin = Math.min(...values);
//     const dataMax = Math.max(...values);
    
//     // สร้าง domain ให้มีช่องว่างมากกว่าข้อมูลเล็กน้อย
//     return [
//       Math.max(0, Math.min(dataMin - 2, doLimits.min - 1)),
//       Math.max(dataMax + 2, doLimits.max + 1)
//     ];
//   };

//   // DO domain
//   const doDomain = calculateDODomain();

//   // สีสำหรับกราฟ
//   const chartColors = {
//     ph: {
//       line: '#3B82F6', // blue-500
//       area: 'rgba(59, 130, 246, 0.2)', // transparent blue
//       safeZone: 'rgba(16, 185, 129, 0.1)', // transparent green
//     },
//     do: {
//       line: '#10B981', // emerald-500
//       area: 'rgba(16, 185, 129, 0.2)', // transparent emerald
//       safeZone: 'rgba(245, 158, 11, 0.1)', // transparent amber
//     }
//   };

//   // สร้าง Chart ตามประเภทที่เลือก
//   const renderPHChart = () => {
//     if (pHData.length === 0) {
//       return <div className="text-center py-10 bg-gray-50 rounded-lg">ไม่พบข้อมูล pH</div>;
//     }

//     if (chartType === 'line') {
//       return (
//         <ResponsiveContainer width="100%" height={300}>
//           <LineChart 
//             data={pHData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={[0, 14]} 
//               ticks={[0, 2, 4, 6, 8, 10, 12, 14]} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="pH" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 <ReferenceLine y={pHLimits.min} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${pHLimits.min}`, position: 'left', fill: '#10B981', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.max} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${pHLimits.max}`, position: 'left', fill: '#10B981', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.dangerousLow} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Danger: ${pHLimits.dangerousLow}`, position: 'left', fill: '#EF4444', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.dangerousHigh} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Danger: ${pHLimits.dangerousHigh}`, position: 'left', fill: '#EF4444', fontSize: 12 }} />
//               </>
//             )}
            
//             <Line
//               name="pH Level"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.ph.line}
//               strokeWidth={3}
//               dot={{ r: 5, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </LineChart>
//         </ResponsiveContainer>
//       );
//     } else if (chartType === 'area') {
//       return (
//         <ResponsiveContainer width="100%" height={300}>
//           <AreaChart 
//             data={pHData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <defs>
//               <linearGradient id="colorPH" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="5%" stopColor={chartColors.ph.line} stopOpacity={0.8}/>
//                 <stop offset="95%" stopColor={chartColors.ph.line} stopOpacity={0.1}/>
//               </linearGradient>
//               <linearGradient id="safeZonePH" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="0%" stopColor="#10B981" stopOpacity={0.2}/>
//                 <stop offset="100%" stopColor="#10B981" stopOpacity={0.1}/>
//               </linearGradient>
//             </defs>
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={[0, 14]} 
//               ticks={[0, 2, 4, 6, 8, 10, 12, 14]} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="pH" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 <ReferenceLine y={pHLimits.min} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${pHLimits.min}`, position: 'left', fill: '#10B981', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.max} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${pHLimits.max}`, position: 'left', fill: '#10B981', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.dangerousLow} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Danger: ${pHLimits.dangerousLow}`, position: 'left', fill: '#EF4444', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.dangerousHigh} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Danger: ${pHLimits.dangerousHigh}`, position: 'left', fill: '#EF4444', fontSize: 12 }} />
//               </>
//             )}
            
//             <Area
//               name="Safe pH Zone"
//               type="monotone"
//               dataKey="safeZoneMax"
//               stroke="none"
//               fillOpacity={1}
//               fill="url(#safeZonePH)"
//               legendType="none"
//             />
            
//             <Area
//               name="pH Level"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.ph.line}
//               strokeWidth={3}
//               fillOpacity={1}
//               fill="url(#colorPH)"
//               dot={{ r: 5, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </AreaChart>
//         </ResponsiveContainer>
//       );
//     } else { // composed
//       return (
//         <ResponsiveContainer width="100%" height={300}>
//           <ComposedChart 
//             data={pHData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <defs>
//               <linearGradient id="colorPH" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="5%" stopColor={chartColors.ph.line} stopOpacity={0.8}/>
//                 <stop offset="95%" stopColor={chartColors.ph.line} stopOpacity={0.1}/>
//               </linearGradient>
//             </defs>
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={[0, 14]} 
//               ticks={[0, 2, 4, 6, 8, 10, 12, 14]} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="pH" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 <ReferenceLine y={pHLimits.min} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${pHLimits.min}`, position: 'left', fill: '#10B981', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.max} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${pHLimits.max}`, position: 'left', fill: '#10B981', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.dangerousLow} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Danger: ${pHLimits.dangerousLow}`, position: 'left', fill: '#EF4444', fontSize: 12 }} />
//                 <ReferenceLine y={pHLimits.dangerousHigh} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Danger: ${pHLimits.dangerousHigh}`, position: 'left', fill: '#EF4444', fontSize: 12 }} />
//               </>
//             )}
            
//             <Area
//               name="pH Level Area"
//               type="monotone"
//               dataKey="value"
//               fill="url(#colorPH)"
//               fillOpacity={0.4}
//               stroke="none"
//               legendType="none"
//             />
            
//             <Line
//               name="pH Level"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.ph.line}
//               strokeWidth={3}
//               dot={{ r: 5, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.ph.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </ComposedChart>
//         </ResponsiveContainer>
//       );
//     }
//   };

//   const renderDOChart = () => {
//     if (doData.length === 0) {
//       return <div className="text-center py-10 bg-gray-50 rounded-lg">ไม่พบข้อมูล DO จาก Sensor ID 2</div>;
//     }

//     if (chartType === 'line') {
//       return (
//         <ResponsiveContainer width="100%" height={300}>
//           <LineChart 
//             data={doData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={doDomain} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="DO" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 <ReferenceLine y={doLimits.min} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${doLimits.min} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//                 <ReferenceLine y={doLimits.max} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${doLimits.max} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//               </>
//             )}
            
//             <Line
//               name="DO Level (mg/L)"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.do.line}
//               strokeWidth={3}
//               dot={{ r: 5, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </LineChart>
//         </ResponsiveContainer>
//       );
//     } else if (chartType === 'area') {
//       return (
//         <ResponsiveContainer width="100%" height={300}>
//           <AreaChart 
//             data={doData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <defs>
//               <linearGradient id="colorDO" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="5%" stopColor={chartColors.do.line} stopOpacity={0.8}/>
//                 <stop offset="95%" stopColor={chartColors.do.line} stopOpacity={0.1}/>
//               </linearGradient>
//               <linearGradient id="safeZoneDO" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.2}/>
//                 <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.1}/>
//               </linearGradient>
//             </defs>
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={doDomain} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="DO" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 <ReferenceLine y={doLimits.min} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${doLimits.min} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//                 <ReferenceLine y={doLimits.max} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${doLimits.max} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//               </>
//             )}
            
//             <Area
//               name="Safe DO Zone"
//               type="monotone"
//               dataKey="safeZoneMax"
//               stroke="none"
//               fillOpacity={1}
//               fill="url(#safeZoneDO)"
//               legendType="none"
//             />
            
//             <Area
//               name="DO Level (mg/L)"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.do.line}
//               strokeWidth={3}
//               fillOpacity={1}
//               fill="url(#colorDO)"
//               dot={{ r: 5, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </AreaChart>
//         </ResponsiveContainer>
//       );
//     } else { // composed
//       return (
//         <ResponsiveContainer width="100%" height={300}>
//           <ComposedChart 
//             data={doData}
//             margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
//           >
//             <defs>
//               <linearGradient id="colorDO" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="5%" stopColor={chartColors.do.line} stopOpacity={0.8}/>
//                 <stop offset="95%" stopColor={chartColors.do.line} stopOpacity={0.1}/>
//               </linearGradient>
//             </defs>
//             <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//             <XAxis 
//               dataKey="name" 
//               tick={{ fill: '#6B7280', fontSize: 12 }} 
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <YAxis 
//               domain={doDomain} 
//               tick={{ fill: '#6B7280', fontSize: 12 }}
//               tickLine={{ stroke: '#9CA3AF' }}
//               axisLine={{ stroke: '#9CA3AF' }}
//             />
//             <Tooltip content={<CustomTooltip sensorType="DO" />} />
//             <Legend wrapperStyle={{ fontSize: '14px' }} />
            
//             {showRefLines && (
//               <>
//                 <ReferenceLine y={doLimits.min} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Min: ${doLimits.min} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//                 <ReferenceLine y={doLimits.max} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `Max: ${doLimits.max} mg/L`, position: 'left', fill: '#F59E0B', fontSize: 12 }} />
//               </>
//             )}
            
//             <Area
//               name="DO Level Area"
//               type="monotone"
//               dataKey="value"
//               fill="url(#colorDO)"
//               fillOpacity={0.4}
//               stroke="none"
//               legendType="none"
//             />
            
//             <Line
//               name="DO Level (mg/L)"
//               type="monotone"
//               dataKey="value"
//               stroke={chartColors.do.line}
//               strokeWidth={3}
//               dot={{ r: 5, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               activeDot={{ r: 7, fill: chartColors.do.line, stroke: '#FFFFFF', strokeWidth: 2 }}
//               connectNulls={true}
//               animationDuration={1000}
//             />
//           </ComposedChart>
//         </ResponsiveContainer>
//       );
//     }
//   };

//   // แสดงข้อมูลในรูปแบบตาราง
//   const renderTable = (data, type) => {
//     if (data.length === 0) {
//       return <div className="text-center py-5">ไม่พบข้อมูล</div>;
//     }

//     return (
//       <div className="overflow-x-auto">
//         <table className="min-w-full divide-y divide-gray-200">
//           <thead className="bg-gray-50">
//             <tr>
//               <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่และเวลา</th>
//               <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ค่า {type === 'pH' ? 'pH' : 'DO (mg/L)'}</th>
//               <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
//             </tr>
//           </thead>
//           <tbody className="bg-white divide-y divide-gray-200">
//             {data.map((item, index) => {
//               let statusClass = 'px-2 py-1 text-xs rounded-full ';
//               if (type === 'pH') {
//                 if (item.status === 'อันตราย') {
//                   statusClass += 'bg-red-100 text-red-800';
//                 } else if (item.status === 'ควรระวัง') {
//                   statusClass += 'bg-yellow-100 text-yellow-800';
//                 } else {
//                   statusClass += 'bg-green-100 text-green-800';
//                 }
//               } else { // DO
//                 if (item.status === 'ออกซิเจนต่ำ') {
//                   statusClass += 'bg-red-100 text-red-800';
//                 } else if (item.status === 'ออกซิเจนสูง') {
//                   statusClass += 'bg-yellow-100 text-yellow-800';
//                 } else {
//                   statusClass += 'bg-green-100 text-green-800';
//                 }
//               }

//               return (
//                 <tr key={index}>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.name}</td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.value.toFixed(2)}</td>
//                   <td className="px-6 py-4 whitespace-nowrap">
//                     <span className={statusClass}>{item.status}</span>
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>
//     );
//   };

//   return (
//     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//       <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
//         {/* Control Panel */}
//         <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b border-gray-200">
//           <div>
//             <label htmlFor="displayMode" className="block text-sm font-medium text-gray-700 mb-1">แสดงผลแบบ</label>
//             <select
//               id="displayMode"
//               className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
//               value={displayMode}
//               onChange={(e) => setDisplayMode(e.target.value)}
//             >
//               <option value="chart">กราฟ</option>
//               <option value="table">ตาราง</option>
//               <option value="both">ทั้งกราฟและตาราง</option>
//             </select>
//           </div>
          
//           {(displayMode === 'chart' || displayMode === 'both') && (
//             <>
//               <div>
//                 <label htmlFor="chartType" className="block text-sm font-medium text-gray-700 mb-1">รูปแบบกราฟ</label>
//                 <select
//                   id="chartType"
//                   className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
//                   value={chartType}
//                   onChange={(e) => setChartType(e.target.value)}
//                 >
//                   <option value="line">กราฟเส้น</option>
//                   <option value="area">กราฟพื้นที่</option>
//                   <option value="composed">กราฟรวม</option>
//                 </select>
//               </div>
              
//               <div>
//                 <label htmlFor="showRefLines" className="block text-sm font-medium text-gray-700 mb-1">เส้นอ้างอิงค่ามาตรฐาน</label>
//                 <select
//                   id="showRefLines"
//                   className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
//                   value={showRefLines ? 'true' : 'false'}
//                   onChange={(e) => setShowRefLines(e.target.value === 'true')}
//                 >
//                   <option value="true">แสดง</option>
//                   <option value="false">ไม่แสดง</option>
//                 </select>
//               </div>
//             </>
//           )}
          
//           <div>
//             <label htmlFor="timeRange" className="block text-sm font-medium text-gray-700 mb-1">ช่วงเวลา</label>
//             <select
//               id="timeRange"
//               className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
//               value={timeRange}
//               onChange={(e) => setTimeRange(e.target.value)}
//             >
//               <option value="10">10 รายการล่าสุด</option>
//               <option value="30">30 รายการล่าสุด</option>
//               <option value="all">ทั้งหมด</option>
//             </select>
//           </div>
//         </div>

//         {/* Loading, Error, and Data Display */}
//         {isLoading ? (
//           <div className="py-10 flex justify-center">
//             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
//           </div>
//         ) : error ? (
//           <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-4">
//             <h3 className="text-sm font-medium">เกิดข้อผิดพลาด</h3>
//             <p className="text-sm mt-1">{error}</p>
//           </div>
//         ) : (
//           <div className="space-y-8">
//             {/* pH Chart */}
//             <div>
//               <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">ข้อมูลระดับ pH</h3>
//               <p className="text-sm text-gray-500 mb-2">
//                 ค่ามาตรฐานความเป็นกรด-ด่าง (pH): {pHLimits.min} - {pHLimits.max} (ค่าที่ปลอดภัย) | 
//                 ต่ำกว่า {pHLimits.dangerousLow} หรือ สูงกว่า {pHLimits.dangerousHigh} (อันตราย)
//               </p>
              
//               {(displayMode === 'chart' || displayMode === 'both') && renderPHChart()}
              
//               {(displayMode === 'table' || displayMode === 'both') && (
//                 <div className={`${displayMode === 'both' ? 'mt-6' : ''}`}>
//                   <h4 className="text-md font-medium text-gray-700 mb-2">ตารางข้อมูล pH</h4>
//                   {renderTable(pHData, 'pH')}
//                 </div>
//               )}
//             </div>
            
//             {/* DO Chart */}
//             <div>
//               <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">ข้อมูลออกซิเจนละลาย (DO)</h3>
//               <p className="text-sm text-gray-500 mb-2">
//                 ค่ามาตรฐานออกซิเจนละลาย (DO): {doLimits.min} - {doLimits.max} mg/L
//               </p>
              
//               {(displayMode === 'chart' || displayMode === 'both') && renderDOChart()}
              
//               {(displayMode === 'table' || displayMode === 'both') && (
//                 <div className={`${displayMode === 'both' ? 'mt-6' : ''}`}>
//                   <h4 className="text-md font-medium text-gray-700 mb-2">ตารางข้อมูล DO</h4>
//                   {renderTable(doData, 'DO')}
//                 </div>
//               )}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default DOPhCharts;

/// main version 0.0.2

// import React, { useState, useEffect } from 'react';
// import { db } from '../../lib/firebase';
// import { collection, getDocs, query, where } from 'firebase/firestore';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// const DOPhCharts = () => {
//   const [pHData, setPHData] = useState([]);
//   const [doData, setDOData] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [debug, setDebug] = useState(null);

//   // ฟังก์ชันแปลง timestamp เป็นวันที่ที่อ่านได้
//   const formatTimestamp = (timestamp) => {
//     try {
//       if (!timestamp) return "Unknown";
      
//       let date;
//       if (timestamp instanceof Date) {
//         date = timestamp;
//       } else if (timestamp.seconds) {
//         // กรณีเป็น Firestore Timestamp
//         date = new Date(timestamp.seconds * 1000);
//       } else if (typeof timestamp === 'number') {
//         date = new Date(timestamp);
//       } else if (typeof timestamp === 'string') {
//         date = new Date(timestamp);
//       } else {
//         return String(timestamp).substring(0, 10);
//       }
      
//       return date.toLocaleDateString('en-GB', { 
//         weekday: 'short', 
//         year: 'numeric', 
//         month: 'short', 
//         day: 'numeric',
//         hour: '2-digit', 
//         minute: '2-digit'
//       });
//     } catch (e) {
//       console.error("Error formatting timestamp:", e);
//       return String(timestamp).substring(0, 10);
//     }
//   };

//   // ดึงข้อมูลจาก Firestore
//   useEffect(() => {
//     async function fetchData() {
//       try {
//         setIsLoading(true);
//         const datalogRef = collection(db, "datalog");
        
//         // ดึงข้อมูลทั้งหมดสำหรับกราฟ pH
//         const pHSnapshot = await getDocs(datalogRef);
        
//         // ดึงข้อมูลเฉพาะ sensor_id "2" สำหรับกราฟ DO
//         const doQuery = query(datalogRef, where("sensor_id", "==", "2"));
//         const doSnapshot = await getDocs(doQuery);
        
//         // เก็บข้อมูลดิบไว้เพื่อ debug
//         const rawPHData = [];
//         const rawDOData = [];
        
//         // แปลงข้อมูล pH
//         pHSnapshot.forEach((doc) => {
//           const data = doc.data();
//           rawPHData.push({ id: doc.id, ...data });
//         });
        
//         // แปลงข้อมูล DO
//         doSnapshot.forEach((doc) => {
//           const data = doc.data();
//           rawDOData.push({ id: doc.id, ...data });
//         });
        
//         // บันทึกข้อมูลดิบไว้เพื่อตรวจสอบ
//         setDebug({ pHData: rawPHData, doData: rawDOData });
        
//         // จัดรูปแบบข้อมูล pH
//         const formattedPHData = rawPHData.map((item) => {
//           return {
//             name: formatTimestamp(item.timestamp),
//             value: parseFloat(item.value || item.pH || item.ph || item.PH || 0),
//             // เก็บ timestamp ดิบไว้เพื่อการเรียงลำดับ
//             rawTimestamp: item.timestamp instanceof Date ? item.timestamp.getTime() : 
//                           item.timestamp?.seconds ? item.timestamp.seconds * 1000 : 
//                           typeof item.timestamp === 'number' ? item.timestamp : 
//                           new Date(item.timestamp || 0).getTime()
//           };
//         });
        
//         // จัดรูปแบบข้อมูล DO
//         const formattedDOData = rawDOData.map((item) => {
//           return {
//             name: formatTimestamp(item.timestamp),
//             value: parseFloat(item.value || item.DO || item.do || 0),
//             // เก็บ timestamp ดิบไว้เพื่อการเรียงลำดับ
//             rawTimestamp: item.timestamp instanceof Date ? item.timestamp.getTime() : 
//                           item.timestamp?.seconds ? item.timestamp.seconds * 1000 : 
//                           typeof item.timestamp === 'number' ? item.timestamp : 
//                           new Date(item.timestamp || 0).getTime()
//           };
//         });

//         // จัดเรียงข้อมูลตามเวลา
//         formattedPHData.sort((a, b) => a.rawTimestamp - b.rawTimestamp);
//         formattedDOData.sort((a, b) => a.rawTimestamp - b.rawTimestamp);

//         // จำกัดข้อมูลแค่ 10 รายการล่าสุด
//         const limitedPHData = formattedPHData.length > 10 ? formattedPHData.slice(-10) : formattedPHData;
//         const limitedDOData = formattedDOData.length > 10 ? formattedDOData.slice(-10) : formattedDOData;

//         setPHData(limitedPHData);
//         setDOData(limitedDOData);
//       } catch (err) {
//         console.error("Error fetching data:", err);
//         setError("ไม่สามารถโหลดข้อมูลได้: " + err.message);
//       } finally {
//         setIsLoading(false);
//       }
//     }

//     fetchData();
//   }, []);

//   return (
//     <div className="space-y-8">
//       {isLoading ? (
//         <div className="text-center py-10">กำลังโหลดข้อมูล...</div>
//       ) : error ? (
//         <div className="text-red-500 text-center py-10">{error}</div>
//       ) : (
//         <>
//           {/* กราฟ pH */}
//           <div>
//             <h3 className="text-lg font-medium mb-2">pH Chart</h3>
//             {pHData.length === 0 ? (
//               <div className="text-center py-10">ไม่พบข้อมูล pH</div>
//             ) : (
//               <ResponsiveContainer width="100%" height={300}>
//                 <LineChart data={pHData}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey="name" />
//                   <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
//                   <Tooltip />
//                   <Legend />
//                   <Line
//                     name="pH Level"
//                     type="monotone"
//                     dataKey="value"
//                     stroke="#2563EB"
//                     strokeWidth={2}
//                     dot={{ r: 4 }}
//                     activeDot={{ r: 6 }}
//                     connectNulls={true}
//                   />
//                 </LineChart>
//               </ResponsiveContainer>
//             )}
//           </div>

//           {/* กราฟ DO */}
//           <div>
//             <h3 className="text-lg font-medium mb-2">DO Chart (Sensor ID: 2)</h3>
//             {doData.length === 0 ? (
//               <div className="text-center py-10">ไม่พบข้อมูล DO จาก Sensor ID 2</div>
//             ) : (
//               <ResponsiveContainer width="100%" height={300}>
//                 <LineChart data={doData}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey="name" />
//                   <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
//                   <Tooltip />
//                   <Legend />
//                   <Line
//                     name="DO Level"
//                     type="monotone"
//                     dataKey="value"
//                     stroke="#10B981"
//                     strokeWidth={2}
//                     dot={{ r: 4 }}
//                     activeDot={{ r: 6 }}
//                     connectNulls={true}
//                   />
//                 </LineChart>
//               </ResponsiveContainer>
//             )}
//           </div>

//           {/* แสดงข้อมูลดิบเพื่อการ Debug */}
//           {debug && (
//             <div className="mt-8 p-4 bg-gray-100 rounded-lg">
//               <h3 className="text-lg font-medium mb-2">Debug Information</h3>
//               <p className="mb-2">จำนวนข้อมูล pH: {debug.pHData.length} รายการ</p>
//               <p className="mb-2">จำนวนข้อมูล DO (Sensor ID 2): {debug.doData.length} รายการ</p>
              
//               <details>
//                 <summary className="cursor-pointer text-blue-600">แสดงข้อมูล pH ดิบ (คลิกเพื่อดู)</summary>
//                 <pre className="mt-2 p-3 bg-gray-200 rounded text-xs overflow-auto max-h-60">
//                   {JSON.stringify(debug.pHData, null, 2)}
//                 </pre>
//               </details>
              
//               <details>
//                 <summary className="cursor-pointer text-blue-600 mt-3">แสดงข้อมูล DO ดิบ (คลิกเพื่อดู)</summary>
//                 <pre className="mt-2 p-3 bg-gray-200 rounded text-xs overflow-auto max-h-60">
//                   {JSON.stringify(debug.doData, null, 2)}
//                 </pre>
//               </details>
              
//               <details>
//                 <summary className="cursor-pointer text-blue-600 mt-3">แสดงข้อมูล pH ที่แปลงแล้ว</summary>
//                 <pre className="mt-2 p-3 bg-gray-200 rounded text-xs overflow-auto max-h-60">
//                   {JSON.stringify(pHData, null, 2)}
//                 </pre>
//               </details>
              
//               <details>
//                 <summary className="cursor-pointer text-blue-600 mt-3">แสดงข้อมูล DO ที่แปลงแล้ว</summary>
//                 <pre className="mt-2 p-3 bg-gray-200 rounded text-xs overflow-auto max-h-60">
//                   {JSON.stringify(doData, null, 2)}
//                 </pre>
//               </details>
//             </div>
//           )}
//         </>
//       )}
//     </div>
//   );
// };

// export default DOPhCharts;




/// Main chart Do, pH ver 0.0.1

// import React, { useState, useEffect } from 'react';
// import { db } from '../../lib/firebase'; // ใช้การตั้งค่า firebase ของคุณ
// import { collection, getDocs } from 'firebase/firestore';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// const DOPhCharts = () => {
//   const [chartData, setChartData] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null);

//   // ดึงข้อมูลจาก Firestore
//   useEffect(() => {
//     async function fetchData() {
//       try {
//         setIsLoading(true);
//         const querySnapshot = await getDocs(collection(db, "datalog"));
//         console.log("Firestore Data:", querySnapshot); // ดูข้อมูลที่ดึงมา

//         if (querySnapshot.empty) {
//           console.log("No documents found!");
//           setError("ไม่พบข้อมูลใน Firestore");
//           return;
//         }

//         const dataArray = [];
//         querySnapshot.forEach((doc) => {
//           console.log(doc.id, "=>", doc.data()); // ดูข้อมูลแต่ละเอกสาร
//           dataArray.push({ id: doc.id, ...doc.data() });
//         });

//         // จัดรูปแบบข้อมูลให้สามารถใช้ในกราฟ
//         const formattedData = dataArray.map((item) => {
//           const timestamp = item.timestamp;
//           let formattedTimestamp = "Unknown";

//           // ตรวจสอบว่า timestamp มีค่าหรือไม่
//           if (timestamp) {
//             // แปลง timestamp เป็นวันที่
//             const date = new Date(timestamp);  // แปลง timestamp เป็น Date
//             formattedTimestamp = date.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }); // แสดงวันที่เต็ม (เช่น Mon, 23 Apr 2024)
//           }

//           return {
//             name: formattedTimestamp, // วันที่ที่แสดงบนแกน x
//             value: item.value || 0,  // ตรวจสอบว่า item.value มีค่าหรือไม่
//           };
//         });

//         // จำกัดข้อมูลแค่ 10 รายการล่าสุด
//         const limitedData = formattedData.slice(0, 10);

//         setChartData(limitedData); // อัปเดตข้อมูลกราฟ
//       } catch (err) {
//         console.error("Error fetching data:", err);
//         setError("ไม่สามารถโหลดข้อมูลได้");
//       } finally {
//         setIsLoading(false);
//       }
//     }

//     fetchData();
//   }, []); // ทำงานครั้งเดียวเมื่อ component โหลด

//   return (
//     <div>
//       {/* แสดงกราฟหากมีข้อมูล */}
//       {isLoading ? (
//         <div>กำลังโหลดข้อมูล...</div>
//       ) : error ? (
//         <div className="text-red-500">{error}</div>
//       ) : (
//         <ResponsiveContainer width="100%" height={200}>
//           <LineChart data={chartData}>
//             <CartesianGrid strokeDasharray="3 3" />
//             <XAxis dataKey="name" />
//             <YAxis />
//             <Tooltip />
//             <Legend />
//             <Line
//               name="Sensor Data"
//               type="monotone"
//               dataKey="value"
//               stroke="#2563EB"
//               strokeWidth={2}
//               dot={{ r: 4 }}
//               activeDot={{ r: 6 }}
//               connectNulls={true}
//             />
//           </LineChart>
//         </ResponsiveContainer>
//       )}
//     </div>
//   );
// };

// export default DOPhCharts;







////////////// test
// import React, { useState, useEffect } from "react";
// import {
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
//   Legend,
//   Text,
// } from "recharts";
// import { 
//   getFirestore, 
//   doc, 
//   getDoc, 
//   collection, 
//   query, 
//   where, 
//   getDocs, 
//   orderBy, 
//   limit,
//   onSnapshot 
// } from "firebase/firestore";
// import { db } from "../../lib/firebase";

// export default function DOPhCharts() {
//   const [currentData, setCurrentData] = useState({
//     ph: 0,
//     do: 10.0,
//     status: "",
//     impact: ""
//   });
//   const [historyData, setHistoryData] = useState({
//     daily: { ph: [], do: [] },
//     monthly: { ph: [], do: [] }
//   });
//   const [range, setRange] = useState("daily");
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [currentDay, setCurrentDay] = useState("Today");

//   // ดึงข้อมูลและสร้าง listener สำหรับข้อมูลปัจจุบัน
//   useEffect(() => {
//     setIsLoading(true);
//     setError(null);
  
//     const today = new Date();
//     const todayStr = today.toISOString().split('T')[0];
//     const docRef = doc(db, "phlog", todayStr);
    
//     const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
//     setCurrentDay(dayNames[today.getDay()]);
    
//     const unsubscribe = onSnapshot(docRef, (docSnap) => {
//       try {
//         if (docSnap.exists()) {
//           const data = docSnap.data();
//           const pHReadings = data.pH_readings || [];
    
//           if (pHReadings.length > 0) {
//             const sortedReadings = pHReadings.sort((a, b) => {
//               return (b.timestamp || 0) - (a.timestamp || 0);
//             });
    
//             let phValue = parseFloat(sortedReadings[0].pH || 0);
//             if (phValue > 14) {
//               phValue = 14;
//             }
    
//             setCurrentData({
//               ph: phValue,
//               do: 10.0,
//               status: sortedReadings[0].status || "",
//               impact: sortedReadings[0].impact || ""
//             });
//           } else {
//             // ใช้ค่า pH จาก Firestore ถ้า pH_readings ว่าง
//             setCurrentData({
//               ph: parseFloat(data.pH) || 0, // ค่า pH = 11.18
//               do: 10.0,
//               status: data.status || "",
//               impact: data.impact || ""
//             });
//           }
//         } else {
//           console.log("ไม่พบข้อมูลของวันนี้");
//           setCurrentData(prevData => ({
//             ...prevData,
//             ph: 11.18, // ค่าเริ่มต้นถ้าไม่มีเอกสาร
//             status: "Bad (High)",
//             impact: "Alkaline: Fish at Risk"
//           }));
//         }
//       } catch (err) {
//         console.error("เกิดข้อผิดพลาดในการรับฟังข้อมูล:", err);
//         setError("ไม่สามารถโหลดข้อมูลได้ โปรดลองใหม่อีกครั้ง");
//       } finally {
//         setIsLoading(false);
//       }
//     });
    
//     return () => unsubscribe();
//   }, []);

//   // สร้าง listener สำหรับดึงข้อมูลย้อนหลังทั้งหมด
//   useEffect(() => {
//     const today = new Date();
//     const sevenDaysAgo = new Date();
//     sevenDaysAgo.setDate(today.getDate() - 7);
    
//     const phlogRef = collection(db, "phlog");
//     const phlogQuery = query(
//       phlogRef,
//       where("date", ">=", sevenDaysAgo.toISOString().split('T')[0]),
//       orderBy("date", "asc")
//     );
    
//     const unsubscribe = onSnapshot(phlogQuery, (snapshot) => {
//       try {
//         const dailyData = [];
        
//         snapshot.forEach((doc) => {
//           const data = doc.data();
//           const docDate = new Date(data.date);
          
//           // ถ้ามี pH_readings ให้ใช้ข้อมูลจาก pH_readings
//           if (data.pH_readings && data.pH_readings.length > 0) {
//             data.pH_readings.forEach(reading => {
//               if (reading.ph && reading.time) {
//                 const readingTime = new Date(`${data.date}T${reading.time}`);
//                 dailyData.push({
//                   id: doc.id,
//                   date: docDate,
//                   time: reading.time.slice(0, 5),
//                   timestamp: readingTime.getTime(),
//                   ph: Math.min(parseFloat(reading.ph), 14),
//                   do: 10.0
//                 });
//               }
//             });
//           } else if (data.pH && data.time) {
//             // ถ้าไม่มี pH_readings แต่มีค่า pH และ time ให้ใช้ค่า pH นั้น
//             const readingTime = new Date(`${data.date}T${data.time}`);
//             dailyData.push({
//               id: doc.id,
//               date: docDate,
//               time: data.time.slice(0, 5),
//               timestamp: readingTime.getTime(),
//               ph: Math.min(parseFloat(data.pH), 14), // ใช้ค่า pH = 11.09
//               do: 10.0
//             });
//           }
//         });
        
//         const dailyPhData = groupByTime(dailyData, 'ph');
//         const dailyDoData = groupByTime(dailyData, 'do');
        
//         const monthlyPhData = groupByMonth(dailyData, 'ph');
//         const monthlyDoData = groupByMonth(dailyData, 'do');
        
//         setHistoryData({
//           daily: { 
//             ph: dailyPhData,
//             do: dailyDoData
//           },
//           monthly: { 
//             ph: monthlyPhData, 
//             do: monthlyDoData
//           }
//         });
//       } catch (err) {
//         console.error("เกิดข้อผิดพลาดในการรับฟังข้อมูลประวัติ:", err);
//         setError("ไม่สามารถรับฟังการเปลี่ยนแปลงข้อมูลประวัติ: " + err.message);
//       }
//     });
    
//     return () => unsubscribe();
//   }, []);

//   const groupByTime = (data, valueField) => {
//     // สร้างอาร์เรย์เวลาทั้งหมดตั้งแต่ 6:00 ถึง 5:00 ของวันถัดไป
//     const allTimeSlots = [];
    
//     // เวลา 6:00 ถึง 23:00
//     for (let i = 6; i <= 23; i++) {
//       allTimeSlots.push({
//         hour: i,
//         timeKey: `${i}:00`,
//         day: currentDay
//       });
//     }
    
//     // เวลา 0:00 ถึง 5:00 ของวันถัดไป
//     const nextDay = new Date();
//     nextDay.setDate(nextDay.getDate() + 1);
//     const nextDayName = nextDay.toLocaleDateString('en-US', { weekday: 'long' });
    
//     for (let i = 0; i <= 5; i++) {
//       allTimeSlots.push({
//         hour: i,
//         timeKey: `${i}:00`,
//         day: nextDayName
//       });
//     }
    
//     // ตรวจสอบเวลาปัจจุบัน
//     const currentTime = new Date();
//     const currentHour = currentTime.getHours();
//     const currentMinute = currentTime.getMinutes();
    
//     // กรองเอาเฉพาะช่วงเวลาที่ผ่านมาแล้ว หรือกำลังอยู่ในช่วงเวลาปัจจุบัน
//     const validTimeSlots = allTimeSlots.filter(slot => {
//       if (slot.day !== currentDay) return false; // ตัดข้อมูลของวันถัดไปออก
      
//       if (slot.hour < currentHour) return true;
//       if (slot.hour === currentHour) return true; // รวมชั่วโมงปัจจุบัน
//       return false;
//     });
    
//     // จัดเรียงข้อมูลตามเวลา
//     validTimeSlots.sort((a, b) => a.hour - b.hour);
    
//     // ถ้าไม่มีข้อมูลหรือวันนี้ยังไม่ถึง 6 โมงเช้า จะแสดงข้อมูลเริ่มต้นอย่างน้อย 1 จุด
//     if (validTimeSlots.length === 0) {
//       validTimeSlots.push({
//         hour: Math.max(6, currentHour),
//         timeKey: `${Math.max(6, currentHour)}:00`,
//         day: currentDay
//       });
//     }
    
//     // ถ้าไม่มีข้อมูลใน data หรือ data ว่างเปล่า
//     if (!data || data.length === 0) {
//       const baseValue = currentData[valueField]; // ใช้ค่า pH จาก Firestore (เช่น 11.34)
      
//       return validTimeSlots.map(slot => {
//         let value = baseValue;
//         if (valueField === 'ph') {
//           value = Math.max(0, Math.min(14, value)); // จำกัดค่า pH ระหว่าง 0-14
//         } else {
//           value = Math.max(0, value); // จำกัดค่า DO ไม่ให้ต่ำกว่า 0
//         }
        
//         return {
//           name: slot.timeKey,
//           value: parseFloat(value.toFixed(2)),
//           day: slot.day
//         };
//       });
//     }
    
//     // กรณีมีข้อมูลจริง
//     const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
//     const timeGroups = {};
    
//     // จัดกลุ่มข้อมูลตามช่วงเวลา
//     sortedData.forEach(item => {
//       const date = new Date(item.timestamp);
//       const hour = date.getHours();
      
//       // พิจารณาเฉพาะข้อมูลในช่วงเวลาที่ผ่านมาแล้ว
//       const timeKey = `${hour}:00`;
//       const day = date.toLocaleDateString('en-US', { weekday: 'long' });
      
//       if (!timeGroups[timeKey]) {
//         timeGroups[timeKey] = {
//           values: [],
//           sum: 0,
//           count: 0,
//           day
//         };
//       }
      
//       if (item[valueField] !== undefined && item[valueField] !== null) {
//         timeGroups[timeKey].values.push(item[valueField]);
//         timeGroups[timeKey].sum += item[valueField];
//         timeGroups[timeKey].count++;
//       }
//     });
    
//     // สร้างข้อมูลสำหรับแสดงผล
//     const result = validTimeSlots.map(slot => {
//       const timeKey = slot.timeKey;
      
//       if (timeGroups[timeKey] && timeGroups[timeKey].count > 0) {
//         return {
//           name: timeKey,
//           value: timeGroups[timeKey].sum / timeGroups[timeKey].count,
//           day: timeGroups[timeKey].day
//         };
//       } else {
//         // ถ้าไม่มีข้อมูลในช่วงเวลานี้ ใช้ค่า pH จาก Firestore
//         const baseValue = currentData[valueField];
//         let value = baseValue;
        
//         if (valueField === 'ph') {
//           value = Math.max(0, Math.min(14, value));
//         } else {
//           value = Math.max(0, value);
//         }
        
//         return {
//           name: timeKey,
//           value: parseFloat(value.toFixed(2)),
//           day: slot.day
//         };
//       }
//     });
    
//     return result;
//   };
  

//   // ฟังก์ชันจัดกลุ่มข้อมูลตามเดือน
//   const groupByMonth = (data, valueField) => {
//     const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
//     const result = {};
  
//     // Initialize empty containers for all months
//     months.forEach(month => {
//       result[month] = { values: [], sum: 0, count: 0 };
//     });
  
//     // Add actual data for months that have it
//     data.forEach(item => {
//       const monthName = months[item.date.getMonth()];
//       if (item[valueField] !== undefined && item[valueField] !== null) {
//         result[monthName].values.push(item[valueField]);
//         result[monthName].sum += item[valueField];
//         result[monthName].count++;
//       }
//     });
  
//     // Return only months that have data
//     return months.map(month => {
//       if (result[month].count === 0) {
//         // Return null for months without data
//         return {
//           name: month,
//           value: null
//         };
//       } else {
//         return {
//           name: month,
//           value: result[month].sum / result[month].count
//         };
//       }
//     });
//   };

//   const handleChange = (e) => setRange(e.target.value);

//   // ฟังก์ชันสำหรับแสดง tooltip ค่าบนกราฟ
//   const CustomTooltip = ({ active, payload, label }) => {
//     if (active && payload && payload.length) {
//       return (
//         <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
//           <p className="font-semibold">{label}</p>
//           <p className="text-blue-600">Value: {payload[0].value ? payload[0].value.toFixed(2) : 'No data'}</p>
//           {payload[0].payload.day && <p className="text-gray-600">Day: {payload[0].payload.day}</p>}
//         </div>
//       );
//     }
//     return null;
//   };

//   // คอมโพเนนต์สำหรับแสดงค่าบนกราฟ - แก้ไขให้รองรับค่า null
//   const CustomizedLabel = (props) => {
//     const { x, y, value } = props;
//     if (value === null || value === undefined) return null;
    
//     return (
//       <text x={x} y={y - 15} fill="#000" textAnchor="middle" fontSize={12}>
//         {value.toFixed(1)}
//       </text>
//     );
//   };

//   // ตรวจสอบว่ามีข้อมูลประวัติหรือไม่
//   const hasHistoryData = (dataType) => {
//     return historyData[range][dataType] && historyData[range][dataType].length > 0;
//   };

//   // เลือกข้อมูลสำหรับแสดงผล - แก้ไขให้ใช้ค่าปัจจุบันเป็น default
//   const getChartData = (dataType) => {
//     if (range === 'daily') {
//       if (hasHistoryData(dataType)) {
//         // ตรวจสอบว่าข้อมูลมีค่าที่มากกว่า 0 หรือไม่
//         const hasValidValues = historyData[range][dataType].some(item => 
//           item.value !== undefined && item.value !== null && item.value > 0
//         );
        
//         if (hasValidValues) {
//           return historyData[range][dataType];
//         }
//       }
      
//       // ถ้าไม่มีข้อมูลที่ถูกต้อง ให้สร้างข้อมูลสุ่มโดยใช้ค่าปัจจุบันเป็นฐาน
//       // สร้างช่วงเวลาทุกชั่วโมงตั้งแต่ 6:00 ถึง 5:00 ของวันถัดไป
//       const timePoints = [];
//       for (let i = 6; i <= 23; i++) {
//         timePoints.push(`${i}:00`);
//       }
//       for (let i = 0; i <= 5; i++) {
//         timePoints.push(`${i}:00`);
//       }
      
//       // คำนวณค่าฐานสำหรับการสุ่ม
//       const baseValue = currentData[dataType];
//       const nextDay = new Date();
//       nextDay.setDate(nextDay.getDate() + 1);
//       const nextDayName = nextDay.toLocaleDateString('en-US', { weekday: 'long' });
      
//       return timePoints.map((time, index) => {
//         // สุ่มค่าที่แตกต่างกันเล็กน้อยในแต่ละช่วงเวลา
//         // สุ่มค่าในช่วง ±0.8 สำหรับ pH (หรือ ±1.5 สำหรับ DO)
//         const variation = dataType === 'ph' ? 0.8 : 1.5;
//         const randomOffset = (Math.random() - 0.5) * variation;
        
//         // ปรับค่าให้อยู่ในช่วงที่เหมาะสม
//         let value = baseValue + randomOffset;
        
//         // จำกัดค่า pH ไม่ให้ต่ำกว่า 0 หรือสูงเกิน 14
//         if (dataType === 'ph') {
//           value = Math.max(0, Math.min(14, value));
//         } else {
//           // จำกัดค่า DO ไม่ให้ต่ำกว่า 0
//           value = Math.max(0, value);
//         }
        
//         // กำหนดวัน โดยชั่วโมง 0-5 เป็นวันถัดไป
//         const hour = parseInt(time.split(':')[0]);
//         const day = (hour >= 0 && hour <= 5) ? nextDayName : currentDay;
        
//         return {
//           name: time,
//           value: parseFloat(value.toFixed(2)),
//           day: day
//         };
//       });
//     } else {
//       // ส่วนของ monthly view ไม่มีการเปลี่ยนแปลง
//       if (hasHistoryData(dataType)) {
//         return historyData[range][dataType];
//       }
      
//       // ถ้าไม่มีข้อมูล ให้สร้างข้อมูลสุ่ม
//       const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
//       const baseValue = currentData[dataType];
      
//       return months.map(month => {
//         const variation = dataType === 'ph' ? 1 : 2;
//         const randomOffset = (Math.random() - 0.5) * variation;
        
//         let value = baseValue + randomOffset;
//         if (dataType === 'ph') {
//           value = Math.max(0, Math.min(14, value));
//         } else {
//           value = Math.max(0, value);
//         }
        
//         return {
//           name: month,
//           value: parseFloat(value.toFixed(2))
//         };
//       });
//     }
//   };

//   // ฟังก์ชันประเมินสถานะและผลกระทบตามค่า pH
//   const evaluatePhStatus = (phValue) => {
//     if (phValue < 6.0) {
//       return {
//         status: "Bad (Low)",
//         impact: "Acidic water - harmful to fish",
//         color: "text-red-500"
//       };
//     } else if (phValue > 8.5) {
//       return {
//         status: "Bad (High)",
//         impact: "Alkaline water - harmful to fish",
//         color: "text-red-500"
//       };
//     } else if (phValue >= 6.5 && phValue <= 7.5) {
//       return {
//         status: "Good",
//         impact: "Ideal for most aquatic life",
//         color: "text-green-500"
//       };
//     } else {
//       return {
//         status: "Fair",
//         impact: "Acceptable for most species",
//         color: "text-yellow-500"
//       };
//     }
//   };

//   // ฟังก์ชันประเมินสถานะและผลกระทบตามค่า DO
//   const evaluateDoStatus = (doValue) => {
//     if (doValue < 3.0) {
//       return {
//         status: "Critical",
//         impact: "Fish kills likely",
//         color: "text-red-600"
//       };
//     } else if (doValue < 5.0) {
//       return {
//         status: "Poor",
//         impact: "Stressful for most aquatic life",
//         color: "text-red-500"
//       };
//     } else if (doValue >= 8.0) {
//       return {
//         status: "Excellent",
//         impact: "Optimal for aquatic life",
//         color: "text-green-600"
//       };
//     } else if (doValue >= 5.0) {
//       return {
//         status: "Adequate",
//         impact: "Suitable for most species",
//         color: "text-green-500"
//       };
//     }
//   };

//   // กำหนดขอบเขตของแกน Y สำหรับกราฟ pH
//   const getPhYDomain = () => {
//     if (currentData.ph > 14) {
//       return [0, Math.ceil(currentData.ph)];
//     }
//     return [0, 14]; // pH scale typically 0-14
//   };

//   const phStatus = evaluatePhStatus(currentData.ph);
//   const doStatus = evaluateDoStatus(currentData.do);

//   return (
//     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
//       {/* DO Chart */}
//       <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition">
//         <div className="flex justify-between items-center mb-4">
//           <h2 className="text-lg font-semibold text-gray-800">
//             DO Value ({range === 'daily' ? 'by hour' : 'monthly'})
//           </h2>
//           <select
//             value={range}
//             onChange={handleChange}
//             className="text-sm border border-gray-300 bg-white rounded-lg px-3 py-1.5 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
//           >
//             <option value="daily">By Hour</option>
//             <option value="monthly">Monthly</option>
//           </select>
//         </div>
        
//         {isLoading ? (
//           <div className="flex justify-center items-center h-52">
//             <div className="text-gray-500">กำลังโหลดข้อมูล...</div>
//           </div>
//         ) : error ? (
//           <div className="flex justify-center items-center h-52">
//             <div className="text-red-500">{error}</div>
//           </div>
//         ) : (
//           <ResponsiveContainer width="100%" height={200}>
//             <LineChart data={getChartData('do')}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey="name" />
//               <YAxis domain={[0, 'auto']} />
//               <Tooltip content={<CustomTooltip />} />
//               <Legend />
//               {range === 'daily' && (
//                 <text 
//                   x="95%" 
//                   y="5%" 
//                   textAnchor="end" 
//                   fill="#333" 
//                   fontSize={14} 
//                   fontWeight="bold"
//                 >
//                   {currentDay}
//                 </text>
//               )}
//               <Line
//                 name="DO (mg/L)"
//                 type="monotone"
//                 dataKey="value"
//                 stroke="#2563EB"
//                 strokeWidth={2}
//                 dot={{ r: 4, fill: "#2563EB" }}
//                 activeDot={{ r: 6 }}
//                 label={<CustomizedLabel />}
//                 connectNulls={true}
//               />
//             </LineChart>
//           </ResponsiveContainer>
//         )}
        
//         {!isLoading && !error && (
//           <div className="mt-3 text-sm">
//             <div className="flex justify-between">
//               <span className="text-blue-600">Current DO: <span className="font-semibold">{currentData.do.toFixed(2)} mg/L</span></span>
//               <span className={doStatus?.color || "text-gray-500"}>{doStatus?.status}</span>
//             </div>
//             <div className="mt-1 text-gray-600">
//               <span>Impact: <span className="font-medium">{doStatus?.impact}</span></span>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* pH Chart */}
//       <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition">
//         <div className="flex justify-between items-center mb-4">
//           <h2 className="text-lg font-semibold text-gray-800">
//             pH Value ({range === 'daily' ? 'by hour' : 'monthly'})
//           </h2>
//         </div>
        
//         {isLoading ? (
//           <div className="flex justify-center items-center h-52">
//             <div className="text-gray-500">กำลังโหลดข้อมูล...</div>
//           </div>
//         ) : error ? (
//           <div className="flex justify-center items-center h-52">
//             <div className="text-red-500">{error}</div>
//           </div>
//         ) : (
//           <ResponsiveContainer width="100%" height={200}>
//             <LineChart data={getChartData('ph')}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey="name" />
//               <YAxis domain={[0, 14]} />
//               <Tooltip content={<CustomTooltip />} />
//               <Legend />
//               {range === 'daily' && (
//                 <text 
//                   x="95%" 
//                   y="5%" 
//                   textAnchor="end" 
//                   fill="#333" 
//                   fontSize={14} 
//                   fontWeight="bold"
//                 >
//                   {currentDay}
//                 </text>
//               )}
//               <Line
//                 name="pH Value"
//                 type="monotone"
//                 dataKey="value"
//                 stroke="#10B981"
//                 strokeWidth={2}
//                 dot={{ r: 4, fill: "#10B981" }}
//                 activeDot={{ r: 6 }}
//                 label={<CustomizedLabel />}
//                 connectNulls={true}
//               />
//             </LineChart>
//           </ResponsiveContainer>
//         )}
        
//         {!isLoading && !error && (
//           <div className="mt-3 text-sm">
//             <div className="flex justify-between">
//               <span className="text-blue-600">Current pH: <span className="font-semibold">{currentData.ph.toFixed(2)}</span></span>
//               <span className={phStatus?.color || "text-red-500"}>{currentData.status || phStatus?.status}</span>
//             </div>
//             <div className="mt-1 text-blue-600">
//               <span>Impact: <span className="font-medium">{currentData.impact || phStatus?.impact}</span></span>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }


//////////////////////////////


// Version Firebase V.0.0.2 connect with Documents in Firestore

// import React, { useState, useEffect } from "react";
// import {
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
//   Legend,
// } from "recharts";
// import { 
//   getFirestore, 
//   doc, 
//   getDoc, 
//   collection, 
//   query, 
//   where, 
//   getDocs, 
//   orderBy, 
//   limit,
//   onSnapshot 
// } from "firebase/firestore";
// import { db } from "../../lib/firebase";

// export default function DOPhCharts() {
//   const [currentData, setCurrentData] = useState({
//     ph: 0,
//     do: 10.0,
//     status: "",
//     impact: ""
//   });
//   const [historyData, setHistoryData] = useState({
//     daily: { ph: [], do: [] },
//     monthly: { ph: [], do: [] }
//   });
//   const [range, setRange] = useState("daily");
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null);

//   // ดึงข้อมูลและสร้าง listener สำหรับข้อมูลปัจจุบัน
//   useEffect(() => {
//     setIsLoading(true);
//     setError(null);

//     const today = new Date().toISOString().split('T')[0]; // Get today's date as "YYYY-MM-DD"
//     const docRef = doc(db, "phlog", today);
    
//     // สร้าง real-time listener สำหรับเอกสารวันนี้
//     const unsubscribe = onSnapshot(docRef, (docSnap) => {
//       try {
//         if (docSnap.exists()) {
//           const data = docSnap.data();
//           const pHReadings = data.pH_readings || [];
          
//           // ถ้ามีข้อมูล pH ให้ใช้ค่าล่าสุด
//           if (pHReadings.length > 0) {
//             // เรียงลำดับตามเวลาล่าสุด (ถ้ามี timestamp)
//             const sortedReadings = pHReadings.sort((a, b) => {
//               return (b.timestamp || 0) - (a.timestamp || 0);
//             });
            
//             let phValue = parseFloat(sortedReadings[0].pH || 0);
//             if (phValue > 14) {
//               phValue = 14; // หาก pH เกิน 14 จะลดลงให้เหลือ 14
//             }

//             setCurrentData({
//               ph: phValue,
//               do: 10.0,  // ใช้ค่า DO สมมุติ
//               status: sortedReadings[0].status || "",
//               impact: sortedReadings[0].impact || ""
//             });
//           }
//         } else {
//           console.log("ไม่พบข้อมูลของวันนี้");
//         }
        
//         // ดึงข้อมูลย้อนหลังทุกครั้งที่ข้อมูลปัจจุบันเปลี่ยน
//         fetchHistoricalData();
        
//       } catch (err) {
//         console.error("เกิดข้อผิดพลาดในการรับฟังข้อมูล:", err);
//         setError("ไม่สามารถโหลดข้อมูลได้ โปรดลองใหม่อีกครั้ง");
//       } finally {
//         setIsLoading(false);
//       }
//     }, (error) => {
//       console.error("เกิดข้อผิดพลาดในการรับฟังข้อมูล:", error);
//       setError("ไม่สามารถรับฟังการเปลี่ยนแปลงข้อมูล: " + error.message);
//       setIsLoading(false);
//     });

//     // ยกเลิก listener เมื่อคอมโพเนนต์ถูกถอดออก
//     return () => unsubscribe();
//   }, []);

//   // สร้าง listener สำหรับดึงข้อมูลย้อนหลังทั้งหมด
//   useEffect(() => {
//     // สร้าง listener สำหรับเอกสารทั้งหมดในคอลเลกชัน phlog
//     const today = new Date();
//     const sevenDaysAgo = new Date();
//     sevenDaysAgo.setDate(today.getDate() - 7);
    
//     const phlogRef = collection(db, "phlog");
//     const phlogQuery = query(
//       phlogRef,
//       where("date", ">=", sevenDaysAgo.toISOString().split('T')[0]),
//       orderBy("date", "asc")
//     );
    
//     const unsubscribe = onSnapshot(phlogQuery, (snapshot) => {
//       try {
//         const dailyData = [];
        
//         snapshot.forEach((doc) => {
//           const data = doc.data();
//           if (data.pH_readings && data.pH_readings.length > 0) {
//             // ใช้ค่าเฉลี่ยของวันนั้นถ้ามีหลายค่า
//             const avgPh = data.pH_readings.reduce((sum, reading) => {
//               return sum + parseFloat(reading.pH || 0);
//             }, 0) / data.pH_readings.length;
            
//             dailyData.push({
//               id: doc.id,
//               date: new Date(data.date),
//               ph: Math.min(avgPh, 14), // จำกัดค่า pH ไม่เกิน 14
//               do: 10.0 // ใช้ค่า DO สมมุติ
//             });
//           }
//         });
        
//         // จัดกลุ่มข้อมูลสำหรับกราฟ
//         const dailyPhData = groupByDay(dailyData, 'ph');
//         const dailyDoData = groupByDay(dailyData, 'do');
        
//         // จัดกลุ่มข้อมูลรายเดือน
//         const monthlyPhData = groupByMonth(dailyData, 'ph');
//         const monthlyDoData = groupByMonth(dailyData, 'do');
        
//         // อัพเดทข้อมูลประวัติ
//         setHistoryData({
//           daily: { 
//             ph: dailyPhData,
//             do: dailyDoData
//           },
//           monthly: { 
//             ph: monthlyPhData, 
//             do: monthlyDoData
//           }
//         });
//       } catch (err) {
//         console.error("เกิดข้อผิดพลาดในการรับฟังข้อมูลประวัติ:", err);
//         setError("ไม่สามารถรับฟังการเปลี่ยนแปลงข้อมูลประวัติ: " + err.message);
//       }
//     });
    
//     return () => unsubscribe();
//   }, []);

//   // ฟังก์ชันดึงข้อมูลย้อนหลังสำหรับกราฟ
//   const fetchHistoricalData = async () => {
//     try {
//       // กำหนดวันที่ปัจจุบันและย้อนหลัง 7 วัน และ 30 วัน
//       const today = new Date();
      
//       // สำหรับข้อมูลรายวัน (7 วันย้อนหลัง)
//       const sevenDaysAgo = new Date();
//       sevenDaysAgo.setDate(today.getDate() - 7);
      
//       // สำหรับข้อมูลรายเดือน (6 เดือนย้อนหลัง)
//       const sixMonthsAgo = new Date();
//       sixMonthsAgo.setMonth(today.getMonth() - 6);

//       // ดึงข้อมูล 7 วันย้อนหลัง
//       const dailyRef = collection(db, "phlog");
//       const dailyQuery = query(
//         dailyRef,
//         where("date", ">=", sevenDaysAgo.toISOString().split('T')[0]),
//         where("date", "<=", today.toISOString().split('T')[0]),
//         orderBy("date", "asc")
//       );

//       const dailySnapshot = await getDocs(dailyQuery);
//       const dailyData = [];
      
//       dailySnapshot.forEach((doc) => {
//         const data = doc.data();
//         if (data.pH_readings && data.pH_readings.length > 0) {
//           // ใช้ค่าเฉลี่ยของวันนั้นถ้ามีหลายค่า
//           const avgPh = data.pH_readings.reduce((sum, reading) => {
//             return sum + parseFloat(reading.pH || 0);
//           }, 0) / data.pH_readings.length;
          
//           dailyData.push({
//             id: doc.id,
//             date: new Date(data.date),
//             ph: Math.min(avgPh, 14), // จำกัดค่า pH ไม่เกิน 14
//             do: 10.0 // ใช้ค่า DO สมมุติ
//           });
//         }
//       });

//       // จัดกลุ่มข้อมูลสำหรับกราฟ
//       const dailyPhData = groupByDay(dailyData, 'ph');
//       const dailyDoData = groupByDay(dailyData, 'do');
      
//       // ดึงข้อมูลรายเดือน (ใช้ข้อมูลที่มีอยู่และจัดกลุ่มเป็นรายเดือน)
//       const monthlyRef = collection(db, "phlog");
//       const monthlyQuery = query(
//         monthlyRef,
//         where("date", ">=", sixMonthsAgo.toISOString().split('T')[0]),
//         where("date", "<=", today.toISOString().split('T')[0]),
//         orderBy("date", "asc")
//       );
      
//       const monthlySnapshot = await getDocs(monthlyQuery);
//       const monthlyData = [];
      
//       monthlySnapshot.forEach((doc) => {
//         const data = doc.data();
//         if (data.pH_readings && data.pH_readings.length > 0) {
//           // ใช้ค่าเฉลี่ยของวันนั้นถ้ามีหลายค่า
//           const avgPh = data.pH_readings.reduce((sum, reading) => {
//             return sum + parseFloat(reading.pH || 0);
//           }, 0) / data.pH_readings.length;
          
//           monthlyData.push({
//             id: doc.id,
//             date: new Date(data.date),
//             ph: Math.min(avgPh, 14), // จำกัดค่า pH ไม่เกิน 14
//             do: 10.0 // ใช้ค่า DO สมมุติ
//           });
//         }
//       });
      
//       const monthlyPhData = groupByMonth(monthlyData, 'ph');
//       const monthlyDoData = groupByMonth(monthlyData, 'do');
      
//       // อัพเดทข้อมูลประวัติ
//       setHistoryData({
//         daily: { 
//           ph: dailyPhData,
//           do: dailyDoData
//         },
//         monthly: { 
//           ph: monthlyPhData, 
//           do: monthlyDoData
//         }
//       });
      
//     } catch (err) {
//       console.error("เกิดข้อผิดพลาดในการดึงข้อมูลประวัติ:", err);
//       throw err;
//     }
//   };

//   // ฟังก์ชันจัดกลุ่มข้อมูลตามวัน - แก้ไขให้แสดงทุกวันโดยมีค่า default
//   const groupByDay = (data, valueField) => {
//     const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
//     const today = new Date();
//     const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
//     const result = {};
    
//     // สร้าง object ว่างสำหรับทุกวัน
//     dayOrder.forEach(day => {
//       result[day] = { values: [], sum: 0, count: 0 };
//     });

//     // เพิ่มข้อมูลจริงเข้าไปในวันที่มีข้อมูล
//     data.forEach(item => {
//       const dayName = days[item.date.getDay()];
//       if (item[valueField] !== undefined && item[valueField] !== null) {
//         result[dayName].values.push(item[valueField]);
//         result[dayName].sum += item[valueField];
//         result[dayName].count++;
//       }
//     });
    
//     // ใช้ค่าปัจจุบันสำหรับวันนี้ ถ้าไม่มีข้อมูลในฐานข้อมูล
//     const todayDayName = days[today.getDay()];
//     if (result[todayDayName].count === 0 && valueField === 'ph') {
//       result[todayDayName].values.push(currentData.ph);
//       result[todayDayName].sum = currentData.ph;
//       result[todayDayName].count = 1;
//     } else if (result[todayDayName].count === 0 && valueField === 'do') {
//       result[todayDayName].values.push(currentData.do);
//       result[todayDayName].sum = currentData.do;
//       result[todayDayName].count = 1;
//     }
    
//     // แปลงเป็นรูปแบบข้อมูลสำหรับกราฟ - ต้องการทุกวันแม้ไม่มีข้อมูล
//     return dayOrder.map(day => {
//       const hasData = result[day].count > 0;
//       return {
//         name: day,
//         value: hasData ? result[day].sum / result[day].count : null
//       };
//     });
//   };

//   // ฟังก์ชันจัดกลุ่มข้อมูลตามเดือน - แก้ไขให้แสดงทุกเดือนโดยมีค่า default
//   const groupByMonth = (data, valueField) => {
//     const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
//     const today = new Date();
//     const result = {};
    
//     // สร้าง object ว่างสำหรับทุกเดือน
//     months.forEach(month => {
//       result[month] = { values: [], sum: 0, count: 0 };
//     });

//     // เพิ่มข้อมูลจริงเข้าไปในเดือนที่มีข้อมูล
//     data.forEach(item => {
//       const monthName = months[item.date.getMonth()];
//       if (item[valueField] !== undefined && item[valueField] !== null) {
//         result[monthName].values.push(item[valueField]);
//         result[monthName].sum += item[valueField];
//         result[monthName].count++;
//       }
//     });
    
//     // ใช้ค่าปัจจุบันสำหรับเดือนนี้ ถ้าไม่มีข้อมูลในฐานข้อมูล
//     const currentMonthName = months[today.getMonth()];
//     if (result[currentMonthName].count === 0 && valueField === 'ph') {
//       result[currentMonthName].values.push(currentData.ph);
//       result[currentMonthName].sum = currentData.ph;
//       result[currentMonthName].count = 1;
//     } else if (result[currentMonthName].count === 0 && valueField === 'do') {
//       result[currentMonthName].values.push(currentData.do);
//       result[currentMonthName].sum = currentData.do;
//       result[currentMonthName].count = 1;
//     }
    
//     // แปลงเป็นรูปแบบข้อมูลสำหรับกราฟ - สำหรับเดือนที่มีข้อมูลเท่านั้น
//     return months.map(month => {
//       const hasData = result[month].count > 0;
//       return {
//         name: month,
//         value: hasData ? result[month].sum / result[month].count : null
//       };
//     });
//   };

//   const handleChange = (e) => setRange(e.target.value);

//   // ฟังก์ชันสำหรับแสดง tooltip ค่าบนกราฟ
//   const CustomTooltip = ({ active, payload, label }) => {
//     if (active && payload && payload.length) {
//       return (
//         <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
//           <p className="font-semibold">{label}</p>
//           <p className="text-blue-600">Value: {payload[0].value ? payload[0].value.toFixed(2) : 'No data'}</p>
//         </div>
//       );
//     }
//     return null;
//   };

//   // คอมโพเนนต์สำหรับแสดงค่าบนกราฟ - แก้ไขให้รองรับค่า null
//   const CustomizedLabel = (props) => {
//     const { x, y, value } = props;
//     if (value === null) return null;
    
//     return (
//       <text x={x} y={y - 15} fill="#000" textAnchor="middle" fontSize={12}>
//         {value.toFixed(1)}
//       </text>
//     );
//   };

//   // ตรวจสอบว่ามีข้อมูลประวัติหรือไม่
//   const hasHistoryData = (dataType) => {
//     return historyData[range][dataType] && historyData[range][dataType].length > 0;
//   };

//   // แปลงข้อมูลปัจจุบันเป็นข้อมูลที่ใช้ในกราฟ
//   const getCurrentData = (dataType) => {
//     const today = new Date();
//     const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
//     const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
//     if (range === 'daily') {
//       const dayName = days[today.getDay()];
//       return [{ name: dayName, value: currentData[dataType] }];
//     } else {
//       const monthName = months[today.getMonth()];
//       return [{ name: monthName, value: currentData[dataType] }];
//     }
//   };

//   // เลือกข้อมูลสำหรับแสดงผล 
//   const getChartData = (dataType) => {
//     if (hasHistoryData(dataType)) {
//       return historyData[range][dataType];
//     } else if (currentData[dataType]) {
//       return getCurrentData(dataType);
//     } else {
//       return [];
//     }
//   };

//   // ฟังก์ชันประเมินสถานะและผลกระทบตามค่า pH
//   const evaluatePhStatus = (phValue) => {
//     if (phValue < 6.0) {
//       return {
//         status: "Bad (Low)",
//         impact: "Acidic water - harmful to fish",
//         color: "text-red-500"
//       };
//     } else if (phValue > 8.5) {
//       return {
//         status: "Bad (High)",
//         impact: "Alkaline water - harmful to fish",
//         color: "text-red-500"
//       };
//     } else if (phValue >= 6.5 && phValue <= 7.5) {
//       return {
//         status: "Good",
//         impact: "Ideal for most aquatic life",
//         color: "text-green-500"
//       };
//     } else {
//       return {
//         status: "Fair",
//         impact: "Acceptable for most species",
//         color: "text-yellow-500"
//       };
//     }
//   };

//   // ฟังก์ชันประเมินสถานะและผลกระทบตามค่า DO
//   const evaluateDoStatus = (doValue) => {
//     if (doValue < 3.0) {
//       return {
//         status: "Critical",
//         impact: "Fish kills likely",
//         color: "text-red-600"
//       };
//     } else if (doValue < 5.0) {
//       return {
//         status: "Poor",
//         impact: "Stressful for most aquatic life",
//         color: "text-red-500"
//       };
//     } else if (doValue >= 8.0) {
//       return {
//         status: "Excellent",
//         impact: "Optimal for aquatic life",
//         color: "text-green-600"
//       };
//     } else if (doValue >= 5.0) {
//       return {
//         status: "Adequate",
//         impact: "Suitable for most species",
//         color: "text-green-500"
//       };
//     }
//   };

//   // กำหนดขอบเขตของแกน Y สำหรับกราฟ pH
//   const getPhYDomain = () => {
//     if (currentData.ph > 14) {
//       return [0, Math.ceil(currentData.ph)];
//     }
//     return [0, 14]; // pH scale typically 0-14
//   };

//   const phStatus = evaluatePhStatus(currentData.ph);
//   const doStatus = evaluateDoStatus(currentData.do);

//   return (
//     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
//       {/* DO Chart */}
//       <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition">
//         <div className="flex justify-between items-center mb-4">
//           <h2 className="text-lg font-semibold text-gray-800">
//             DO Value ({range})
//           </h2>
//           <select
//             value={range}
//             onChange={handleChange}
//             className="text-sm border border-gray-300 bg-white rounded-lg px-3 py-1.5 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
//           >
//             <option value="daily">Daily</option>
//             <option value="monthly">Monthly</option>
//           </select>
//         </div>
        
//         {isLoading ? (
//           <div className="flex justify-center items-center h-52">
//             <div className="text-gray-500">กำลังโหลดข้อมูล...</div>
//           </div>
//         ) : error ? (
//           <div className="flex justify-center items-center h-52">
//             <div className="text-red-500">{error}</div>
//           </div>
//         ) : (
//           <ResponsiveContainer width="100%" height={200}>
//             <LineChart data={getChartData('do')}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey="name" />
//               <YAxis domain={[0, 'auto']} />
//               <Tooltip content={<CustomTooltip />} />
//               <Legend />
//               <Line
//                 name="DO (mg/L)"
//                 type="monotone"
//                 dataKey="value"
//                 stroke="#2563EB"
//                 strokeWidth={2}
//                 dot={{ r: 4, fill: "#2563EB" }}
//                 activeDot={{ r: 6 }}
//                 label={<CustomizedLabel />}
//                 connectNulls={true} // เชื่อมต่อจุดที่มีค่าข้ามจุดที่เป็น null
//               />
//             </LineChart>
//           </ResponsiveContainer>
//         )}
        
//         {!isLoading && !error && (
//           <div className="mt-3 text-sm">
//             <div className="flex justify-between">
//               <span className="text-blue-600">Current DO: <span className="font-semibold">{currentData.do.toFixed(2)} mg/L</span></span>
//               <span className={doStatus?.color || "text-gray-500"}>{doStatus?.status}</span>
//             </div>
//             <div className="mt-1 text-gray-600">
//               <span>Impact: <span className="font-medium">{doStatus?.impact}</span></span>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* pH Chart */}
//       <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition">
//         <div className="flex justify-between items-center mb-4">
//           <h2 className="text-lg font-semibold text-gray-800">
//             pH Value ({range})
//           </h2>
//         </div>
        
//         {isLoading ? (
//           <div className="flex justify-center items-center h-52">
//             <div className="text-gray-500">กำลังโหลดข้อมูล...</div>
//           </div>
//         ) : error ? (
//           <div className="flex justify-center items-center h-52">
//             <div className="text-red-500">{error}</div>
//           </div>
//         ) : (
//           <ResponsiveContainer width="100%" height={200}>
//             <LineChart data={getChartData('ph')}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey="name" />
//               <YAxis domain={getPhYDomain()} />
//               <Tooltip content={<CustomTooltip />} />
//               <Legend />
//               <Line
//                 name="pH Value"
//                 type="monotone"
//                 dataKey="value"
//                 stroke="#10B981"
//                 strokeWidth={2}
//                 dot={{ r: 4, fill: "#10B981" }}
//                 activeDot={{ r: 6 }}
//                 label={<CustomizedLabel />}
//                 connectNulls={true} // เชื่อมต่อจุดที่มีค่าข้ามจุดที่เป็น null
//               />
//             </LineChart>
//           </ResponsiveContainer>
//         )}
        
//         {!isLoading && !error && (
//           <div className="mt-3 text-sm">
//             <div className="flex justify-between">
//               <span className="text-blue-600">Current pH: <span className="font-semibold">{currentData.ph.toFixed(2)}</span></span>
//               <span className={phStatus?.color || "text-red-500"}>{currentData.status || phStatus?.status}</span>
//             </div>
//             <div className="mt-1 text-blue-600">
//               <span>Impact: <span className="font-medium">{currentData.impact || phStatus?.impact}</span></span>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
////////////////////////////////////////////////////////////////////


// // // Version Firebase

// import React, { useState, useEffect } from "react";
// import {
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
// } from "recharts";
// import { ref, onValue } from "firebase/database";
// import { db } from "../../lib/firebase"; 

// export default function DOPhCharts() {
//   const [currentData, setCurrentData] = useState({
//     ph: 0,
//     do: 0,
//     status: "",
//     impact: ""
//   });
//   const [historyData, setHistoryData] = useState({
//     daily: { ph: [], do: [] },
//     monthly: { ph: [], do: [] }
//   });
//   const [range, setRange] = useState("daily");
//   const [isLoading, setIsLoading] = useState(true);

//   // ดึงข้อมูลปัจจุบันและประวัติจาก Firebase
//   useEffect(() => {
//     setIsLoading(true);
    
//     // ดึงข้อมูลปัจจุบัน
//     const currentDataRef = ref(db, "/sensor/data");
//     onValue(currentDataRef, (snapshot) => {
//       const data = snapshot.val();
//       if (data) {
//         // Validate pH value - pH should be between 0-14
//         let phValue = parseFloat(data.pH || 0);
//         if (phValue > 14) {
//           phValue = phValue / 10; // Simple fix if the value is too high (might need adjustment)
//           // If still out of range, cap it at 14
//           if (phValue > 14) phValue = 14;
//         }
        
//         setCurrentData({
//           ph: phValue,
//           do: parseFloat(data.do || 0),
//           status: data.status || "",
//           impact: data.impact || ""
//         });
//       }
//     });

//     // ดึงข้อมูลประวัติ
//     const historyRef = ref(db, "/sensor/history");
//     onValue(historyRef, (snapshot) => {
//       const data = snapshot.val();
//       if (!data) {
//         setIsLoading(false);
//         return;
//       }

//       // แปลงข้อมูลเป็น array และเพิ่ม timestamp
//       const history = Object.entries(data).map(([key, entry]) => {
//         // Validate pH value for history data too
//         let phValue = parseFloat(entry.pH || 0);
//         if (phValue > 14) {
//           phValue = phValue / 10; // Simple fix if the value is too high
//           if (phValue > 14) phValue = 14;
//         }
        
//         return {
//           id: key,
//           timestamp: entry.timestamp || Date.now(),
//           ph: phValue,
//           do: parseFloat(entry.do || 0),
//           date: new Date(entry.timestamp || Date.now())
//         };
//       });

//       // เรียงข้อมูลตาม timestamp
//       history.sort((a, b) => a.timestamp - b.timestamp);
      
//       // แยกข้อมูลตามวันและเดือน
//       const dailyPhData = groupByDay(history, 'ph');
//       const dailyDoData = groupByDay(history, 'do');
//       const monthlyPhData = groupByMonth(history, 'ph');
//       const monthlyDoData = groupByMonth(history, 'do');

//       setHistoryData({
//         daily: { 
//           ph: dailyPhData,
//           do: dailyDoData
//         },
//         monthly: { 
//           ph: monthlyPhData,
//           do: monthlyDoData
//         }
//       });
      
//       setIsLoading(false);
//     });
//   }, []);

//   // จัดกลุ่มข้อมูลตามวัน
//   const groupByDay = (data, valueField) => {
//     const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
//     const result = {};
    
//     // สร้าง object สำหรับแต่ละวัน
//     days.forEach(day => {
//       result[day] = { values: [], sum: 0, count: 0 };
//     });
    
//     // เพิ่มข้อมูลเข้าไปตามวัน
//     data.forEach(item => {
//       const dayName = days[item.date.getDay()];
//       if (item[valueField]) {
//         result[dayName].values.push(item[valueField]);
//         result[dayName].sum += item[valueField];
//         result[dayName].count++;
//       }
//     });
    
//     // คำนวณค่าเฉลี่ย
//     return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
//       name: day,
//       value: result[day].count > 0 ? result[day].sum / result[day].count : null
//     })).filter(item => item.value !== null);
//   };

//   // จัดกลุ่มข้อมูลตามเดือน
//   const groupByMonth = (data, valueField) => {
//     const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
//     const result = {};
    
//     // สร้าง object สำหรับแต่ละเดือน
//     months.forEach(month => {
//       result[month] = { values: [], sum: 0, count: 0 };
//     });
    
//     // เพิ่มข้อมูลเข้าไปตามเดือน
//     data.forEach(item => {
//       const monthName = months[item.date.getMonth()];
//       if (item[valueField]) {
//         result[monthName].values.push(item[valueField]);
//         result[monthName].sum += item[valueField];
//         result[monthName].count++;
//       }
//     });
    
//     // คำนวณค่าเฉลี่ย
//     return months.map(month => ({
//       name: month,
//       value: result[month].count > 0 ? result[month].sum / result[month].count : null
//     })).filter(item => item.value !== null);
//   };

//   const handleChange = (e) => setRange(e.target.value);

//   // ฟังก์ชันสำหรับแสดง tooltip ค่าบนกราฟ
//   const CustomTooltip = ({ active, payload, label }) => {
//     if (active && payload && payload.length) {
//       return (
//         <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
//           <p className="font-semibold">{label}</p>
//           <p className="text-blue-600">Value: {payload[0].value.toFixed(2)}</p>
//         </div>
//       );
//     }
//     return null;
//   };

//   // คอมโพเนนต์สำหรับแสดงค่าบนกราฟ
//   const CustomizedLabel = (props) => {
//     const { x, y, value } = props;
//     return (
//       <text x={x} y={y - 15} fill="#000" textAnchor="middle" fontSize={12}>
//         {value.toFixed(1)}
//       </text>
//     );
//   };

//   // ตรวจสอบว่ามีข้อมูลประวัติหรือไม่
//   const hasHistoryData = (dataType) => {
//     return historyData[range][dataType] && historyData[range][dataType].length > 0;
//   };
  
//   // แปลงข้อมูลปัจจุบันเป็นข้อมูลที่ใช้ในกราฟ
//   const getCurrentData = (dataType) => {
//     // ให้แสดงค่าปัจจุบันแทนที่จะใช้ข้อมูลตัวอย่าง
//     const today = new Date();
//     const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
//     const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
//     if (range === 'daily') {
//       const dayName = days[today.getDay()];
//       return [{ name: dayName, value: currentData[dataType] }];
//     } else {
//       const monthName = months[today.getMonth()];
//       return [{ name: monthName, value: currentData[dataType] }];
//     }
//   };
  
//   // เลือกข้อมูลสำหรับแสดงผล 
//   const getChartData = (dataType) => {
//     if (hasHistoryData(dataType)) {
//       return historyData[range][dataType];
//     } else if (currentData[dataType]) {
//       // ถ้าไม่มีข้อมูลประวัติ แต่มีข้อมูลปัจจุบัน
//       return getCurrentData(dataType);
//     } else {
//       // ค่าว่างสำหรับกรณีไม่มีข้อมูล
//       return [];
//     }
//   };

//   // กำหนดขอบเขตของแกน Y สำหรับกราฟ pH
//   const getPhYDomain = () => {
//     if (currentData.ph > 14) {
//       return [0, Math.ceil(currentData.ph)];
//     }
//     return [0, 14]; // pH scale typically 0-14
//   };

//   return (
//     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
//       {/* DO Chart */}
//       <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition">
//         <div className="flex justify-between items-center mb-4">
//           <h2 className="text-lg font-semibold text-gray-800">
//             DO Value ({range})
//           </h2>
//           <select
//             value={range}
//             onChange={handleChange}
//             className="text-sm border border-gray-300 bg-white rounded-lg px-3 py-1.5 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
//           >
//             <option value="daily">Daily</option>
//             <option value="monthly">Monthly</option>
//           </select>
//         </div>
        
//         {isLoading ? (
//           <div className="flex justify-center items-center h-52">
//             <div className="text-gray-500">กำลังโหลดข้อมูล...</div>
//           </div>
//         ) : (
//           <ResponsiveContainer width="100%" height={200}>
//             <LineChart data={getChartData('do')}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey="name" />
//               <YAxis domain={[0, 'auto']} />
//               <Tooltip content={<CustomTooltip />} />
//               <Line
//                 name="DO"
//                 type="monotone"
//                 dataKey="value"
//                 stroke="#2563EB"
//                 strokeWidth={2}
//                 dot={{ r: 4, fill: "#2563EB" }}
//                 activeDot={{ r: 6 }}
//                 label={<CustomizedLabel />}
//               />
//             </LineChart>
//           </ResponsiveContainer>
//         )}
        
//         {!isLoading && (
//           <div className="mt-3 text-sm text-gray-600">
//             <div className="flex justify-between">
//               <span>Current DO: <span className="font-semibold">{currentData.do.toFixed(2)}</span></span>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* pH Chart */}
//       <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition">
//         <div className="flex justify-between items-center mb-4">
//           <h2 className="text-lg font-semibold text-gray-800">
//             pH Value ({range})
//           </h2>
//         </div>
        
//         {isLoading ? (
//           <div className="flex justify-center items-center h-52">
//             <div className="text-gray-500">กำลังโหลดข้อมูล...</div>
//           </div>
//         ) : (
//           <ResponsiveContainer width="100%" height={200}>
//             <LineChart data={getChartData('ph')}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey="name" />
//               <YAxis domain={getPhYDomain()} />
//               <Tooltip content={<CustomTooltip />} />
//               <Line
//                 name="pH"
//                 type="monotone"
//                 dataKey="value"
//                 stroke="#10B981"
//                 strokeWidth={2}
//                 dot={{ r: 4, fill: "#10B981" }}
//                 activeDot={{ r: 6 }}
//                 label={<CustomizedLabel />}
//               />
//             </LineChart>
//           </ResponsiveContainer>
//         )}
        
//         {!isLoading && (
//           <div className="mt-3 text-sm">
//             <div className="flex justify-between">
//               <span className="text-blue-600">Current pH: <span className="font-semibold">{currentData.ph.toFixed(2)}</span></span>
//               <span className="text-red-500 font-medium">{currentData.status}</span>
//             </div>
//             <div className="mt-1 text-blue-600">
//               <span>Impact: <span className="font-medium">{currentData.impact}</span></span>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// // //////////////////////////////////////////////////////////////////

// import React, { useState, useEffect } from "react";
// import {
//   LineChart,
//   Line,
//   XAxis,
//   CartesianGrid,
//   ResponsiveContainer,
// } from "recharts";
// import { ref, onValue } from "firebase/database";
// import { db } from "../../lib/firebase"; 


// const chartData = {
//   daily: {
//     do: [
//       { name: "Mon", value: 6.9 },
//       { name: "Tue", value: 7.1 },
//       { name: "Wed", value: 6.8 },
//       { name: "Thu", value: 7.0 },
//       { name: "Fri", value: 7.2 },
//       { name: "Sat", value: 7.1 },
//       { name: "Sun", value: 7.3 },
//     ],
//     ph: [
//       { name: "Mon", value: 6.2 },
//       { name: "Tue", value: 6.4 },
//       { name: "Wed", value: 6.3 },
//       { name: "Thu", value: 6.5 },
//       { name: "Fri", value: 6.3 },
//       { name: "Sat", value: 6.2 },
//       { name: "Sun", value: 6.4 },
//     ],
//   },
//   monthly: {
//     do: [
//       { name: "Jan", value: 7.0 },
//       { name: "Feb", value: 6.8 },
//       { name: "Mar", value: 6.9 },
//       { name: "Apr", value: 7.1 },
//       { name: "May", value: 7.3 },
//     ],
//     ph: [
//       { name: "Jan", value: 6.3 },
//       { name: "Feb", value: 6.2 },
//       { name: "Mar", value: 6.4 },
//       { name: "Apr", value: 6.5 },
//       { name: "May", value: 6.3 },
//     ],
//   },
// };


// export default function DOPhCharts() {
//   const [phData, setPhData] = useState([]); // State to store pH data
//   const [range, setRange] = useState("daily");

//   // Fetch Ph data from Firebase
//   useEffect(() => {
//     const sensorRef = ref(db, "/sensor/history");
//     onValue(sensorRef, (snapshot) => {
//       const data = snapshot.val();
//       if (!data) return;

//       const history = Object.values(data);
//       const formattedPh = history.map((entry, index) => ({
//         name: `#${index + 1}`,
//         value: parseFloat(entry.pH || 0),
//       }));

//       setPhData(formattedPh);
//     });
//   }, []);


//   const handleChange = (e) => setRange(e.target.value);

//   return (
//     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
//       {/* DO Chart */}
//       <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition">
//         <div className="flex justify-between items-center mb-4">
//           <h2 className="text-lg font-semibold text-gray-800">
//             DO Value ({range})
//           </h2>
//           <select
//             value={range}
//             onChange={handleChange}
//             className="text-sm border border-gray-300 bg-white rounded-lg px-3 py-1.5 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
//           >
//             <option value="daily">Daily</option>
//             <option value="monthly">Monthly</option>
//           </select>
//         </div>
//         <ResponsiveContainer width="100%" height={200}>
//           <LineChart data={chartData[range].do}>
//             <CartesianGrid strokeDasharray="3 3" />
//             <XAxis dataKey="name" />
//             <Line
//               type="monotone"
//               dataKey="value"
//               stroke="#2563EB"
//               strokeWidth={3}
//               dot={{ r: 4 }}
//               activeDot={{ r: 6 }}
//             />
//           </LineChart>
//         </ResponsiveContainer>
//       </div>

//       {/* Ph Chart */}
//       <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition">
//         <div className="flex justify-between items-center mb-4">
//           <h2 className="text-lg font-semibold text-gray-800">
//             Ph Value ({range})
//           </h2>
//         </div>
//         <ResponsiveContainer width="100%" height={200}>
//           <LineChart data={chartData[range].ph}>
//             <CartesianGrid strokeDasharray="3 3" />
//             <XAxis dataKey="name" />
//             <Line
//               type="monotone"
//               dataKey="value"
//               stroke="#10B981"
//               strokeWidth={3}
//               dot={{ r: 4 }}
//               activeDot={{ r: 6 }}
//             />
//           </LineChart>
//         </ResponsiveContainer>
//       </div>
//     </div>
//   );
// }
