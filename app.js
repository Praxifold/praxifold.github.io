const API = "https://script.google.com/macros/s/AKfycbyxAhlBoCDwSQ2xKPnKlN7IS0-wGxrnxKfMfjwyNhZ8Ixd9v8MotRc8tKt0MLhsloaqJQ/exec";

let VIDEOS_DB = [];
let CURRENT_CLICKS = 0;
let IS_INFINITY = false;
let renderTimer;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btnLogin").onclick = () => show("login");
    document.getElementById("btnSignup").onclick = () => show("signup");
    document.getElementById("loginBtn").onclick = login;
    document.getElementById("signupBtn").onclick = signup;
    document.getElementById("btnRedeem").onclick = redeem;
    document.getElementById("settingsBtn").onclick = () => show("settings");
    document.getElementById("closeSettings").onclick = () => show("app");
    document.getElementById("logoutBtn").onclick = () => { localStorage.clear(); location.reload(); };
    
    // Fixed Password Validation
    const p2 = document.getElementById("password2"), p3 = document.getElementById("password3");
    const checkMatch = () => {
        const valLen = document.getElementById("valLen"), valMatch = document.getElementById("valMatch");
        valLen.style.color = p2.value.length >= 8 ? "#4dff88" : "#ff4d4d";
        if (p3.value === "") { 
            valMatch.innerText = "Pakartokite"; valMatch.style.color = "rgba(255,255,255,0.5)"; 
        } else if (p2.value === p3.value) { 
            valMatch.innerText = "Sutampa"; valMatch.style.color = "#4dff88"; 
        } else { 
            valMatch.innerText = "Nesutampa"; valMatch.style.color = "#ff4d4d"; 
        }
    };
    p2.oninput = checkMatch; p3.oninput = checkMatch;

    document.getElementById("searchInput").oninput = () => {
        clearTimeout(renderTimer);
        renderTimer = setTimeout(renderVideos, 300); // 300ms delay to prevent freeze
    };
    document.getElementById("langFilter").onchange = renderVideos;

    checkSession();
});

async function checkSession() {
    const stay = localStorage.getItem('mathexa_stay') === 'true';
    const s = JSON.parse(localStorage.getItem('mathexa_session'));
    if (stay && s?.token) {
        document.getElementById("loadingBanner").classList.remove("hidden");
        try {
            const res = await fetch(API, { method:"POST", body: JSON.stringify({ action:"login", token: s.token })});
            const d = await res.json();
            if (d.success) {
                localStorage.setItem('mathexa_session', JSON.stringify({ token: d.token }));
                updateUI(d.clicks_remaining, d.expiry, d.support_id);
                showApp();
            } else { show("landing"); }
        } catch(e) { show("landing"); }
        finally { document.getElementById("loadingBanner").classList.add("hidden"); }
    } else { show("landing"); }
}

async function showApp() {
    show("app");
    if (VIDEOS_DB.length === 0) {
        try {
            const res = await fetch('videos.json');
            VIDEOS_DB = await res.json();
        } catch(e) { return; }
    }
    renderVideos();
}

function renderVideos() {
    const grid = document.getElementById("videos");
    const q = document.getElementById("searchInput").value.toLowerCase();
    const l = document.getElementById("langFilter").value;
    const fragment = document.createDocumentFragment(); // Faster rendering

    const filtered = VIDEOS_DB.filter(v => v.title.toLowerCase().includes(q) && (l === 'all' || v.lang === l));
    
    filtered.forEach(v => {
        const div = document.createElement("div");
        div.className = "video-card";
        div.innerHTML = `<div class="v-meta">${v.platform}</div><h3>${v.title}</h3><div class="v-footer"><span class="v-tag">Žiūrėti</span></div>`;
        div.onclick = () => {
            if (IS_INFINITY || CURRENT_CLICKS > 0) {
                window.open(v.url, "_blank");
                const s = JSON.parse(localStorage.getItem('mathexa_session'));
                fetch(API, { method:"POST", body: JSON.stringify({ action:"watch", token: s.token })});
                if (!IS_INFINITY) updateUI(CURRENT_CLICKS - 1, null, null);
            } else alert("Baigėsi peržiūros.");
        };
        fragment.appendChild(div);
    });
    grid.innerHTML = "";
    grid.appendChild(fragment);
}

function updateUI(c, e, id) {
    CURRENT_CLICKS = c;
    const exp = e ? new Date(e) : null;
    IS_INFINITY = exp && exp > new Date();
    document.getElementById("headerClicks").innerText = IS_INFINITY ? "∞" : "Liko: " + c;
    document.getElementById("clicksInfo").innerText = IS_INFINITY ? "∞" : c;
    if(id) document.getElementById("idText").innerText = "ID: " + id;
}

async function login() {
    const btn = document.getElementById("loginBtn");
    btn.disabled = true; btn.innerText = "Jungiamasi...";
    const email = document.getElementById("email").value, password = document.getElementById("password").value;
    try {
        const res = await fetch(API, { method:"POST", body: JSON.stringify({ action:"login", email, password })});
        const d = await res.json();
        if(d.success) {
            localStorage.setItem('mathexa_session', JSON.stringify({ token: d.token }));
            updateUI(d.clicks_remaining, d.expiry, d.support_id);
            showApp();
        } else if (d.error === "DELETION_PENDING") {
            if(confirm("Paskyra naikinama. Reaktyvuoti?")) reactivate(d.email, password);
        } else alert(d.error);
    } catch(e) { alert("Ryšio klaida."); }
    btn.disabled = false; btn.innerText = "Eiti";
}

async function signup() {
    const p2 = document.getElementById("password2").value, p3 = document.getElementById("password3").value;
    const name = document.getElementById("name").value, email = document.getElementById("email2").value;
    if(!name || !email || p2.length < 8) { alert("Užpildykite viską (Slaptažodis 8+)"); return; }
    if(p2 !== p3) { alert("Slaptažodžiai nesutampa!"); return; }
    const res = await fetch(API, { method:"POST", body: JSON.stringify({ action:"signup", full_name: name, email, password: p2, role: document.getElementById("role").value })});
    const d = await res.json();
    if(d.success) { alert("Sukurta!"); show("login"); } else alert(d.error);
}

async function redeem() {
    const code = document.getElementById("subCode").value;
    const s = JSON.parse(localStorage.getItem('mathexa_session'));
    const res = await fetch(API, { method:"POST", body: JSON.stringify({ action:"redeemCode", token: s.token, code })});
    const d = await res.json();
    if(d.success) { alert("Aktyvuota!"); location.reload(); } else alert(d.error);
}

function copySupportId() { navigator.clipboard.writeText(document.getElementById("idText").innerText.replace("ID: ", "")); alert("Nukopijuota!"); }
function show(id) { 
    ["landing","login","signup","app","settings"].forEach(d => document.getElementById(d)?.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
    window.scrollTo(0,0);
}
function back() { show("landing"); }
function openDeleteModal() { document.getElementById('deleteModal').classList.remove('hidden'); }
async function confirmDeletion() {
    const res = await fetch(API, { method:"POST", body: JSON.stringify({ action:"accountAction", actionType: "requestDeletion", email: document.getElementById("delEmail").value, password: document.getElementById("delPass").value })});
    const d = await res.json();
    if(d.success) { alert(d.message); localStorage.clear(); location.reload(); } else alert(d.error);
}
