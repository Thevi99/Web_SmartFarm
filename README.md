# Web SmartFarm 🌱

Welcome to **Web SmartFarm**! This is a web application designed to monitor and manage various parameters in a smart farm, such as pH levels and dissolved oxygen (DO). It's built using **React**, **Vite**, and **Firebase** for real-time data updates and interactive UI.

## Features ✨

- **Real-time Monitoring**: View and manage pH and DO values from the sensors in your smart farm.
- **Alert System**: Receive notifications when pH or DO values go out of the safe range.
- **Responsive UI**: A mobile-friendly interface that works on both desktop and mobile.
- **Configurable Settings**: Set custom data refresh intervals (e.g., every 10 seconds, 5 minutes, etc.).
- **Firebase Integration**: Data is stored in **Firebase** for easy access and management.

## Project Structure 📁

- **`src/pages/`**: Main app pages like `WelcomeScreen`, `MainScreen`, etc.
- **`src/components/`**: Reusable components like `Sidebar`, `Header`, `StatsCards`, etc.
- **`src/lib/firebase.js`**: Firebase configuration file.
  
## Setup Instructions 🛠️

Follow these steps to get started:

### 1. Clone the repository

```bash
git clone https://github.com/Thevi99/Web_SmartFarm.git
cd Web_SmartFarm
npm install
npm run dev

