// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDtwn1cNJ-rYT1gePtccg-j_mP_BlWrV-Y",
  authDomain: "yourcbt-app-d6ee5.firebaseapp.com",
  projectId: "yourcbt-app-d6ee5",
  storageBucket: "yourcbt-app-d6ee5.firebasestorage.app",
  messagingSenderId: "1069735906675",
  appId: "1:1069735906675:web:0d5538465b8141b86a4906",
  measurementId: "G-5LMDEVQ59D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

