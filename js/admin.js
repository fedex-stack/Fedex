import { db, serverTimestamp } from "./firebase.js";
import { protectAdminPage, logoutAdmin } from "./auth.js";
import { generateTrackingCode, copyText, showToast } from "./utils.js";
import { STATUS } from "./config.js";

import {
    collection,
    doc,
    setDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

protectAdminPage();

const path = window.location.pathname;

/* ---------------- Logout ---------------- */
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutAdmin);
}

/* ------------- Admin Dashboard ------------ */
const shipmentsContainer = document.getElementById("shipmentsContainer");
const createBtn = document.getElementById("createBtn");

if (createBtn) {
    createBtn.addEventListener("click", () => {
        window.location.href = "create-shipment.html";
    });
}

if (shipmentsContainer) {
    onSnapshot(collection(db, "shipments"), (snapshot) => {
        shipmentsContainer.innerHTML = "";

        if (snapshot.empty) {
            shipmentsContainer.innerHTML =
                "<div id='emptyState'>No shipments yet</div>";
            return;
        }

        snapshot.forEach((docSnap) => {
            const shipment = docSnap.data();

            const card = document.createElement("div");
            card.className = "shipment-card";

            card.innerHTML = `
                <h3>${shipment.trackingCode}</h3>
                <p>Status: ${shipment.status}</p>
                <p>Location: ${shipment.currentLocation}</p>

                <div class="card-actions">
                    <button class="copy-btn">Copy Code</button>
                </div>
            `;

            const copyBtn = card.querySelector(".copy-btn");

            copyBtn.addEventListener("click", () => {
                copyText(shipment.trackingCode);
                showToast("Tracking code copied");
            });

            shipmentsContainer.appendChild(card);
        });
    });
}

/* ----------- Create Shipment Page ---------- */
const createShipmentBtn = document.getElementById("createShipmentBtn");

if (createShipmentBtn) {
    createShipmentBtn.addEventListener("click", async () => {
        const sender = document.getElementById("sender").value.trim();
        const receiver = document.getElementById("receiver").value.trim();
        const destination = document.getElementById("destination").value.trim();
        const location = document.getElementById("location").value.trim();
        const shipmentType = document.getElementById("shipmentType").value.trim();
        const weight = document.getElementById("weight").value.trim();

        if (
            !sender ||
            !receiver ||
            !destination ||
            !location ||
            !shipmentType ||
            !weight
        ) {
            showToast("Please fill all fields");
            return;
        }

        const trackingCode = generateTrackingCode();

        const shipmentData = {
            trackingCode,
            sender,
            receiver,
            destination,
            currentLocation: location,
            shipmentType,
            weight,
            status: STATUS.PENDING,
            createdAt: serverTimestamp(),
            timeline: [
                {
                    status: STATUS.PENDING,
                    location: location,
                    createdAt: Date.now()
                }
            ]
        };

        try {
            await setDoc(
                doc(db, "shipments", trackingCode),
                shipmentData
            );

            showToast("Shipment created");

            setTimeout(() => {
                window.location.href = "admin.html";
            }, 1200);
        } catch (error) {
            console.error(error);
            showToast("Failed to create shipment");
        }
    });
}
