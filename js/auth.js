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

    return await signInWithEmailAndPassword(auth, email, password);
}

export function protectAdminPage() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();

            if (!user) {
                window.location.href = "admin-login.html";
                return;
            }

            resolve(user);
        });
    });
}

export async function logoutAdmin() {
    await signOut(auth);
    window.location.href = "admin-login.html";
}
