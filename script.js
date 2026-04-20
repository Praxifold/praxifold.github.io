const GAS_URL = "https://script.google.com/macros/s/AKfycbz-CyY-_WhbUr6Oq7Til8cxu5uy3nNzSZ7V-WVY8HMRc2Dx_FVwxZK6SFO1ax62JaCjJw/exec";
let user = { clicks: 0, sid: "", sub: false };
let currentTab = 'videos';

async function auth(type) {
    const email = document.getElementById(type === 'login' ? 'l-email' : 'r-email').value;
    const pass = document.getElementById(type === 'login' ? 'l-pass' : 'r-pass').value;
    const role = document.getElementById('r-role').value;
    const ipRes = await fetch('https://api.ipify.org?format=json');
    const { ip } = await ipRes.json();

    document.getElementById('msg').innerText = "Jungiamasi...";
    
    const res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: type, email, password: pass, role, ip, device: navigator.userAgent })
    });
    const data = await res.json();

    if (data.success) {
        user.clicks = data.clicks;
        user.sid = data.supportId;
        user.sub = data.subExp && new Date(data.subExp) > new Date();
        ui('main');
        render();
    } else {
        document.getElementById('msg').innerText = data.error;
    }
}

function vPass() {
    const p1 = document.getElementById('r-pass').value;
    const p2 = document.getElementById('r-pass2').value;
    const pol = document.getElementById('r-pol').checked;
    document.getElementById('r-btn').disabled = !(p1.length >= 8 && p1 === p2 && pol);
}

function ui(screen) {
    document.getElementById('auth-box').style.display = screen === 'auth' ? 'block' : 'none';
    document.getElementById('main-app').style.display = screen === 'main' ? 'block' : 'none';
    document.getElementById('settings').style.display = screen === 'settings' ? 'block' : 'none';
    document.getElementById('set-btn').style.display = screen !== 'auth' ? 'block' : 'none';
    if(screen === 'main') {
        document.getElementById('c-count').innerText = user.sub ? "Begalė" : user.clicks;
        document.getElementById('s-id').innerText = user.sid;
    }
}

async function render() {
    const q = document.getElementById('q').value.toLowerCase();
    const res = await fetch(`data/${currentTab}.json`);
    const data = await res.json();
    const grid = document.getElementById('grid');
    grid.innerHTML = "";

    data.filter(i => i.title.toLowerCase().includes(q)).forEach(i => {
        const div = document.createElement('div');
        div.className = "item";
        div.innerHTML = `<h4>${i.title}</h4><small>${i.subject} | ${i.duration || ''}</small>`;
        div.onclick = () => {
            if (!user.sub && user.clicks <= 0) return alert("Baigėsi paspaudimai!");
            if (!user.sub) user.clicks--;
            document.getElementById('c-count').innerText = user.sub ? "Begalė" : user.clicks;
            window.open(i.url, '_blank');
        };
        grid.appendChild(div);
    });
}

function tab(t) { currentTab = t; render(); }
function toggleAuth() {
    const l = document.getElementById('login-form'), r = document.getElementById('reg-form');
    l.style.display = l.style.display === 'none' ? 'block' : 'none';
    r.style.display = r.style.display === 'none' ? 'block' : 'none';
}
function copySid() { navigator.clipboard.writeText(user.sid); alert("Nukopijuota!"); }
function delAcc() { if(confirm("Ar tikrai?")) location.reload(); }
