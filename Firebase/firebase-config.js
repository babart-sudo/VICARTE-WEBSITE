// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration (YOUR ACTUAL CONFIG)
const firebaseConfig = {
  apiKey: "AIzaSyBf9sayfT8d2sajT5qbMLbYmf0faF8iPDs",
  authDomain: "vicarte-website.firebaseapp.com",
  projectId: "vicarte-website",
  storageBucket: "vicarte-website.firebasestorage.app",
  messagingSenderId: "398271131235",
  appId: "1:398271131235:web:e4dfdf3aa954a950d3d256",
  measurementId: "G-XPZRE9YY0M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;