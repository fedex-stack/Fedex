import { db, serverTimestamp } from "./firebase.js";
import { protectAdminPage, logoutAdmin } from "./auth.js";
import { generateTrackingCode, copyText, showToast } from "./utils.js";
import { STATUS } from "./config.js";

import {
    collection,
    doc,
    setDoc,
    onSnapshot,
    updateDoc,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

protectAdminPage();

let activeShipmentCode = null;
let allShipments = [];

const logoutBtn = document.getElementById("logoutBtn");
const createBtn = document.getElementById("createBtn");
const shipmentsContainer = document.getElementById("shipmentsContainer");
const searchInput = document.getElementById("searchInput");

const editModal = document.getElementById("editModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const saveUpdateBtn = document.getElementById("saveUpdateBtn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutAdmin);
}

if (createBtn) {
    createBtn.addEventListener("click", () => {
        window.location.href = "create-shipment.html";
    });
}

if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
        editModal.style.display = "none";
    });
}

function renderShipments(list) {
    shipmentsContainer.innerHTML = "";

    if (!list.length) {
        shipmentsContainer.innerHTML =
            "<div id='emptyState'>No shipments found</div>";
        return;
    }

    list.forEach((shipment) => {
        const card = document.createElement("div");
        card.className = "shipment-card";

        card.innerHTML = `
            <h3>${shipment.trackingCode}</h3>
            <p>Status: ${shipment.status}</p>
            <p>Location: ${shipment.currentLocation}</p>
            <div class="card-actions">
                <button class="edit-btn">Edit</button>
                <button class="copy-btn">Copy Code</button>
            </div>
        `;

        const copyBtn = card.querySelector(".copy-btn");
        const editBtn = card.querySelector(".edit-btn");

        copyBtn.addEventListener("click", () => {
            copyText(shipment.trackingCode);
            showToast("Tracking code copied");
        });

        editBtn.addEventListener("click", () => {
            activeShipmentCode = shipment.trackingCode;
            document.getElementById("editStatus").value = shipment.status;
            document.getElementById("editLocation").value = shipment.currentLocation;
            editModal.style.display = "flex";
        });

        shipmentsContainer.appendChild(card);
    });
}

if (shipmentsContainer) {
    onSnapshot(collection(db, "shipments"), (snapshot) => {
        allShipments = [];
        snapshot.forEach((docSnap) => {
            allShipments.push(docSnap.data());
        });
        renderShipments(allShipments);
    });
}

if (searchInput) {
    searchInput.addEventListener("input", () => {
        const keyword = searchInput.value.trim().toUpperCase();
        const filtered = allShipments.filter(s =>
            s.trackingCode.includes(keyword)
        );
        renderShipments(filtered);
    });
}

if (saveUpdateBtn) {
    saveUpdateBtn.addEventListener("click", async () => {
        const status = document.getElementById("editStatus").value;
        const location = document.getElementById("editLocation").value.trim();

        if (!activeShipmentCode || !location) {
            showToast("Missing update data");
            return;
        }

        try {
            await updateDoc(doc(db, "shipments", activeShipmentCode), {
                status,
                currentLocation: location,
                updatedAt: serverTimestamp(),
                timeline: arrayUnion({
                    status,
                    location,
                    createdAt: Date.now()
                })
            });

            showToast("Shipment updated");
            editModal.style.display = "none";
        } catch (error) {
            console.error(error);
            showToast("Update failed");
        }
    });
}

const createShipmentBtn = document.getElementById("createShipmentBtn");

if (createShipmentBtn) {
    createShipmentBtn.addEventListener("click", async () => {
        const sender = document.getElementById("sender").value.trim();
        const receiver = document.getElementById("receiver").value.trim();
        const destination = document.getElementById("destination").value.trim();
        const location = document.getElementById("location").value.trim();
        const shipmentType = document.getElementById("shipmentType").value.trim();
        const weight = document.getElementById("weight").value.trim();

        if (!sender || !receiver || !destination || !location || !shipmentType || !weight) {
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
                    location,
                    createdAt: Date.now()
                }
            ]
        };

        try {
            await setDoc(doc(db, "shipments", trackingCode), shipmentData);
            showToast("Shipment created");

            setTimeout(() => {
                window.location.href = "admin.html";
            }, 1000);
        } catch (error) {
            console.error(error);
            showToast("Creation failed");
        }
    });
}
