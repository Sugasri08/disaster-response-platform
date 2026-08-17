// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore' // TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBqc_pgl6zMMoCP-WrA_n9W5J2fo6rE9Es",
  authDomain: "aidmap-15529.firebaseapp.com",
  projectId: "aidmap-15529",
  storageBucket: "aidmap-15529.firebasestorage.app",
  messagingSenderId: "650270274112",
  appId: "1:650270274112:web:d8fcecbcd095ce8424a5a5",
  measurementId: "G-859L04P47S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app)
const db = getFirestore(app)

export { auth, db }
export default app