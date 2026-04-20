// =========================================================
// FILE: firebase-config.js
// PURPOSE: Central Firebase initialization for IJK Smart Attendance
// =========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// --- YOUR FIREBASE CONFIG (Updated from your screenshot) ---
const firebaseConfig = {
  apiKey: "AIzaSyAiOL0t9psazQPrN4aw0flNB6dJexeeHRk",
  authDomain: "ijk-smart-attendance.firebaseapp.com",
  projectId: "ijk-smart-attendance",
  storageBucket: "ijk-smart-attendance.firebasestorage.app",
  messagingSenderId: "551550018398",
  appId: "1:551550018398:web:9cfb76efbcde7a943325cf"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Low Connectivity Mode - Ye Pakistan ke internet issues ke liye best hai
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
        console.warn("Persistence failed: multiple tabs open.");
    } else if (err.code === "unimplemented") {
        console.warn("Persistence not supported in this browser.");
    }
});

export { app, auth, db, storage };