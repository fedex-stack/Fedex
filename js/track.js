import { db } from "./firebase.js";
import { formatDate } from "./utils.js";

import {
    doc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const trackingCode = params.get("code");

const loading = document.getElementById("loading");
const error = document.getElementById("error");
const shipmentView = document.getElementById("shipmentView");

if (!trackingCode) {
    loading.style.display = "none";
    error.innerText = "Tracking code missing";
} else {
    const shipmentRef = doc(db, "shipments", trackingCode);

    onSnapshot(shipmentRef, (docSnap) => {
        loading.style.display = "none";

        if (!docSnap.exists()) {
            error.innerText = "Shipment not found";
            return;
        }

        const shipment = docSnap.data();

        shipmentView.style.display = "block";

        document.getElementById("trackingCode").innerText =
            shipment.trackingCode || "N/A";

        document.getElementById("status").innerText =
            shipment.status || "N/A";

        document.getElementById("location").innerText =
            shipment.currentLocation || "N/A";

        document.getElementById("destination").innerText =
            shipment.destination || "N/A";

        document.getElementById("receiver").innerText =
            shipment.receiver || "N/A";

        const timeline = document.getElementById("timeline");
        timeline.innerHTML = "";

        const entries = shipment.timeline || [];

        entries
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            .forEach((item) => {
                const div = document.createElement("div");
                div.className = "timeline-item";

                div.innerHTML = `
                    <h4>${item.status}</h4>
                    <p>${item.location}</p>
                    <small>${formatDate(item.createdAt)}</small>
                `;

                timeline.appendChild(div);
            });
    });
}
