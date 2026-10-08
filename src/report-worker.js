const { parentPort, workerData } = require("worker_threads");

// Riceviamo gli appuntamenti già pronti (passati dal server come workerData)
const appointments = workerData;

// Costruiamo il report: intestazione CSV + una riga per ogni appuntamento
let csv = "Title,Date,Status,Amount\n";
let totalRevenue = 0;
let paidCount = 0;
let pendingCount = 0;

appointments.forEach(app => {
    csv += `${app.title},${app.date_time},${app.status},${app.amount}\n`;

    if (app.status === 'paid') {
        totalRevenue += parseFloat(app.amount);
        paidCount++;
    } else if (app.status === 'pending') {
        pendingCount++;
    }
});

// Mandiamo il risultato al thread principale (server.js)
parentPort.postMessage({
    csv: csv,
    totalRevenue: totalRevenue,
    paidCount: paidCount,
    pendingCount: pendingCount
});