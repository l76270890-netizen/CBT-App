import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDtwn1cNJ-rYT1gePtccg-j_mP_BlWrV-Y",
  authDomain: "yourcbt-app-d6ee5.firebaseapp.com",
  projectId: "yourcbt-app-d6ee5",
  storageBucket: "yourcbt-app-d6ee5.firebasestorage.app",
  messagingSenderId: "1069735906675",
  appId: "1:1069735906675:web:0d5538465b8141b86a4906",
  measurementId: "G-5LMDEVQ59D"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app;