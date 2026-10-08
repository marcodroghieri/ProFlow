document.addEventListener("DOMContentLoaded", () => {
    const bookingUrlInput = document.getElementById("booking-url-input");
    const btnCopyLink = document.getElementById("btn-copy-link");

    // Email sidebar e logout sono gestiti da sidebar.js (condiviso su tutte le pagine private).
    // Qui ci serve l'email solo per costruire il link di prenotazione personale.
    fetch('/api/current-user-email')
        .then(response => {
            if (!response.ok) throw new Error("User unauthorized");
            return response.json();
        })
        .then(data => {
            if (data.success && data.email) {
                // Componiamo il link con l'email reale restituita dal JWT
                const publicUrl = `${window.location.origin}/book.html?freelanceEmail=${data.email}`;
                if (bookingUrlInput) {
                    bookingUrlInput.value = publicUrl;
                }
            }
        })
        .catch(error => {
            console.error("Errore durante la generazione del link:", error);
            if (bookingUrlInput) {
                bookingUrlInput.value = "Error generating link.";
            }
        });

    // Gestione del pulsante copia link
    if (btnCopyLink && bookingUrlInput) {
        btnCopyLink.addEventListener("click", () => {
            navigator.clipboard.writeText(bookingUrlInput.value).then(() => {
                btnCopyLink.textContent = "Copied!";
                btnCopyLink.style.backgroundColor = "#2ecc71";
                setTimeout(() => {
                    btnCopyLink.textContent = "Copy Link";
                    btnCopyLink.style.backgroundColor = "#0b912f";
                }, 2000);
            });
        });
    }
});