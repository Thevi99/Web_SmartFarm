import React from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import StatsCards from "../components/dashboard/StatsCards";
import ChartsRow from "../components/dashboard/ChartsRow";
// import TablesRow from "../components/dashboard/TablesRow";
import DOPhCharts from "../components/dashboard/DOPhCharts";

export default function Dashboard() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Sidebar />
      <div className="ml-48 p-6">
        <Header />
        <StatsCards />
        <DOPhCharts />
        <ChartsRow />
        {/* <TablesRow /> */}
      </div>
    </div>
  );
}