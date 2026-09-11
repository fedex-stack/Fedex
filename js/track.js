import { db } from "./firebase.js";
import { formatDate } from "./utils.js";

import {
    doc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const params =
    new URLSearchParams(window.location.search);

const trackingCode =
    params.get("code");


const loading =
    document.getElementById("loading");

const error =
    document.getElementById("error");

const shipmentView =
    document.getElementById("shipmentView");


const progressFill =
    document.getElementById("progressFill");

const truck =
    document.getElementById("truck");

const mapTruck =
    document.getElementById("mapTruck");


/* =========================================================
   STATUS PROGRESS
========================================================= */

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

        case "Cancelled":
            return 0;

        default:
            return 0;
    }
}


/* =========================================================
   TIMELINE
========================================================= */

function renderTimeline(entries) {

    const timeline =
        document.getElementById("timeline");

    timeline.innerHTML = "";


    if (!Array.isArray(entries) || entries.length === 0) {

        timeline.innerHTML = `
            <div class="timeline-item">

                <h4>Shipment Created</h4>

                <div class="timeline-location">
                    Tracking information is being prepared.
                </div>

                <div class="timeline-time">
                    No timeline updates yet
                </div>

            </div>
        `;

        return;
    }


    entries
        .slice()
        .sort((a, b) => {

            const aTime =
                getTimestamp(a.createdAt);

            const bTime =
                getTimestamp(b.createdAt);

            return bTime - aTime;

        })
        .forEach((item) => {

            const div =
                document.createElement("div");

            div.className =
                "timeline-item";


            let tick = "";


            if (
                item.status === "Out For Delivery" ||
                item.status === "Delivered"
            ) {

                tick =
                    `<span class="tick">✓</span>`;
            }


            div.innerHTML = `

                <h4>
                    ${escapeHTML(item.status || "Update")}
                    ${tick}
                </h4>

                <div class="timeline-location">
                    ${escapeHTML(item.location || "Location unavailable")}
                </div>

                <div class="timeline-time">
                    ${formatDate(item.createdAt)}
                </div>

            `;


            timeline.appendChild(div);

        });
}


/* =========================================================
   TIMESTAMP HELPER
========================================================= */

function getTimestamp(value) {

    if (!value) return 0;


    if (
        typeof value.toMillis === "function"
    ) {

        return value.toMillis();
    }


    if (
        typeof value.toDate === "function"
    ) {

        return value.toDate().getTime();
    }


    if (typeof value === "number") {

        return value;
    }


    const parsed =
        new Date(value).getTime();


    return isNaN(parsed)
        ? 0
        : parsed;
}


/* =========================================================
   BASIC HTML ESCAPING
========================================================= */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   VISUAL PROGRESS
========================================================= */

function updateVisuals(status) {

    const progress =
        getProgress(status);


    if (progressFill) {

        progressFill.style.width =
            progress + "%";
    }


    if (truck) {

        truck.style.left =
            `calc(${progress}% - 0px)`;
    }


    if (mapTruck) {

        const mapProgress =
            10 + (progress * 0.80);

        mapTruck.style.left =
            `calc(${mapProgress}% - 17px)`;
    }
}


/* =========================================================
   LOAD SHIPMENT
========================================================= */

if (!trackingCode) {

    loading.style.display = "none";

    error.style.display = "block";

    error.innerText =
        "Tracking code missing.";

} else {

    const normalizedCode =
        trackingCode.trim().toUpperCase();


    const shipmentRef =
        doc(
            db,
            "shipments",
            normalizedCode
        );


    onSnapshot(

        shipmentRef,

        (docSnap) => {

            loading.style.display = "none";


            if (!docSnap.exists()) {

                shipmentView.style.display =
                    "none";

                error.style.display =
                    "block";

                error.innerText =
                    "Shipment not found.";

                return;
            }


            error.style.display =
                "none";


            const shipment =
                docSnap.data();


            shipmentView.style.display =
                "block";


            /* Tracking code */

            const code =
                shipment.trackingCode ||
                normalizedCode;


            document.getElementById(
                "trackingCode"
            ).innerText = code;


            document.getElementById(
                "trackingCode2"
            ).innerText = code;


            /* Status */

            document.getElementById(
                "status"
            ).innerText =
                shipment.status || "N/A";


            /* Location */

            document.getElementById(
                "location"
            ).innerText =
                shipment.currentLocation ||
                "N/A";


            /* Destination */

            document.getElementById(
                "destination"
            ).innerText =
                shipment.destination ||
                "N/A";


            /* Receiver */

            document.getElementById(
                "receiver"
            ).innerText =
                shipment.receiver ||
                "N/A";


            /* Sender */

            document.getElementById(
                "sender"
            ).innerText =
                shipment.sender ||
                "N/A";


            /* Phones */

            document.getElementById(
                "senderPhone"
            ).innerText =
                shipment.senderPhone ||
                "N/A";


            document.getElementById(
                "receiverPhone"
            ).innerText =
                shipment.receiverPhone ||
                "N/A";


            /* Map labels */

            document.getElementById(
                "mapOrigin"
            ).innerText =
                shipment.currentLocation ||
                "Origin";


            document.getElementById(
                "mapDestination"
            ).innerText =
                shipment.destination ||
                "Destination";


            /* Progress */

            updateVisuals(
                shipment.status
            );


            /* Timeline */

            renderTimeline(
                shipment.timeline || []
            );

        },

        (firebaseError) => {

            console.error(
                "Shipment listener error:",
                firebaseError
            );


            loading.style.display =
                "none";

            shipmentView.style.display =
                "none";

            error.style.display =
                "block";

            error.innerText =
                "Unable to load shipment information.";
        }

    );
}