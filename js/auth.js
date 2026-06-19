import { auth } from "./firebase.js";
import { ADMIN_USERNAME, ADMIN_EMAIL } from "./config.js";

import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export async function loginAdmin(username, password) {
    let email = username;

    if (username === ADMIN_USERNAME) {
        email = ADMIN_EMAIL;
    }

    return await signInWithEmailAndPassword(
        auth,
        email,
        password
    );
}

export function protectAdminPage() {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "admin-login.html";
        }
    });
}

export async function logoutAdmin() {
    await signOut(auth);
    window.location.href = "admin-login.html";
}
