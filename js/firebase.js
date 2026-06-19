import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getFirestore,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyARH3A36iUTbFrEGZyheAiLsdck7gK2ADU",
    authDomain: "fedex-tracker-7df61.firebaseapp.com",
    projectId: "fedex-tracker-7df61",
    storageBucket: "fedex-tracker-7df61.firebasestorage.app",
    messagingSenderId: "980377748577",
    appId: "1:980377748577:web:2f1ab3c3133d1dd2ecd620"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, serverTimestamp };
