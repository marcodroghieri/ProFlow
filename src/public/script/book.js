document.addEventListener("DOMContentLoaded", () => {
    const publicBookingForm = document.getElementById("public-booking-form");

    if (publicBookingForm) {
        publicBookingForm.addEventListener("submit", (e) => {
            e.preventDefault(); // Blocca il ricaricamento nativo della pagina

            // 1. Raccogliamo i dati inseriti dal cliente nel form
            const clientName = document.getElementById("client-name").value;
            const clientEmail = document.getElementById("client-email").value;
            const bookingReason = document.getElementById("booking-reason").value;
            const bookingDate = document.getElementById("booking-date").value;

            // 2. Leggiamo l'URL del browser per prendere l'email del freelance (?freelanceEmail=...)
            const urlParams = new URLSearchParams(window.location.search);
            const freelanceEmail = urlParams.get("freelanceEmail");

            if (!freelanceEmail) {
                alert("Errore: Link non valido. Impossibile identificare il professionista.");
                return;
            }

            // 3. Impacchettiamo i dati da spedire
            const bookingData = {
                freelanceEmail: freelanceEmail,
                clientName: clientName,
                clientEmail: clientEmail,
                bookingReason: bookingReason,
                date_time: bookingDate
            };

            // 4. Inviamo i dati alla rotta pubblica del server
            fetch('/api/public/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData)
            })
            .then(response => {
                if (!response.ok) throw new Error();
                return response.json();
            })
            .then(data => {
                publicBookingForm.reset(); // Svuota i campi del form
                alert("Appointment successfully booked!");
            })
            .catch(error => {
                alert("Si è verificato un errore durante la prenotazione.");
            });
        });
    }
});