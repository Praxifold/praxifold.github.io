const API_URL = "https://script.google.com/macros/s/AKfycbxSqOR0V0VzQMkdYrg1HxNLBnEwMuQ9SRdhe9IZBG35VT0ISR9lY6gG6NSdWoVv2Aoacg/exec"; // Pakeisti į Apps Script nuorodą

// Atmintyje laikoma sesija (Išsitrina po 'Refresh')
let currentUser = null; 
let videosData = [];

const app = {
    // --- Autentifikacija ---
    toggleAuth: () => {
        const loginBox = document.getElementById('login-box');
        const regBox = document.getElementById('register-box');
        loginBox.style.display = loginBox.style.display === 'none' ? 'block' : 'none';
        regBox.style.display = regBox.style.display === 'none' ? 'block' : 'none';
    },

    login: async () => {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        if(!email || !pass) return alert("Užpildykite visus laukus.");
        
        app.showLoading(true);
        try {
            const res = await app.apiCall({ action: 'login', email: email, password: pass, ip: '127.0.0.1' });
            if (res.code === 200) {
                currentUser = res.data;
                app.initDashboard();
            } else {
                alert("Klaida: " + res.message);
            }
        } catch(e) { app.handleCrash(e); }
        app.showLoading(false);
    },

    register: async () => {
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-password').value;
        
        app.showLoading(true);
        try {
            const res = await app.apiCall({ action: 'register', fullName: name, email: email, password: pass, cookiePref: 'essential', collectCrash: true, ip: '127.0.0.1', device: navigator.userAgent });
            if (res.code === 200) {
                alert("Registracija sėkminga! Dabar galite prisijungti.");
                app.toggleAuth();
            } else alert(res.message);
        } catch(e) { app.handleCrash(e); }
        app.showLoading(false);
    },

    logout: () => {
        currentUser = null;
        window.location.reload(); // Perkraunant puslapį užtikrinamas visiškas atsijungimas
    },

    // --- Aplikacijos logika ---
    initDashboard: async () => {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('app-section').style.display = 'block';
        document.getElementById('ui-support-id').innerText = currentUser.supportID;
        document.getElementById('ui-clicks').innerText = currentUser.clicks;
        
        // Užkraunam video failus
        const req = await fetch('videos.json');
        videosData = await req.json();
        app.renderVideos(videosData);
    },

    showTab: (tab) => {
        document.getElementById('tab-videos').style.display = tab === 'videos' ? 'block' : 'none';
        document.getElementById('tab-settings').style.display = tab === 'settings' ? 'block' : 'none';
    },

    // --- Vaizdo įrašų logika ---
    renderVideos: (videos) => {
        const container = document.getElementById('video-list');
        container.innerHTML = '';
        videos.forEach(v => {
            const card = document.createElement('div');
            card.className = 'card';
            // Vartotojas nuorodos ($link) nemato
            card.innerHTML = `
                <h3>${v.title}</h3>
                <p><strong>Tema:</strong> ${v.subject}</p>
                <p><strong>Trukmė:</strong> ${v.duration} min | <strong>Kalba:</strong> ${v.language}</p>
                <p style="font-size:12px; color:#aaa;">Platforma: ${v.platform}</p>
            `;
            card.onclick = () => app.playVideo(v);
            container.appendChild(card);
        });
    },

    searchVideos: () => {
        const query = document.getElementById('search-bar').value.toLowerCase();
        const filtered = videosData.filter(v => v.title.toLowerCase().includes(query) || v.subject.toLowerCase().includes(query));
        app.renderVideos(filtered);
    },

    playVideo: async (video) => {
        app.showLoading(true, "Prašome palaukti...");
        try {
            const res = await app.apiCall({ action: 'updateClicks', uid: currentUser.uid, videoId: video.id });
            if (res.code === 200) {
                currentUser.clicks = res.data.remainingClicks;
                document.getElementById('ui-clicks').innerText = currentUser.clicks;
                window.open(video.link, '_blank'); // Nukreipimas į vaizdo įrašą
            } else {
                alert(res.message);
            }
        } catch(e) { app.handleCrash(e); }
        app.showLoading(false);
    },

    // --- Nustatymai ---
    copySupportID: () => {
        navigator.clipboard.writeText(currentUser.supportID);
        alert("Support ID nukopijuotas!");
    },

    redeemCode: async () => {
        const code = document.getElementById('promo-code').value;
        if (!code) return;
        
        app.showLoading(true);
        const res = await app.apiCall({ action: 'redeemCode', uid: currentUser.uid, code: code });
        if (res.code === 200) alert("Kodas sėkmingai aktyvuotas! Galioja iki: " + res.data.newSubExp);
        else alert(res.message);
        app.showLoading(false);
    },

    deleteAccount: async () => {
        if(confirm("Ar tikrai norite suplanuoti paskyros ištrynimą?")) {
            const res = await app.apiCall({ action: 'deleteAccount', uid: currentUser.uid });
            if(res.code === 200) {
                alert("Paskyros ištrynimas suplanuotas po 1 mėnesio.");
                app.logout();
            }
        }
    },

    resetPassword: () => {
        document.getElementById('support-email-text').style.display = 'block';
    },

    // --- Pagalbinės funkcijos ---
    apiCall: async (payload) => {
        const req = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return await req.json();
    },

    showLoading: (show, text = "Kraunama...") => {
        const overlay = document.getElementById('loading-overlay');
        overlay.querySelector('h2').innerText = text;
        overlay.style.display = show ? 'flex' : 'none';
    },

    handleCrash: (error) => {
        console.error(error);
        app.apiCall({ action: 'logCrash', uid: currentUser?.uid, error: error.message, stack: error.stack, deviceInfo: navigator.userAgent });
        alert("Įvyko klaida. Sistemos administratoriai informuoti.");
    }
};

function acceptCookies(type) {
    document.getElementById('cookie-banner').style.display = 'none';
    // Realiame scenarijuje išsaugotume logiką local/session storage pagal poreikį, 
    // bet kadangi laikomės griežto "no-persistence", tiesiog paslepiame UI.
}
