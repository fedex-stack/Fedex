import { db, serverTimestamp } from "./firebase.js";
import { protectAdminPage, logoutAdmin } from "./auth.js";
import {
    generateTrackingCode,
    copyText,
    showToast
} from "./utils.js";
import { STATUS } from "./config.js";

import {
    collection,
    doc,
    setDoc,
    onSnapshot,
    updateDoc,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


/* =========================================================
   ADMIN PROTECTION
========================================================= */

protectAdminPage();


/* =========================================================
   GLOBAL STATE
========================================================= */

let activeShipmentCode = null;
let allShipments = [];


/* =========================================================
   DASHBOARD ELEMENTS
========================================================= */

const logoutBtn =
    document.getElementById("logoutBtn");

const createBtn =
    document.getElementById("createBtn");

const shipmentsContainer =
    document.getElementById("shipmentsContainer");

const searchInput =
    document.getElementById("searchInput");


/* =========================================================
   EDIT MODAL
========================================================= */

const editModal =
    document.getElementById("editModal");

const closeModalBtn =
    document.getElementById("closeModalBtn");

const saveUpdateBtn =
    document.getElementById("saveUpdateBtn");


/* =========================================================
   LOGOUT
========================================================= */

if(logoutBtn){

    logoutBtn.addEventListener(
        "click",
        logoutAdmin
    );
}


/* =========================================================
   CREATE SHIPMENT PAGE
========================================================= */

if(createBtn){

    createBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "create-shipment.html";

        }
    );
}


/* =========================================================
   CLOSE EDIT MODAL
========================================================= */

if(closeModalBtn){

    closeModalBtn.addEventListener(
        "click",
        () => {

            if(editModal){
                editModal.style.display = "none";
            }

        }
    );
}


/* =========================================================
   RENDER SHIPMENTS
========================================================= */

function renderShipments(list){

    if(!shipmentsContainer){
        return;
    }

    shipmentsContainer.innerHTML = "";


    if(!list.length){

        shipmentsContainer.innerHTML =
            "<div id='emptyState'>No shipments found</div>";

        return;
    }


    list.forEach((shipment) => {

        const card =
            document.createElement("div");

        card.className =
            "shipment-card";


        card.innerHTML = `

            <h3>
                ${escapeHTML(
                    shipment.trackingCode
                )}
            </h3>

            <p>
                Status:
                ${escapeHTML(
                    shipment.status || "Pending"
                )}
            </p>

            <p>
                Location:
                ${escapeHTML(
                    shipment.currentLocation || "—"
                )}
            </p>

            <div class="card-actions">

                <button class="edit-btn">
                    Edit
                </button>

                <button class="copy-btn">
                    Copy Code
                </button>

            </div>
        `;


        const copyBtn =
            card.querySelector(".copy-btn");

        const editBtn =
            card.querySelector(".edit-btn");


        if(copyBtn){

            copyBtn.addEventListener(
                "click",
                () => {

                    copyText(
                        shipment.trackingCode
                    );

                    showToast(
                        "Tracking code copied"
                    );

                }
            );
        }


        if(editBtn){

            editBtn.addEventListener(
                "click",
                () => {

                    openEditShipment(
                        shipment
                    );

                }
            );
        }


        shipmentsContainer.appendChild(card);

    });
}


/* =========================================================
   OPEN EDIT SHIPMENT
========================================================= */

function openEditShipment(shipment){

    activeShipmentCode =
        shipment.trackingCode;


    const editStatus =
        document.getElementById(
            "editStatus"
        );

    const editLocation =
        document.getElementById(
            "editLocation"
        );


    if(editStatus){

        editStatus.value =
            shipment.status || STATUS.PENDING;
    }


    if(editLocation){

        editLocation.value =
            shipment.currentLocation || "";
    }


    /*
       These fields are optional for now.

       Once the Edit Shipment modal is expanded,
       the same IDs will automatically be used.
    */

    setOptionalValue(
        "editOrigin",
        shipment.origin
    );

    setOptionalValue(
        "editDestination",
        shipment.destination
    );

    setOptionalValue(
        "editStatusMessage",
        shipment.statusMessage
    );

    setOptionalValue(
        "editEstimatedDelivery",
        shipment.estimatedDelivery
    );

    setOptionalValue(
        "editDeliveryWindow",
        shipment.deliveryWindow
    );


    if(editModal){

        editModal.style.display =
            "flex";
    }
}


/* =========================================================
   FIRESTORE SHIPMENT LISTENER
========================================================= */

if(shipmentsContainer){

    onSnapshot(
        collection(db,"shipments"),

        (snapshot) => {

            allShipments = [];

            snapshot.forEach(
                (docSnap) => {

                    allShipments.push(
                        docSnap.data()
                    );

                }
            );

            renderShipments(
                allShipments
            );

        },

        (error) => {

            console.error(
                "Shipment listener error:",
                error
            );

            showToast(
                "Unable to load shipments"
            );

        }
    );
}


/* =========================================================
   SEARCH
========================================================= */

if(searchInput){

    searchInput.addEventListener(
        "input",
        () => {

            const keyword =
                searchInput.value
                    .trim()
                    .toUpperCase();


            const filtered =
                allShipments.filter(
                    shipment => {

                        const code =
                            String(
                                shipment.trackingCode || ""
                            ).toUpperCase();

                        const sender =
                            String(
                                shipment.sender || ""
                            ).toUpperCase();

                        const receiver =
                            String(
                                shipment.receiver || ""
                            ).toUpperCase();

                        return (
                            code.includes(keyword) ||
                            sender.includes(keyword) ||
                            receiver.includes(keyword)
                        );

                    }
                );


            renderShipments(
                filtered
            );

        }
    );
}


/* =========================================================
   EDIT / UPDATE SHIPMENT
========================================================= */

if(saveUpdateBtn){

    saveUpdateBtn.addEventListener(
        "click",
        async () => {

            const statusElement =
                document.getElementById(
                    "editStatus"
                );

            const locationElement =
                document.getElementById(
                    "editLocation"
                );


            const status =
                statusElement
                    ? statusElement.value
                    : STATUS.PENDING;


            const location =
                locationElement
                    ? locationElement.value.trim()
                    : "";


            if(
                !activeShipmentCode ||
                !location
            ){

                showToast(
                    "Missing update data"
                );

                return;
            }


            try{

                const shipmentRef =
                    doc(
                        db,
                        "shipments",
                        activeShipmentCode
                    );


                /*
                   Every Admin update becomes
                   a new shipment-history event.

                   Date.now() records the actual
                   moment of the update.

                   track.js converts this timestamp
                   to U.S. Eastern Time.
                */

                await updateDoc(
                    shipmentRef,
                    {

                        status,

                        currentLocation:
                            location,

                        updatedAt:
                            serverTimestamp(),

                        timeline:
                            arrayUnion({

                                status,

                                location,

                                createdAt:
                                    Date.now()

                            })

                    }
                );


                showToast(
                    "Shipment updated"
                );


                if(editModal){

                    editModal.style.display =
                        "none";
                }


            }catch(error){

                console.error(
                    error
                );

                showToast(
                    "Update failed"
                );

            }

        }
    );
}


/* =========================================================
   CREATE SHIPMENT
========================================================= */

const createShipmentBtn =
    document.getElementById(
        "createShipmentBtn"
    );


if(createShipmentBtn){

    createShipmentBtn.addEventListener(
        "click",
        async () => {


            /* -----------------------------------------
               READ FORM
            ----------------------------------------- */

            const sender =
                getValue("sender");

            const receiver =
                getValue("receiver");

            const origin =
                getValue("origin");

            const destination =
                getValue("destination");

            const location =
                getValue("location");

            const estimatedDelivery =
                getValue(
                    "estimatedDelivery"
                );

            const deliveryWindow =
                getValue(
                    "deliveryWindow"
                );

            const statusMessage =
                getValue(
                    "statusMessage"
                );

            const shipmentType =
                getValue(
                    "shipmentType"
                );

            const weight =
                getValue("weight");


            /* -----------------------------------------
               VALIDATION
            ----------------------------------------- */

            if(
                !sender ||
                !receiver ||
                !origin ||
                !destination ||
                !location ||
                !estimatedDelivery ||
                !deliveryWindow ||
                !shipmentType ||
                !weight
            ){

                showToast(
                    "Please fill all required fields"
                );

                return;
            }


            /* -----------------------------------------
               DISABLE BUTTON
            ----------------------------------------- */

            createShipmentBtn.disabled =
                true;

            createShipmentBtn.textContent =
                "Creating Shipment...";


            try{

                /* -------------------------------------
                   GENERATE TRACKING CODE
                ------------------------------------- */

                const trackingCode =
                    generateTrackingCode();


                /* -------------------------------------
                   INITIAL TIMELINE EVENT
                ------------------------------------- */

                const initialTimeline = {

                    status:
                        STATUS.PENDING,

                    location,

                    createdAt:
                        Date.now()

                };


                /* -------------------------------------
                   SHIPMENT DATA
                ------------------------------------- */

                const shipmentData = {

                    trackingCode,

                    sender,

                    receiver,

                    origin,

                    destination,

                    currentLocation:
                        location,

                    estimatedDelivery,

                    deliveryWindow,

                    status:
                        STATUS.PENDING,

                    statusMessage:
                        statusMessage || "",

                    shipmentType,

                    weight,

                    createdAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp(),

                    timeline: [
                        initialTimeline
                    ]

                };


                /* -------------------------------------
                   SAVE TO FIRESTORE
                ------------------------------------- */

                await setDoc(
                    doc(
                        db,
                        "shipments",
                        trackingCode
                    ),
                    shipmentData
                );


                /* -------------------------------------
                   SUCCESS
                ------------------------------------- */

                showToast(
                    "Shipment created"
                );


                setTimeout(
                    () => {

                        window.location.href =
                            "admin.html";

                    },
                    1000
                );


            }catch(error){

                console.error(
                    "Creation failed:",
                    error
                );

                showToast(
                    "Creation failed"
                );


                createShipmentBtn.disabled =
                    false;

                createShipmentBtn.textContent =
                    "Create Shipment";
            }

        }
    );
}


/* =========================================================
   HELPERS
========================================================= */

function getValue(id){

    const element =
        document.getElementById(id);

    if(!element){
        return "";
    }

    return element.value.trim();
}


function setOptionalValue(
    id,
    value
){

    const element =
        document.getElementById(id);

    if(element){

        element.value =
            value || "";
    }
}


function escapeHTML(value){

    if(
        value === null ||
        value === undefined
    ){

        return "";
    }

    return String(value)

        .replace(/&/g,"&amp;")

        .replace(/</g,"&lt;")

        .replace(/>/g,"&gt;")

        .replace(/"/g,"&quot;")

        .replace(/'/g,"&#039;");
}