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
   STATE
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
   CREATE SHIPMENT
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
   CLOSE MODAL
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


    setValue(
        "editStatus",
        shipment.status ||
        STATUS.PENDING
    );


    setValue(
        "editStatusMessage",
        shipment.statusMessage ||
        ""
    );


    setValue(
        "editOrigin",
        shipment.origin ||
        ""
    );


    setValue(
        "editDestination",
        shipment.destination ||
        ""
    );


    setValue(
        "editLocation",
        shipment.currentLocation ||
        ""
    );


    setValue(
        "editEstimatedDelivery",
        shipment.estimatedDelivery ||
        ""
    );


    setValue(
        "editDeliveryWindow",
        shipment.deliveryWindow ||
        ""
    );


    if(editModal){

        editModal.style.display =
            "flex";
    }
}


/* =========================================================
   FIRESTORE LISTENER
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
   SAVE SHIPMENT UPDATE
========================================================= */

if(saveUpdateBtn){

    saveUpdateBtn.addEventListener(
        "click",
        async () => {

            const status =
                getValue(
                    "editStatus"
                );

            const statusMessage =
                getValue(
                    "editStatusMessage"
                );

            const origin =
                getValue(
                    "editOrigin"
                );

            const destination =
                getValue(
                    "editDestination"
                );

            const location =
                getValue(
                    "editLocation"
                );

            const estimatedDelivery =
                getValue(
                    "editEstimatedDelivery"
                );

            const deliveryWindow =
                getValue(
                    "editDeliveryWindow"
                );


            /* -----------------------------------------
               VALIDATION
            ----------------------------------------- */

            if(
                !activeShipmentCode ||
                !status ||
                !location
            ){

                showToast(
                    "Status and location are required"
                );

                return;
            }


            /* -----------------------------------------
               DISABLE BUTTON
            ----------------------------------------- */

            saveUpdateBtn.disabled =
                true;

            saveUpdateBtn.textContent =
                "Saving...";


            try{

                const shipmentRef =
                    doc(
                        db,
                        "shipments",
                        activeShipmentCode
                    );


                /*
                 * Date.now() stores the exact current
                 * moment.
                 *
                 * The tracker converts this timestamp
                 * into U.S. Eastern Time.
                 */

                const timelineUpdate = {

                    status,

                    location,

                    createdAt:
                        Date.now()

                };


                await updateDoc(
                    shipmentRef,
                    {

                        status,

                        statusMessage,

                        origin,

                        destination,

                        currentLocation:
                            location,

                        estimatedDelivery,

                        deliveryWindow,

                        updatedAt:
                            serverTimestamp(),

                        timeline:
                            arrayUnion(
                                timelineUpdate
                            )

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
                    "Update failed:",
                    error
                );

                showToast(
                    "Update failed"
                );

            }finally{

                saveUpdateBtn.disabled =
                    false;

                saveUpdateBtn.textContent =
                    "Save Update";
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


            createShipmentBtn.disabled =
                true;

            createShipmentBtn.textContent =
                "Creating Shipment...";


            try{

                const trackingCode =
                    generateTrackingCode();


                /*
                 * First shipment history event.
                 */

                const initialTimeline = {

                    status:
                        STATUS.PENDING,

                    location,

                    createdAt:
                        Date.now()

                };


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


                await setDoc(
                    doc(
                        db,
                        "shipments",
                        trackingCode
                    ),
                    shipmentData
                );


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


function setValue(id,value){

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