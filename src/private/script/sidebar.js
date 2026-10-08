// Logica condivisa da TUTTE le pagine private, caricata tramite la sidebar:
// 1) menu hamburger su mobile, 2) email utente nella sidebar, 3) pulsante logout.
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. MENU HAMBURGER (mobile) ---
    const sidebar = document.querySelector('.sidebar');
    const dashboardMain = document.querySelector('.dashboard-main');

    if (sidebar && dashboardMain) {
        // Crea il pulsante hamburger
        const hamburger = document.createElement('button');
        hamburger.className = 'hamburger-btn';
        hamburger.innerHTML = '<span></span><span></span><span></span>';

        // Crea l'overlay scuro dietro la sidebar
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';

        // Inserisce il pulsante e l'overlay nel DOM
        dashboardMain.insertBefore(hamburger, dashboardMain.firstChild);
        document.body.appendChild(overlay);

        // Apre/chiude la sidebar al click dell'hamburger
        hamburger.addEventListener('click', () => {
            sidebar.classList.toggle('sidebar-open');
            overlay.classList.toggle('active');
        });

        // Chiude la sidebar cliccando sull'overlay
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('sidebar-open');
            overlay.classList.remove('active');
        });
    }

    // --- 2. EMAIL UTENTE NELLA SIDEBAR ---
    // Sostituisce "Loading..." con la vera email presa dal server (decodificata dal JWT)
    const userEmailDisplay = document.getElementById('user-email-display');
    if (userEmailDisplay) {
        fetch('/api/current-user-email')
            .then(response => {
                if (!response.ok) throw new Error();
                return response.json();
            })
            .then(data => {
                if (data.success && data.email) {
                    userEmailDisplay.textContent = data.email;
                }
            })
            .catch(() => {
                userEmailDisplay.textContent = 'Profile';
            });
    }

    // --- 3. PULSANTE LOGOUT ---
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
                .then(response => {
                    if (!response.ok) throw new Error();
                    window.location.href = '/index.html';
                })
                .catch(() => {
                    alert('Si è verificato un errore durante il logout, riprova.');
                });
        });
    }
});
