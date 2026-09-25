import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAp6PZxgOBLwmbheLJTMGFb6sK77645wZQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "frota-g6-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "frota-g6-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "frota-g6-app.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "519722610813",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:519722610813:web:9e0f94d6916bd82dfe8114"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa e exporta o Firestore (Banco de Dados)
export const db = getFirestore(app);

// Inicializa e exporta o Firebase Auth
export const auth = getAuth(app);
