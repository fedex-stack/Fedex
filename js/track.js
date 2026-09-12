import { db } from "./firebase.js";
import { formatDate } from "./utils.js";

import {
    doc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


/* =========================================================
   GET TRACKING CODE
   Supports:

   https://fedexstack.com/TRK-LAG-NC00XQ70

   GitHub Pages:
   https://fedex-stack.github.io/Fedex/TRK-LAG-NC00XQ70

   AND old:
   track.html?code=TRK-LAG-NC00XQ70
========================================================= */

function getTrackingCode() {

    /* Check clean URL first */

    const path =
        window.location.pathname
            .replace(/\/+$/, "");

    const parts =
        path.split("/")
            .filter(Boolean);

    const lastPart =
        parts.length
            ? decodeURIComponent(parts[parts.length - 1])
            : "";


    if (
        /^TRK-LAG-[A-Z0-9]+$/i.test(lastPart)
    ) {

        return lastPart
            .trim()
            .toUpperCase();
    }


    /* Fallback to old ?code= URL */

    const params =
        new URLSearchParams(
            window.location.search
        );

    const queryCode =
        params.get("code");


    if (queryCode) {

        return queryCode
            .trim()
            .toUpperCase();
    }


    return "";
}


const trackingCode =
    getTrackingCode();


/* =========================================================
   PAGE ELEMENTS
========================================================= */

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
   TIMELINE
========================================================= */

function renderTimeline(entries) {

    const timeline =
        document.getElementById("timeline");

    if (!timeline) return;


    timeline.innerHTML = "";


    if (
        !Array.isArray(entries) ||
        entries.length === 0
    ) {

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
                    ${escapeHTML(
                        item.status || "Update"
                    )}

                    ${tick}
                </h4>

                <div class="timeline-location">
                    ${escapeHTML(
                        item.location ||
                        "Location unavailable"
                    )}
                </div>

                <div class="timeline-time">
                    ${formatDate(item.createdAt)}
                </div>

            `;


            timeline.appendChild(div);

        });
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
   CLEAN URL
========================================================= */

/*
   When GitHub Pages sends:

   /Fedex/TRK-LAG-C969J9SO

   the 404.html file redirects internally to:

   /Fedex/track.html?code=TRK-LAG-C969J9SO

   This changes the browser address back to:

   /Fedex/TRK-LAG-C969J9SO

   without reloading the page.
*/

function restoreCleanURL(code) {

    if (!code) return;


    const cleanPath =
        "/Fedex/" +
        encodeURIComponent(code);


    if (
        window.location.pathname !== cleanPath ||
        window.location.search
    ) {

        window.history.replaceState(
            {},
            "",
            cleanPath
        );
    }
}


/* =========================================================
   LOAD SHIPMENT
========================================================= */

if (!trackingCode) {

    if (loading) {

        loading.style.display =
            "none";
    }


    if (error) {

        error.style.display =
            "block";

        error.innerText =
            "Tracking code missing.";
    }

} else {

    const normalizedCode =
        trackingCode
            .trim()
            .toUpperCase();


    /* Restore clean URL */

    restoreCleanURL(
        normalizedCode
    );


    /* Update browser tab */

    document.title =
        `FedExStack Tracker — ${normalizedCode}`;


    /* Firestore shipment */

    const shipmentRef =
        doc(
            db,
            "shipments",
            normalizedCode
        );


    onSnapshot(

        shipmentRef,

        (docSnap) => {

            if (loading) {

                loading.style.display =
                    "none";
            }


            if (!docSnap.exists()) {

                if (shipmentView) {

                    shipmentView.style.display =
                        "none";
                }


                if (error) {

                    error.style.display =
                        "block";

                    error.innerText =
                        "Shipment not found.";
                }

                return;
            }


            if (error) {

                error.style.display =
                    "none";
            }


            const shipment =
                docSnap.data();


            if (shipmentView) {

                shipmentView.style.display =
                    "block";
            }


            /* =================================================
               TRACKING CODE
            ================================================= */

            const code =
                shipment.trackingCode ||
                normalizedCode;


            const trackingCodeElement =
                document.getElementById(
                    "trackingCode"
                );

            if (trackingCodeElement) {

                trackingCodeElement.innerText =
                    code;
            }


            const trackingCode2Element =
                document.getElementById(
                    "trackingCode2"
                );

            if (trackingCode2Element) {

                trackingCode2Element.innerText =
                    code;
            }


            /* =================================================
               STATUS
            ================================================= */

            const statusElement =
                document.getElementById(
                    "status"
                );

            if (statusElement) {

                statusElement.innerText =
                    shipment.status ||
                    "N/A";
            }


            /* =================================================
               LOCATION
            ================================================= */

            const locationElement =
                document.getElementById(
                    "location"
                );

            if (locationElement) {

                locationElement.innerText =
                    shipment.currentLocation ||
                    "N/A";
            }


            /* =================================================
               DESTINATION
            ================================================= */

            const destinationElement =
                document.getElementById(
                    "destination"
                );

            if (destinationElement) {

                destinationElement.innerText =
                    shipment.destination ||
                    "N/A";
            }


            /* =================================================
               RECEIVER
            ================================================= */

            const receiverElement =
                document.getElementById(
                    "receiver"
                );

            if (receiverElement) {

                receiverElement.innerText =
                    shipment.receiver ||
                    "N/A";
            }


            /* =================================================
               SENDER
            ================================================= */

            const senderElement =
                document.getElementById(
                    "sender"
                );

            if (senderElement) {

                senderElement.innerText =
                    shipment.sender ||
                    "N/A";
            }


            /* =================================================
               PHONES
            ================================================= */

            const senderPhoneElement =
                document.getElementById(
                    "senderPhone"
                );

            if (senderPhoneElement) {

                senderPhoneElement.innerText =
                    shipment.senderPhone ||
                    "N/A";
            }


            const receiverPhoneElement =
                document.getElementById(
                    "receiverPhone"
                );

            if (receiverPhoneElement) {

                receiverPhoneElement.innerText =
                    shipment.receiverPhone ||
                    "N/A";
            }


            /* =================================================
               MAP LABELS
            ================================================= */

            const mapOrigin =
                document.getElementById(
                    "mapOrigin"
                );

            if (mapOrigin) {

                mapOrigin.innerText =
                    shipment.currentLocation ||
                    "Origin";
            }


            const mapDestination =
                document.getElementById(
                    "mapDestination"
                );

            if (mapDestination) {

                mapDestination.innerText =
                    shipment.destination ||
                    "Destination";
            }


            /* =================================================
               PROGRESS
            ================================================= */

            updateVisuals(
                shipment.status
            );


            /* =================================================
               TIMELINE
            ================================================= */

            renderTimeline(
                shipment.timeline || []
            );

        },

        (firebaseError) => {

            console.error(
                "Shipment listener error:",
                firebaseError
            );


            if (loading) {

                loading.style.display =
                    "none";
            }


            if (shipmentView) {

                shipmentView.style.display =
                    "none";
            }


            if (error) {

                error.style.display =
                    "block";

                error.innerText =
                    "Unable to load shipment information.";
            }

        }

    );
}


/* =========================================================
   TELEGRAM SUPPORT
========================================================= */

const supportBtn =
    document.querySelector(
        ".support-btn"
    );


if (supportBtn) {

    supportBtn.addEventListener(
        "click",
        () => {

            window.open(
                "https://t.me/rfedexstack",
                "_blank",
                "noopener"
            );

        }
    );
}