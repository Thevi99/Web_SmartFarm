import React from 'react';
import Sidebar from '../components/layout/Sidebar';
import AlertTable from '../components/notification/AlertTable';

export default function Dashboard() {
    return(
        <div className="bg-gray-50 min-h-screen flex">
            <Sidebar />
            <div className='ml-48 p-6'>
                <AlertTable />
            </div>
        </div>
    );
}