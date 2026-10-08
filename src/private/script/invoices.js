document.addEventListener("DOMContentLoaded", () => {
    const invoicesContainer = document.getElementById("invoices-container");

    // Email sidebar e logout sono gestiti da sidebar.js (condiviso su tutte le pagine private)

    // Recupero appuntamenti reali e generazione del tavolo contabile
    if (invoicesContainer) {
        fetch('/api/appointments')
            .then(response => response.json())
            .then(data => {
                const appointments = data.appointments;
                if (!appointments || appointments.length === 0) {
                    invoicesContainer.innerHTML = `
                        <div class="empty-state">
                            <span class="material-symbols-outlined">receipt</span>
                            <p>No invoices or statements generated yet. Your incoming bookings will appear here.</p>
                        </div>`;
                    return;
                }

                // Cloniamo la struttura della tabella dal template HTML
                const tableTemplate = document.getElementById('invoices-table-template');
                const tableClone = tableTemplate.content.cloneNode(true);
                const tbody = tableClone.getElementById('invoices-tbody');

                const rowTemplate = document.getElementById('invoice-row-template');

                appointments.forEach((app) => {
                    // Formattiamo la data in formato giorno/mese/anno
                    const dateFormatted = new Date(app.date_time).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });

                    const rowClone = rowTemplate.content.cloneNode(true);
                    rowClone.querySelector('.invoice-title').textContent = app.title;
                    rowClone.querySelector('.invoice-date').textContent = dateFormatted;
                    rowClone.querySelector('.invoice-amount').textContent = `€ ${parseFloat(app.amount).toFixed(2)}`;  // NUOVA MODIFICA

                    const btn = rowClone.querySelector('.invoice-status-toggle-btn');

                    // Imposta lo stato iniziale del pulsante in base al valore salvato nel database
                    if (app.status === 'paid') {
                        btn.textContent = "PAID";
                        btn.style.backgroundColor = "#d1fae5";
                        btn.style.color = "#0b912f";
                    }

                    // Al click invertiamo lo stato (pending <-> paid) e lo aggiorniamo nel database
                    btn.addEventListener("click", async () => {
                        const currentStatus = btn.textContent.trim().toLowerCase();
                        const newStatus = currentStatus === 'pending' ? 'paid' : 'pending';

                        try {
                            const res = await fetch(`/api/appointments/${app.id}/status`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: newStatus })
                            });
                            if (!res.ok) throw new Error();

                            if (newStatus === 'paid') {
                                btn.textContent = "PAID";
                                btn.style.backgroundColor = "#d1fae5";
                                btn.style.color = "#0b912f";
                            } else {
                                btn.textContent = "PENDING";
                                btn.style.backgroundColor = "#ffedd5";
                                btn.style.color = "#ea580c";
                            }
                        } catch {
                            console.error("Failed to update status.");
                        }
                    });

                    tbody.appendChild(rowClone);
                });

                invoicesContainer.innerHTML = '';
                invoicesContainer.appendChild(tableClone); // contenuti template passano ad essere visibili nel DOM
            })  // questo elemento, seguendo la catena dei suoi genitori arriva fino a document? 
            // Se no => è in RAM isolato. Se si => visibile nel DOM
            .catch(err => {
                console.error("Errore nel caricamento del tavolo contabile:", err);
                invoicesContainer.innerHTML = "<p>Error loading statements. Please check your backend link.</p>";
            });
    }

    const exportBtn = document.getElementById("btn-export-csv");
    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            window.location.href = "/api/appointments/export";
        });
    }
});