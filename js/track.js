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

const progressFill = document.getElementById("progressFill");
const truck = document.getElementById("truck");
const mapTruck = document.getElementById("mapTruck");

function getProgress(status) {
    switch (status) {
        case "Pending":
            return 10;
        case "Picked Up":
            return 25;
        case "Processing":
            return 40;
        case "In Transit":
            return 65;
        case "Out For Delivery":
            return 90;
        case "Delivered":
            return 100;
        case "Delayed":
            return 55;
        case "Held":
            return 45;
        default:
            return 0;
    }
}

function renderTimeline(entries) {
    const timeline = document.getElementById("timeline");
    timeline.innerHTML = "";

    entries
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .forEach((item) => {
            const div = document.createElement("div");
            div.className = "timeline-item";

            let tick = "";

            if (
                item.status === "Out For Delivery" ||
                item.status === "Delivered"
            ) {
                tick = `<span class="tick">✔</span>`;
            }

            div.innerHTML = `
                <h4>${item.status} ${tick}</h4>
                <p>${item.location}</p>
                <small>${formatDate(item.createdAt)}</small>
            `;

            timeline.appendChild(div);
        });
}

function updateVisuals(status) {
    const progress = getProgress(status);

    if (progressFill) {
        progressFill.style.width = progress + "%";
    }

    if (truck) {
        truck.style.left = `calc(${progress}% - 14px)`;
    }

    if (mapTruck) {
        const mapProgress = 12 + (progress * 0.63);
        mapTruck.style.left = mapProgress + "%";
    }
}

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

        updateVisuals(shipment.status);

        renderTimeline(shipment.timeline || []);
    });
}
