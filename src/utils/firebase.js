import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: "ai-interview-app-59286.firebaseapp.com",
  projectId: "ai-interview-app-59286",
  storageBucket: "ai-interview-app-59286.firebasestorage.app",
  messagingSenderId: "774853987492",
  appId: "1:774853987492:web:2063f34dd3f1dffa082a31",
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const provider = new GoogleAuthProvider();

export { auth, provider };
