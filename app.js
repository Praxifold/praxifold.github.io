const API = "https://script.google.com/macros/s/AKfycbzecv7dpXYU3dAN2_s7uybsMtS4gpAeOKhMizL_v1Bk9w8ChBD2GOd-66IUYxuTnHZRVQ/exec"; // PASTE YOUR URL HERE

let VIDEOS_DB = [];
let notificationsDB = [];
let CURRENT_CLICKS = 0;
let IS_INFINITY = false;

document.addEventListener("DOMContentLoaded", () => {
    // UI Triggers
    document.getElementById("btnLogin").onclick = () => show("login");
    document.getElementById("btnSignup").onclick = () => show("signup");
    document.getElementById("loginBtn").onclick = login;
    document.getElementById("signupBtn").onclick = signup;
    document.getElementById("btnRedeem").onclick = redeem;
    document.getElementById("settingsBtn").onclick = () => show("settings");
    document.getElementById("closeSettings").onclick = () => show("app");
    document.getElementById("logoutBtn").onclick = () => { localStorage.clear(); location.reload(); };
    
    // Real-time Password Feedback
    const p2 = document.getElementById("password2");
    const p3 = document.getElementById("password3");
    p2.oninput = () => {
        const tag = document.getElementById("valLen");
        tag.style.color = p2.value.length >= 8 ? "#4dff88" : "#ff4d4d";
        checkMatch();
    };
    p3.oninput = checkMatch;

    function checkMatch() {
        const tag = document.getElementById("valMatch");
        if(p3.value === "") { tag.innerText = "Nesutampa"; tag.style.color = "#ff4d4d"; return; }
        const match = p2.value === p3.value;
        tag.innerText = match ? "Sutampa" : "Nesutampa";
        tag.style.color = match ? "#4dff88" : "#ff4d4d";
    }

    const stayToggle = document.getElementById("stayLogged");
    stayToggle.onchange = () => localStorage.setItem('mathexa_stay', stayToggle.checked);
    stayToggle.checked = localStorage.getItem('mathexa_stay') === 'true';

    fetchNotifications();
    checkSession();
});

async function checkSession() {
    const stay = localStorage.getItem('mathexa_stay') === 'true';
    const session = JSON.parse(localStorage.getItem('mathexa_session'));

    if (stay && session?.token) {
        document.getElementById("loadingBanner").classList.remove("hidden");
        try {
            const res = await fetch(API, { method:"POST", body: JSON.stringify({ action:"login", token: session.token })});
            const d = await res.json();
            if (d.success) {
                localStorage.setItem('mathexa_session', JSON.stringify({ token: d.token }));
                updateUI(d.clicks_remaining, d.expiry, d.support_id);
                showApp();
            } else { show("landing"); }
        } catch(e) { show("landing"); }
        finally { document.getElementById("loadingBanner").classList.add("hidden"); }
    } else {
        show("landing");
    }
}

async function showApp() {
    show("app");
    const grid = document.getElementById("videos");
    if (VIDEOS_DB.length === 0) {
        try {
            const res = await fetch('videos.json');
            VIDEOS_DB = await res.json();
        } catch(e) { grid.innerHTML = "Klaida užkraunant."; return; }
    }
    renderVideos();
}

function renderVideos() {
    const grid = document.getElementById("videos");
    const q = document.getElementById("searchInput").value.toLowerCase();
    grid.innerHTML = "";
    VIDEOS_DB.filter(v => v.title.toLowerCase().includes(q)).forEach(v => {
        const div = document.createElement("div");
        div.className = "video-card";
        div.innerHTML = `<h3>${v.title}</h3><div class="v-footer"><span class="v-tag">Žiūrėti</span></div>`;
        div.onclick = () => openVideo(v);
        grid.appendChild(div);
    });
}

async function openVideo(v) {
    if (IS_INFINITY || CURRENT_CLICKS > 0) {
        // Instant open for PC/Background sync
        window.open(v.url, "_blank");
        
        // Background update (PC only logic or non-blocking)
        const session = JSON.parse(localStorage.getItem('mathexa_session'));
        fetch(API, { method:"POST", body: JSON.stringify({ action:"watch", token: session.token })})
            .then(r => r.json())
            .then(d => { if(!IS_INFINITY) updateUI(CURRENT_CLICKS - 1, null, null); });
    } else {
        alert("Neturite peržiūrų.");
    }
}

function updateUI(c, e, id) {
    CURRENT_CLICKS = c;
    const now = new Date();
    const exp = e ? new Date(e) : null;
    IS_INFINITY = exp && exp > now;

    document.getElementById("headerClicks").innerText = IS_INFINITY ? "∞" : "Liko: " + c;
    document.getElementById("clicksInfo").innerText = IS_INFINITY ? "∞" : c;
    if(id) document.getElementById("idText").innerText = "ID: " + id;
}

async function login() {
    const btn = document.getElementById("loginBtn");
    btn.disabled = true;
    const email = document.getElementById("email").value, password = document.getElementById("password").value;
    
    try {
        const res = await fetch(API, { method:"POST", body: JSON.stringify({ action:"login", email, password })});
        const d = await res.json();
        
        if(d.success) {
            localStorage.setItem('mathexa_session', JSON.stringify({ token: d.token }));
            updateUI(d.clicks_remaining, d.expiry, d.support_id);
            showApp();
        } else if (d.error === "DELETION_PENDING") {
            if(confirm("Ši paskyra suplanuota ištrynimui. Ar norite ją reaktyvuoti?")) {
                reactivate(d.email, password);
            }
        } else {
            alert(d.error);
        }
    } catch(e) { alert("Ryšio klaida."); }
    btn.disabled = false;
}

async function reactivate(email, password) {
    const res = await fetch(API, { method:"POST", body: JSON.stringify({ action:"accountAction", actionType: "reactivate", email, password })});
    const d = await res.json();
    if(d.success) { alert("Paskyra reaktyvuota! Prašome prisijungti iš naujo."); location.reload(); }
    else alert(d.error);
}

function copySupportId() {
    const text = document.getElementById("idText").innerText.replace("ID: ", "");
    navigator.clipboard.writeText(text);
    alert("Nukopijuota!");
}

function openDeleteModal() { document.getElementById("deleteModal").classList.remove("hidden"); }

async function confirmDeletion() {
    const email = document.getElementById("delEmail").value;
    const password = document.getElementById("delPass").value;
    const res = await fetch(API, { method:"POST", body: JSON.stringify({ action:"accountAction", actionType: "requestDeletion", email, password })});
    const d = await res.json();
    if(d.success) { alert(d.message); localStorage.clear(); location.reload(); }
    else alert(d.error);
}

function show(id) {
    ["landing","login","signup","app","settings"].forEach(d => document.getElementById(d)?.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
}

function back() { show("landing"); }
