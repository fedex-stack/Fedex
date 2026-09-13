import { db } from "./firebase.js";

import {
    doc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


/* =========================================================
   TRACKING CODE
========================================================= */

function getTrackingCode(){

    const pathParts =
        window.location.pathname
            .split("/")
            .filter(Boolean);

    const lastPart =
        pathParts[pathParts.length - 1] || "";

    if(/^TRK-LAG-[A-Z0-9]+$/i.test(lastPart)){
        return decodeURIComponent(lastPart).toUpperCase();
    }

    const params =
        new URLSearchParams(window.location.search);

    const queryCode =
        params.get("code");

    if(queryCode){
        return queryCode.trim().toUpperCase();
    }

    return "";
}


/* =========================================================
   RESTORE CLEAN URL
========================================================= */

function restoreCleanURL(code){

    if(!code) return;

    const cleanPath =
        "/Fedex/" + encodeURIComponent(code);

    if(
        window.location.pathname !== cleanPath ||
        window.location.search
    ){
        window.history.replaceState(
            {},
            "",
            cleanPath
        );
    }
}


/* =========================================================
   HELPERS
========================================================= */

function escapeHTML(value){

    if(value === null || value === undefined){
        return "";
    }

    return String(value)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}


function getTimestamp(value){

    if(!value){
        return null;
    }

    if(typeof value.toMillis === "function"){
        return value.toMillis();
    }

    if(value instanceof Date){
        return value.getTime();
    }

    if(typeof value === "number"){
        return value;
    }

    if(typeof value === "string"){

        const time =
            new Date(value).getTime();

        return Number.isNaN(time)
            ? null
            : time;
    }

    if(
        typeof value === "object" &&
        typeof value.seconds === "number"
    ){

        return (
            value.seconds * 1000 +
            Math.floor(
                (value.nanoseconds || 0) / 1000000
            )
        );
    }

    return null;
}


/* =========================================================
   U.S. EASTERN TIME
========================================================= */

function formatEasternTime(value){

    const timestamp =
        getTimestamp(value);

    if(!timestamp){
        return "Time unavailable";
    }

    try{

        return new Intl.DateTimeFormat(
            "en-US",
            {
                month:"short",
                day:"numeric",
                year:"numeric",
                hour:"numeric",
                minute:"2-digit",
                hour12:true,
                timeZone:"America/New_York",
                timeZoneName:"short"
            }
        ).format(new Date(timestamp));

    }catch(error){

        return new Date(timestamp)
            .toLocaleString("en-US");
    }
}


function formatShortDate(value){

    const timestamp =
        getTimestamp(value);

    if(!timestamp){
        return "—";
    }

    try{

        return new Intl.DateTimeFormat(
            "en-US",
            {
                month:"short",
                day:"numeric",
                timeZone:"America/New_York"
            }
        ).format(new Date(timestamp));

    }catch(error){

        return "—";
    }
}


/* =========================================================
   DEFAULT STATUS MESSAGES
========================================================= */

function defaultStatusMessage(status){

    const messages = {

        "Pending":
            "Your shipment has been received and is being prepared.",

        "Picked Up":
            "Your package has been picked up and is on its way.",

        "Processing":
            "Your shipment is currently being processed.",

        "In Transit":
            "Your package is currently in transit.",

        "Out For Delivery":
            "Your package is on the way and will be delivered today.",

        "Delivered":
            "Your package has been successfully delivered.",

        "Delayed":
            "Your shipment has been delayed. Please check back for updates.",

        "Held":
            "Your shipment is currently being held for further processing.",

        "Cancelled":
            "This shipment has been cancelled."

    };

    return messages[status] ||
        "Your shipment is currently being processed.";
}


/* =========================================================
   STATUS NORMALIZATION
========================================================= */

function normalizeStatus(status){

    if(!status){
        return "Pending";
    }

    const text =
        String(status)
            .trim()
            .toLowerCase();

    const statuses = [
        "Pending",
        "Picked Up",
        "Processing",
        "In Transit",
        "Out For Delivery",
        "Delivered",
        "Delayed",
        "Held",
        "Cancelled"
    ];

    return statuses.find(
        item => item.toLowerCase() === text
    ) || status;
}


/* =========================================================
   PROGRESS
========================================================= */

const progressMap = {

    "Pending":10,
    "Picked Up":25,
    "Processing":40,
    "In Transit":65,
    "Out For Delivery":90,
    "Delivered":100,

    "Delayed":55,
    "Held":45,
    "Cancelled":0
};


function updateVisuals(status){

    const progress =
        progressMap[status] ?? 10;

    const progressFill =
        document.getElementById("progressFill");

    if(progressFill){
        progressFill.style.width =
            `${progress}%`;
    }

    const items =
        document.querySelectorAll(
            ".progress-item"
        );

    const order = [
        "Pending",
        "Picked Up",
        "Processing",
        "In Transit",
        "Out For Delivery",
        "Delivered"
    ];

    const currentIndex =
        order.indexOf(status);

    items.forEach(item => {

        item.classList.remove(
            "completed",
            "current"
        );

        const itemStatus =
            item.dataset.status;

        const itemIndex =
            order.indexOf(itemStatus);

        if(
            currentIndex >= 0 &&
            itemIndex < currentIndex
        ){

            item.classList.add("completed");

        }else if(itemStatus === status){

            item.classList.add("current");
        }

    });
}


/* =========================================================
   STATUS DATES
========================================================= */

function updateProgressDates(timeline){

    document
        .querySelectorAll(".progress-date")
        .forEach(element => {

            element.textContent = "—";

        });


    timeline.forEach(item => {

        const status =
            normalizeStatus(item.status);

        const id =
            "date-" +
            status.replace(/\s+/g,"-");

        const element =
            document.getElementById(id);

        if(element && item.createdAt){

            element.textContent =
                formatShortDate(
                    item.createdAt
                );
        }

    });
}


/* =========================================================
   SHIPMENT HISTORY
========================================================= */

function renderTimeline(entries){

    const timelineElement =
        document.getElementById("timeline");

    if(!timelineElement){
        return;
    }

    if(
        !Array.isArray(entries) ||
        entries.length === 0
    ){

        timelineElement.innerHTML = `
            <div class="loading">
                No shipment history available yet.
            </div>
        `;

        return;
    }


    const sorted =
        [...entries].sort(
            (a,b) => {

                const timeA =
                    getTimestamp(a.createdAt) || 0;

                const timeB =
                    getTimestamp(b.createdAt) || 0;

                return timeB - timeA;
            }
        );


    timelineElement.innerHTML =
        sorted.map((item,index) => {

            const status =
                normalizeStatus(item.status);

            const location =
                item.location ||
                "Location unavailable";

            const time =
                formatEasternTime(
                    item.createdAt
                );

            return `
                <div class="timeline-item ${
                    index === 0
                        ? "current"
                        : ""
                }">

                    <div class="timeline-track"></div>

                    <div class="timeline-dot"></div>

                    <div class="timeline-content">

                        <div class="timeline-status">
                            ${escapeHTML(status)}
                        </div>

                        <div class="timeline-location">
                            ${escapeHTML(location)}
                        </div>

                    </div>

                    <div class="timeline-time">
                        ${escapeHTML(time)}
                    </div>

                </div>
            `;

        }).join("");
}


/* =========================================================
   COPY TRACKING NUMBER
========================================================= */

function setupCopyButton(code){

    const button =
        document.getElementById(
            "copyTracking"
        );

    if(!button){
        return;
    }

    button.addEventListener(
        "click",
        async () => {

            try{

                await navigator.clipboard.writeText(
                    code
                );

                const original =
                    button.textContent;

                button.textContent = "✓";

                setTimeout(() => {

                    button.textContent =
                        original;

                },1200);

            }catch(error){

                console.error(
                    "Copy failed:",
                    error
                );
            }

        }
    );
}


/* =========================================================
   SET TEXT SAFELY
========================================================= */

function setText(id,value){

    const element =
        document.getElementById(id);

    if(element){

        element.textContent =
            value || "—";
    }
}


/* =========================================================
   LOAD SHIPMENT
========================================================= */

function loadShipment(code){

    if(!code){

        document.body.innerHTML = `
            <div class="error">
                Invalid tracking number.
            </div>
        `;

        return;
    }


    restoreCleanURL(code);

    document.title =
        `${code} — FedEx Tracker`;


    setText(
        "trackingCode",
        code
    );


    setText(
        "trackingCode2",
        code
    );


    setupCopyButton(code);


    const shipmentRef =
        doc(
            db,
            "shipments",
            code
        );


    onSnapshot(
        shipmentRef,

        snapshot => {

            if(!snapshot.exists()){

                document.querySelector(
                    ".content"
                ).innerHTML = `
                    <div class="error">
                        Shipment not found.<br><br>
                        Please check your tracking number.
                    </div>
                `;

                return;
            }


            const shipment =
                snapshot.data();


            /* CURRENT STATUS */

            const status =
                normalizeStatus(
                    shipment.status
                );


            setText(
                "status",
                status
            );


            /* STATUS MESSAGE */

            setText(
                "statusMessage",
                shipment.statusMessage ||
                defaultStatusMessage(status)
            );


            /* ORIGIN */

            const origin =
                shipment.origin ||
                shipment.mapOrigin ||
                "—";


            setText(
                "origin",
                origin
            );


            setText(
                "mapOrigin",
                origin
            );


            /* DESTINATION */

            const destination =
                shipment.destination ||
                shipment.mapDestination ||
                "—";


            setText(
                "destination",
                destination
            );


            setText(
                "mapDestination",
                destination
            );


            /* DELIVERY ESTIMATE */

            setText(
                "estimatedDelivery",
                shipment.estimatedDelivery ||
                shipment.deliveryDate ||
                "—"
            );


            /* DELIVERY TIME */

            setText(
                "deliveryWindow",
                shipment.deliveryWindow ||
                shipment.deliveryTime ||
                "—"
            );


            /* PROGRESS */

            updateVisuals(status);


            /* HISTORY */

            const timeline =
                Array.isArray(
                    shipment.timeline
                )
                    ? shipment.timeline
                    : [];


            renderTimeline(
                timeline
            );


            updateProgressDates(
                timeline
            );


            /* IF CURRENT STATUS IS NOT IN
               STANDARD PROGRESS, KEEP THE
               PROGRESS VISUAL REASONABLE */

            if(
                status === "Delayed" ||
                status === "Held"
            ){

                const fill =
                    document.getElementById(
                        "progressFill"
                    );

                if(fill){
                    fill.style.width =
                        `${progressMap[status]}%`;
                }
            }

        },

        error => {

            console.error(
                "Shipment listener error:",
                error
            );

            const content =
                document.querySelector(
                    ".content"
                );

            if(content){

                content.innerHTML = `
                    <div class="error">
                        Unable to load shipment information.
                        Please try again later.
                    </div>
                `;
            }

        }
    );
}


/* =========================================================
   START
========================================================= */

const trackingCode =
    getTrackingCode();

loadShipment(
    trackingCode
);