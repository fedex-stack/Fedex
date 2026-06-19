import { normalizeTrackingCode, showToast } from "./utils.js";

window.trackShipment = function () {
    const input = document.getElementById("trackingInput");

    if (!input) return;

    const code = normalizeTrackingCode(input.value);

    if (!code) {
        showToast("Please enter a tracking number");
        return;
    }

    window.location.href = `track.html?code=${encodeURIComponent(code)}`;
};

const input = document.getElementById("trackingInput");

if (input) {
    input.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            trackShipment();
        }
    });
}
