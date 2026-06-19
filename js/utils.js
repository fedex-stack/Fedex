export function normalizeTrackingCode(code) {
    if (!code) return "";
    return code.trim().toUpperCase();
}

export function generateTrackingCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let random = "";

    for (let i = 0; i < 8; i++) {
        random += chars[Math.floor(Math.random() * chars.length)];
    }

    return `TRK-LAG-${random}`;
}

export function formatDate(value) {
    if (!value) return "N/A";

    if (typeof value.toDate === "function") {
        return value.toDate().toLocaleString();
    }

    return new Date(value).toLocaleString();
}

export function showToast(message) {
    let toast = document.getElementById("toast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";

        toast.style.position = "fixed";
        toast.style.bottom = "20px";
        toast.style.right = "20px";
        toast.style.background = "#171a21";
        toast.style.color = "white";
        toast.style.padding = "16px 20px";
        toast.style.borderRadius = "12px";
        toast.style.zIndex = "99999";
        toast.style.boxShadow = "0 4px 20px rgba(0,0,0,0.4)";

        document.body.appendChild(toast);
    }

    toast.innerText = message;
    toast.style.display = "block";

    setTimeout(() => {
        toast.style.display = "none";
    }, 3000);
}

export function copyText(text) {
    if (!navigator.clipboard) {
        prompt("Copy this:", text);
        return;
    }

    navigator.clipboard.writeText(text);
}
