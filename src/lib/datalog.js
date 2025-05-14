// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDF1ytMb5YnaOexRUTKJyIFVgVvur5-Th4",
  authDomain: "smartfarm-258eb.firebaseapp.com",
  databaseURL: "https://smartfarm-258eb-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "smartfarm-258eb",
  storageBucket: "smartfarm-258eb.firebasestorage.app",
  messagingSenderId: "491885291358",
  appId: "1:491885291358:web:6aee656b9656bd8a5911cf",
  measurementId: "G-1XNE918YED"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to load data from Firestore and display it in a table
async function loadData() {
  const querySnapshot = await getDocs(collection(db, "datalog"));
  const tableBody = document.getElementById("datalogTable").getElementsByTagName("tbody")[0];

  querySnapshot.forEach(doc => {
    const data = doc.data();
    const row = tableBody.insertRow();  // Create a new row for each document

    // Insert cells into the row
    const cellId = row.insertCell(0);         // Column for document ID
    const cellSensorId = row.insertCell(1);  // Column for sensor ID
    const cellTimestamp = row.insertCell(2); // Column for timestamp
    const cellValue = row.insertCell(3);     // Column for value

    cellId.textContent = doc.id;
    cellSensorId.textContent = data.sensorId  || "N/A";
    cellTimestamp.textContent = data.timestamp  || "N/A";
    cellValue.textContent = data.value || "N/A";
  });
}

// Call the loadData function to fetch data
loadData();