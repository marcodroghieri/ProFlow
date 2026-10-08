document.addEventListener("DOMContentLoaded", () => {
    const appointmentForm = document.getElementById("appointment-form");
    const appointmentsContainer = document.getElementById("appointments-container");

    // Qui teniamo tutti gli appuntamenti scaricati dal server
    let allAppointments = [];

    loadAppointments();

    // Legge gli appuntamenti dal database e li salva in memoria, poi li disegna
    function loadAppointments() {
        fetch('/api/appointments')
            .then(response => {
                if (!response.ok) throw new Error("Errore nel caricamento dei dati.");
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    allAppointments = data.appointments; // Salviamo la lista completa
                    renderAppointments(allAppointments); // Disegniamo tramite la funzione dedicata
                }
            })
            .catch(error => {
                console.error("Errore nel recupero dell'agenda:", error);
            });
    }

    // Funzione dedicata SOLO a disegnare una lista di appuntamenti (qualunque essa sia, filtrata o no)
    function renderAppointments(list) {
        if (list.length === 0) {
            appointmentsContainer.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined">event_busy</span>
                    <p>No upcoming appointments found. Use the form above to schedule your first meeting flow!</p>
                </div>`;
            return;
        }

        appointmentsContainer.innerHTML = '';

        const ul = document.createElement('ul');
        ul.className = 'appointments-list';

        const template = document.getElementById('appointment-template');

        list.forEach(app => {
            const clone = template.content.cloneNode(true);
            clone.querySelector('.appointment-title').textContent = app.title;

            const deleteBtn = clone.querySelector('.btn-delete-appointment');
            if (deleteBtn) {
                deleteBtn.addEventListener("click", () => {
                    fetch(`/api/appointments/${app.id}`, { method: 'DELETE' })
                        .then(res => {
                            if (!res.ok) throw new Error("Impossibile eliminare l'appuntamento.");
                            return res.json();
                        })
                        .then(deleteData => {
                            if (deleteData.success) {
                                loadAppointments();
                            }
                        })
                        .catch(error => {
                            console.error("Errore durante la rimozione: ", error);
                            alert("Could not delete the appointment. Please try again.");
                        });
                });
            }

            ul.appendChild(clone);
        });

        appointmentsContainer.appendChild(ul);
    }

    // MODIFICA: riferimenti ai tre controlli di filtro + bottone reset
    const filterSearch = document.getElementById("filter-search");
    const filterStatus = document.getElementById("filter-status");
    const filterDate = document.getElementById("filter-date");
    const filterReset = document.getElementById("filter-reset");

    // MODIFICA: legge lo stato attuale dei tre filtri e ridisegna la lista filtrata
    function applyFilters() {
        const searchText = filterSearch.value.trim().toLowerCase();
        const statusValue = filterStatus.value;
        const dateValue = filterDate.value;

        const filtered = allAppointments.filter(app => {
            const matchesSearch = app.title.toLowerCase().includes(searchText);
            const matchesStatus = (statusValue === "all") || (app.status === statusValue);
            const matchesDate = (dateValue === "") || (app.date_time.slice(0, 10) === dateValue);

            return matchesSearch && matchesStatus && matchesDate;
        });

        renderAppointments(filtered);
    }

    // MODIFICA: ogni volta che l'utente interagisce con un filtro, riapplichiamo tutti e tre insieme
    filterSearch.addEventListener("input", applyFilters);
    filterStatus.addEventListener("change", applyFilters);
    filterDate.addEventListener("change", applyFilters);

    // MODIFICA: il bottone Reset svuota i tre controlli e ridisegna la lista completa
    filterReset.addEventListener("click", () => {
        filterSearch.value = "";
        filterStatus.value = "all";
        filterDate.value = "";
        renderAppointments(allAppointments);
    });

    if (appointmentForm) {
        appointmentForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const titleInput = document.getElementById("app-title").value.trim();
            const dateInput = document.getElementById("app-date").value;
            const amountInput = document.getElementById("app-amount").value;

            fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: titleInput, date_time: dateInput, amount: amountInput === '' ? 0 : parseFloat(amountInput) })
            })
                .then(response => {
                    if (!response.ok) throw new Error("Impossibile salvare l'appuntamento.");
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        appointmentForm.reset();
                        loadAppointments();
                    }
                })
                .catch(error => {
                    console.error("Errore durante il salvataggio:", error);
                    alert("Errore durante la pianificazione dell'appuntamento.");
                });
        });
    }
});