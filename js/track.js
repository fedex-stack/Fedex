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
    const s = status.toLowerCase();

    if (s.includes("pending")) return 8;
    if (s.includes("picked")) return 25;
    if (s.includes("processing")) return 35;
    if (s.includes("transit")) return 55;
    if (s.includes("out")) return 80;
    if (s.includes("delivered")) return 100;
    if (s.includes("delay")) return 65;

    return 20;
}

function updateProgress(status) {
    const progress = getProgress(status);

    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }

    if (truck) {
        truck.style.left = `${progress}%`;
    }

    if (mapTruck) {
        mapTruck.style.left = `${Math.max(12, progress - 8)}%`;
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

        updateProgress(shipment.status || "Pending");

        const timeline = document.getElementById("timeline");
        timeline.innerHTML = "";

        const entries = shipment.timeline || [];

        entries
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            .forEach((item) => {
                const div = document.createElement("div");
                div.className = "timeline-item";

                let extra = "";

                if (
                    item.status &&
                    item.status.toLowerCase().includes("out for delivery")
                ) {
                    extra = `
                        <div style="
                            margin-top:10px;
                            color:#1eff78;
                            font-weight:bold;
                            animation:pulseTick 1s infinite;
                        ">
                            ✓ Courier approaching destination
                        </div>
                    `;
                }

                div.innerHTML = `
                    <h4>${item.status}</h4>
                    <p>${item.location}</p>
                    <small style="color:#98a2b7;">
                        ${formatDate(item.createdAt)}
                    </small>
                    ${extra}
                `;

                timeline.appendChild(div);
            });
    });
}

/* support button */
const supportBtn = document.querySelector(".support-btn");

if (supportBtn) {
    supportBtn.addEventListener("click", () => {
        window.open(
            "https://wa.me/2340000000000",
            "_blank"
        );
    });
}

/* small truck movement */
let move = 0;

setInterval(() => {
    if (!mapTruck) return;

    move += 1;

    mapTruck.style.transform =
        `translateY(${Math.sin(move / 4) * 4}px)`;
}, 120);
