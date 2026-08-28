import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAp6PZxgOBLwmbheLJTMGFb6sK77645wZQ",
  authDomain: "frota-g6-app.firebaseapp.com",
  projectId: "frota-g6-app",
  storageBucket: "frota-g6-app.firebasestorage.app",
  messagingSenderId: "519722610813",
  appId: "1:519722610813:web:9e0f94d6916bd82dfe8114"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa e exporta o Firestore (Banco de Dados)
export const db = getFirestore(app);

// Inicializa e exporta o Firebase Auth
export const auth = getAuth(app);
