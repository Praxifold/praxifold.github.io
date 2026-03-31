const API = "https://script.google.com/macros/s/AKfycbyy2NoPOH_mPIfzzE85uGKoysqMOmToBF_RvRYBNTUPx5U_OTxEIdwuHJFmBq45O6Vz/exec";

let VIDEOS_DB = [];
let CURRENT_CLICKS = 0;
let IS_INFINITY = false;
let SESSION_TOKEN = null;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btnLogin").onclick = () => show("login");
    document.getElementById("btnSignup").onclick = () => show("signup");
    document.getElementById("loginBtn").onclick = login;
    document.getElementById("signupBtn").onclick = signup;
    document.getElementById("btnRedeem").onclick = redeem;
    document.getElementById("logoutBtn").onclick = () => { localStorage.clear(); location.reload(); };

    // Password Match Logic
    const p2 = document.getElementById("password2"), p3 = document.getElementById("password3");
    const vm = document.getElementById("valMatch"), vl = document.getElementById("valLen");
    const check = () => {
        vl.style.color = p2.value.length >= 8 ? "#4dff88" : "#ff4d4d";
        if (!p3.value) { vm.innerText = ""; }
        else if (p2.value === p3.value) { vm.innerText = "Sutampa"; vm.style.color = "#4dff88"; }
        else { vm.innerText = "Nesutampa"; vm.style.color = "#ff4d4d"; }
    };
    p2.oninput = check; p3.oninput = check;

    document.getElementById("searchInput").oninput = renderVideos;
    document.getElementById("langFilter").onchange = renderVideos;
});

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

async function login() {
    toggleWait(true);
    const email = document.getElementById("email").value, password = document.getElementById("password").value;
    try {
        const res = await fetch(API, { method:"POST", body: JSON.stringify({ action:"login", email, password })});
        const d = await res.json();
        if(d.success) {
            SESSION_TOKEN = d.token;
            updateUI(d.clicks_remaining, d.expiry, d.support_id);
            loadVideos();
        } else if (d.error === "DELETION_PENDING") {
            if(confirm("Paskyra suplanuota ištrynimui. Ar norite ją reaktyvuoti?")) reactivate(email, password);
        } else alert(d.error);
    } catch(e) { alert("Serverio klaida."); }
    toggleWait(false);
}

async function reactivate(email, password) {
    toggleWait(true);
    const res = await fetch(API, { method:"POST", body: JSON.stringify({ action:"accountAction", actionType: "reactivate", email, password })});
    const d = await res.json();
    if(d.success) { alert("Paskyra reaktyvuota! Prisijunkite."); location.reload(); }
    else alert(d.error);
    toggleWait(false);
}

async function loadVideos() {
    show("app");
    try {
        const res = await fetch('videos.json');
        VIDEOS_DB = await res.json();
        renderVideos();
    } catch(e) { console.error("Could not load videos.json"); }
}

function renderVideos() {
    const grid = document.getElementById("videos");
    const q = document.getElementById("searchInput").value.toLowerCase();
    const lang = document.getElementById("langFilter").value;
    grid.innerHTML = "";

    VIDEOS_DB.filter(v => 
        v.title.toLowerCase().includes(q) && (lang === 'all' || v.language === lang)
    ).forEach(v => {
        const card = document.createElement("div");
        card.className = "video-card";
        card.innerHTML = `
            <div class="v-badge">${v.language.toUpperCase()} • ${formatTime(v.length)}</div>
            <h3>${v.title}</h3>
            <div class="v-footer"><span>${v.category}</span><button>Žiūrėti</button></div>
        `;
        card.onclick = () => {
            if (IS_INFINITY || CURRENT_CLICKS > 0) {
                window.open(v.url, "_blank");
                fetch(API, { method:"POST", body: JSON.stringify({ action:"watch", token: SESSION_TOKEN })});
                if(!IS_INFINITY) updateUI(CURRENT_CLICKS - 1, null, null);
            } else alert("Baigėsi peržiūros.");
        };
        grid.appendChild(card);
    });
}

function updateUI(c, e, id) {
    CURRENT_CLICKS = c;
    IS_INFINITY = e && new Date(e) > new Date();
    document.getElementById("headerClicks").innerText = IS_INFINITY ? "∞" : "Liko: " + c;
    document.getElementById("clicksInfo").innerText = IS_INFINITY ? "∞" : c;
    if(id) document.getElementById("idText").innerText = "ID: " + id;
}

async function signup() {
    const p2 = document.getElementById("password2").value;
    if(p2 !== document.getElementById("password3").value) return alert("Nesutampa slaptažodžiai.");
    toggleWait(true);
    const res = await fetch(API, { method:"POST", body: JSON.stringify({ 
        action:"signup", 
        full_name: document.getElementById("name").value,
        email: document.getElementById("email2").value,
        password: p2,
        role: document.getElementById("role").value
    })});
    const d = await res.json();
    if(d.success) { alert("Sukurta! Galite prisijungti."); show("login"); }
    else alert(d.error);
    toggleWait(false);
}

async function redeem() {
    const code = document.getElementById("subCode").value;
    toggleWait(true);
    const res = await fetch(API, { method:"POST", body: JSON.stringify({ action:"redeemCode", token: SESSION_TOKEN, code })});
    const d = await res.json();
    if(d.success) { alert("Kodas priimtas!"); location.reload(); }
    else alert(d.error);
    toggleWait(false);
}

async function confirmDeletion() {
    toggleWait(true);
    const res = await fetch(API, { method:"POST", body: JSON.stringify({ 
        action:"accountAction", 
        actionType: "requestDeletion", 
        email: document.getElementById("delEmail").value, 
        password: document.getElementById("delPass").value 
    })});
    const d = await res.json();
    if(d.success) { alert("Paskyra sėkmingai suplanuota ištrynimui."); location.reload(); }
    else alert(d.error);
    toggleWait(false);
}

function toggleWait(show) { document.getElementById("waitOverlay").classList.toggle("hidden", !show); }
function show(id) { 
    ["landing","login","signup","app","settings"].forEach(div => document.getElementById(div).classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
    window.scrollTo(0,0);
}
function back() { show("landing"); }
function copySupportId() { 
    navigator.clipboard.writeText(document.getElementById("idText").innerText.replace("ID: ",""));
    alert("Nukopijuota!");
}
function openDeleteModal() { document.getElementById("deleteModal").classList.remove("hidden"); }
