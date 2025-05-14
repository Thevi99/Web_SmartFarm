import React, { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { Clock, Save, RefreshCw, Bell, AlertTriangle, Check } from 'lucide-react';

export default function Settings() {
    // Default refresh options
    const refreshOptions = [
        { id: '10s', label: '10 วินาที', value: 10, unit: 'seconds' },
        { id: '5m', label: '5 นาที', value: 5 * 60, unit: 'minutes' },
        { id: '30m', label: '30 นาที', value: 30 * 60, unit: 'minutes' },
        { id: '3h', label: '3 ชั่วโมง', value: 3 * 60 * 60, unit: 'hours' },
        { id: '24h', label: '24 ชั่วโมง', value: 24 * 60 * 60, unit: 'hours' }
    ];

    // State for selected refresh interval and notification
    const [selectedRefresh, setSelectedRefresh] = useState('10s');
    const [showSavedMessage, setShowSavedMessage] = useState(false);
    const [showSavingMessage, setShowSavingMessage] = useState(false);

    // Load saved settings on component mount
    useEffect(() => {
        // In a real app, you would fetch this from localStorage or an API
        const savedSetting = localStorage.getItem('refreshInterval') || '10s';
        setSelectedRefresh(savedSetting);
    }, []);

    // Handle saving settings
    const handleSaveSettings = () => {
        setShowSavingMessage(true);
        
        // Simulate API call or saving process
        setTimeout(() => {
            // Save to localStorage for demo purposes
            localStorage.setItem('refreshInterval', selectedRefresh);
            
            setShowSavingMessage(false);
            setShowSavedMessage(true);
            
            // Hide the saved message after 3 seconds
            setTimeout(() => {
                setShowSavedMessage(false);
            }, 3000);
        }, 800);
    };

    return (
        <div className="bg-gray-50 min-h-screen flex">
            <Sidebar />
            <div className="flex-1 ml-48 p-6">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-800">ตั้งค่าระบบ</h1>
                        <p className="text-gray-600 mt-2">ปรับแต่งการทำงานของระบบตามต้องการ</p>
                    </div>
                    
                    {/* Settings Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Card Header */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
                            <div className="flex items-center">
                                <div className="bg-blue-100 p-2 rounded-lg">
                                    <RefreshCw className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="ml-4">
                                    <h2 className="text-lg font-semibold text-gray-800">ตั้งค่าการรีเฟรชข้อมูล</h2>
                                    <p className="text-sm text-gray-600">กำหนดระยะเวลาในการดึงข้อมูลใหม่จากเซนเซอร์</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Card Content */}
                        <div className="p-6">
                            <div className="mb-6">
                                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                                    <Clock className="h-4 w-4 mr-2 text-gray-500" />
                                    เลือกระยะเวลารีเฟรช
                                </h3>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {refreshOptions.map((option) => (
                                        <div 
                                            key={option.id}
                                            onClick={() => setSelectedRefresh(option.id)}
                                            className={`
                                                relative border rounded-lg p-4 cursor-pointer transition-all duration-200
                                                ${selectedRefresh === option.id 
                                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                                            `}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="block text-sm font-medium text-gray-700">
                                                        {option.label}
                                                    </span>
                                                    <span className="block text-xs text-gray-500 mt-1">
                                                        {option.unit === 'seconds' && 'รีเฟรชทุก 10 วินาที'}
                                                        {option.unit === 'minutes' && option.value === 300 && 'รีเฟรชทุก 5 นาที'}
                                                        {option.unit === 'minutes' && option.value === 1800 && 'รีเฟรชทุก 30 นาที'}
                                                        {option.unit === 'hours' && option.value === 10800 && 'รีเฟรชทุก 3 ชั่วโมง'}
                                                        {option.unit === 'hours' && option.value === 86400 && 'รีเฟรชวันละครั้ง'}
                                                    </span>
                                                </div>
                                                
                                                {selectedRefresh === option.id && (
                                                    <div className="bg-blue-500 rounded-full p-1">
                                                        <Check className="h-3 w-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Warnings/Information */}
                            <div className="mb-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-amber-800">ข้อควรทราบ</h3>
                                        <div className="mt-2 text-sm text-amber-700">
                                            <p>
                                                การตั้งค่ารีเฟรชที่เร็วเกินไปอาจส่งผลต่อประสิทธิภาพของระบบและการใช้งานแบตเตอรี่ของอุปกรณ์เซนเซอร์
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Notification Settings */}
                            <div className="mb-8">
                                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                                    <Bell className="h-4 w-4 mr-2 text-gray-500" />
                                    การแจ้งเตือน
                                </h3>
                                
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                                        <div>
                                            <span className="block text-sm font-medium text-gray-700">
                                                แจ้งเตือนเมื่อค่า pH ผิดปกติ
                                            </span>
                                            <span className="block text-xs text-gray-500 mt-1">
                                                รับการแจ้งเตือนเมื่อค่า pH ต่ำกว่า 6.5 หรือสูงกว่า 8.5
                                            </span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                    
                                    <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                                        <div>
                                            <span className="block text-sm font-medium text-gray-700">
                                                แจ้งเตือนเมื่อค่า DO ผิดปกติ
                                            </span>
                                            <span className="block text-xs text-gray-500 mt-1">
                                                รับการแจ้งเตือนเมื่อค่า DO ต่ำกว่าเกณฑ์ที่กำหนด
                                            </span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Card Footer with Save Button */}
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                            <div>
                                {showSavingMessage && (
                                    <span className="text-sm text-gray-600 flex items-center">
                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                                        กำลังบันทึก...
                                    </span>
                                )}
                                {showSavedMessage && (
                                    <span className="text-sm text-green-600 flex items-center">
                                        <Check className="h-4 w-4 mr-2" />
                                        บันทึกการตั้งค่าเรียบร้อยแล้ว
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={handleSaveSettings}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                บันทึกการตั้งค่า
                            </button>
                        </div>
                    </div>
                    
                    {/* Additional settings sections could be added here */}
                </div>
            </div>
        </div>
    );
}