# 🌱 Smart Farm Web Application

## Key Features
- **Real-time Monitoring**: Temperature, humidity, soil moisture
- **Automated Systems**: Control irrigation, lighting, and ventilation
- **Responsive Design**: Works on both desktop and mobile devices

## Technologies Used
- **Frontend**: HTML, CSS, JavaScript, Bootstrap
- **Backend**: Node.js, Express
- **Databases**: 
  - MongoDB
  - Firebase Firestore
- **IoT Communication**: MQTT protocol

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Firebase account with Firestore enabled
- MQTT broker

### Setup Steps
1. Clone the repository
```bash
git clone https://github.com/Thevi99/Web_SmartFarm.git
cd Web_SmartFarm
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
   - Create a `.env` file with the following:
```
PORT=3000
MONGO_URI=mongodb://localhost:27017/smartfarm
MQTT_BROKER=mqtt://localhost:1883
```

4. Set up Firebase
   - Create a Firebase project in the Firebase Console
   - Enable Firestore Database
   - Add your Firebase configuration to `config/firebase.js`:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

5. Start the application
```bash
npm start
```

6. Access the application at `http://localhost:3000`

## Project Structure
```
Web_SmartFarm/
├── public/             # Static files
├── views/              # HTML templates
├── routes/             # Express routes
├── models/             # Database models
├── controllers/        # Business logic
├── config/             # Configuration files
└── app.js              # Application entry point
```

## Usage
The main dashboard displays real-time data from all connected sensors and devices. You can:
- View current readings for temperature, humidity, soil moisture
- Check the status of automated systems
- Control devices manually

## Data Storage
- **MongoDB**: Stores user information and system configurations
- **Firebase Firestore**: Handles real-time sensor data and device states, enabling efficient real-time updates and synchronization across multiple clients

## IoT Integration
This application works with ESP8266 or ESP32-based IoT devices using the following JSON format:

```json
{
  "deviceId": "greenhouse1",
  "temperature": 25.4,
  "humidity": 68,
  "soilMoisture": 42,
  "lightLevel": 856
}
```

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## Contact
- GitHub: [https://github.com/Thevi99/Web_SmartFarm](https://github.com/Thevi99/Web_SmartFarm)
