import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase Configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: "mov-project-6931c.firebaseapp.com",
    databaseURL: "https://mov-project-6931c-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "mov-project-6931c",
    storageBucket: "mov-project-6931c.firebasestorage.app",
    messagingSenderId: "238665424999",
    appId: "1:238665424999:web:20283ca9de08b6135fb4c2",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const database = getDatabase(app);

export default app;

