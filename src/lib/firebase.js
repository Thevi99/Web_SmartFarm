// import { initializeApp } from "firebase/app";
// import { getDatabase } from "firebase/database";

// const firebaseConfig = {
//     apiKey: "AIzaSyDF1ytMb5YnaOexRUTKJyIFVgVvur5-Th4",
//     authDomain: "smartfarm-258eb.firebaseapp.com",
//     databaseURL: "https://smartfarm-258eb-default-rtdb.asia-southeast1.firebasedatabase.app",
//     projectId: "smartfarm-258eb",
//     storageBucket: "smartfarm-258eb.firebasestorage.app",
//     messagingSenderId: "491885291358",
//     appId: "1:491885291358:web:6aee656b9656bd8a5911cf",
//     measurementId: "G-1XNE918YED"
//   };
  

// const app = initializeApp(firebaseConfig);
// const db = getDatabase(app);

// export { db };

// import { initializeApp } from "firebase/app";
// import { getFirestore, doc, getDoc } from "firebase/firestore";

// // Your Firebase configuration
// const firebaseConfig = {
//   apiKey: "AIzaSyDF1ytMb5YnaOexRUTKJyIFVgVvur5-Th4",
//   authDomain: "smartfarm-258eb.firebaseapp.com",
//   databaseURL: "https://smartfarm-258eb-default-rtdb.asia-southeast1.firebasedatabase.app",
//   projectId: "smartfarm-258eb",
//   storageBucket: "smartfarm-258eb.firebasestorage.app",
//   messagingSenderId: "491885291358",
//   appId: "1:491885291358:web:6aee656b9656bd8a5911cf",
//   measurementId: "G-1XNE918YED"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const db = getFirestore(app); // Initialize Firestore

// // Function to fetch data from Firestore based on current date
// async function fetchDataForToday() {
//   // Get today's date in YYYY-MM-DD format
//   const today = new Date();
//   const dateStr = today.toISOString().split('T')[0]; // Get the date part of the ISO string (YYYY-MM-DD)
//   console.log("Fetching data for date:", dateStr);

//   const docRef = doc(db, "phlog", dateStr);  // Reference to the document by today's date
//   const docSnap = await getDoc(docRef);  // Get the document snapshot

//   if (docSnap.exists()) {
//     console.log("Document data:", docSnap.data());
//     const data = docSnap.data();
//     const pHReadings = data.pH_readings;
//     pHReadings.forEach((reading, index) => {
//       console.log(`Reading ${index + 1}:`);
//       console.log(`Impact: ${reading.impact}`);
//       console.log(`pH: ${reading.pH}`);
//       console.log(`Status: ${reading.status}`);
//       console.log(`Time: ${reading.time}`);
//     });
//   } else {
//     console.log("No data found for today's date!");
//   }
// }

// // Call fetchDataForToday to get the current day's data
// fetchDataForToday();



// lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDF1ytMb5YnaOexRUTKJyIFVgVvur5-Th4",
  authDomain: "smartfarm-258eb.firebaseapp.com",
  projectId: "smartfarm-258eb",
  storageBucket: "smartfarm-258eb.appspot.com",
  messagingSenderId: "491885291358",
  appId: "1:491885291358:web:6aee656b9656bd8a5911cf",
  measurementId: "G-1XNE918YED"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Firestore instance

export { db }; // export db ให้ใช้ในไฟล์อื่น

