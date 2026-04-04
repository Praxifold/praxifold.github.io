const URL = "https://script.google.com/macros/s/AKfycbyUrd7So2mNiWLy-xGWiWqdTlSZKZFGHeK5ZQw24kGxMEU9D-rjN1QhcEQ-_Z6Fo7TIgQ/exec";
let user = null;

// Logic for Login/Signup/AI
async function api(action, data) {
    const r = await fetch(URL, { method: 'POST', body: JSON.stringify({ action, ...data }) });
    return await r.json();
}

async function handleLogin() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    const res = await api('login', { email, password: pass });
    if (res.success) {
        user = res.user;
        renderHome();
    } else alert(res.msg);
}

async function playVideo(vidUrl) {
    document.getElementById('loading').innerText = "Jungiamasi prie serverio, palaukite...";
    const res = await api('click', { email: user.email });
    if (res.success) {
        window.location.href = vidUrl; // Standard redirect for iOS
    } else {
        alert("Limitas išnaudotas arba klaida.");
        document.getElementById('loading').innerText = "";
    }
}

async function askAI() {
    const msg = document.getElementById('ai-msg').value;
    const res = await api('ai', { email: user.email, msg });
    if (res.success) {
        document.getElementById('ai-res').innerText = res.answer;
    } else alert(res.msg);
}

function renderHome() {
    document.getElementById('app').innerHTML = `
        <div class="glass">
            <h2>Mathexa</h2>
            <p id="loading"></p>
            <div id="video-list"></div>
            <hr>
            <button onclick="renderSettings()">Nustatymai</button>
        </div>
    `;
    loadVideos();
}

async function loadVideos() {
    const vids = await (await fetch('videos.json')).json();
    const list = document.getElementById('video-list');
    vids.forEach(v => {
        const div = document.createElement('div');
        div.className = 'v-card';
        div.innerHTML = `<b>${v.title}</b><br><small>${v.lang} | ${v.duration}</small>`;
        div.onclick = () => playVideo(v.url);
        list.appendChild(div);
    });
}
