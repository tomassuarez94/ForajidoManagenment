// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAkNqpXuaBZx7OUhEYTRnitCAVUTZDYy-s",
  authDomain: "forajido-bar.firebaseapp.com",
  projectId: "forajido-bar",
  storageBucket: "forajido-bar.firebasestorage.app",
  messagingSenderId: "466052069349",
  appId: "1:466052069349:web:e914b09f99948b8755a10c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// 🔹 Exportar la base de datos Firestore
const db = getFirestore(app);

// 🔹 Autenticación
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { db, auth, provider, signInWithPopup, signOut };