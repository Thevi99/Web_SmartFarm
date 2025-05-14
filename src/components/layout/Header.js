import React from "react";
import { Search, Bell, Settings } from "lucide-react";

export default function Header() {
    return (
        <div className="flex justify-between items-center mb-6">
        <div>
          <div className="text-xs text-gray-500">Pages / Dashboard</div>
          <h1 className="text-2xl font-bold text-gray-800">Main Dashboard</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              className="bg-white px-4 py-2 pl-10 rounded-lg text-sm border border-gray-100"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          <Bell className="h-5 w-5 text-gray-400" />
          <Settings className="h-5 w-5 text-gray-400" />
          <div className="w-8 h-8 bg-indigo-500 rounded-full overflow-hidden">
            <img
              src="/api/placeholder/32/32"
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    );
}