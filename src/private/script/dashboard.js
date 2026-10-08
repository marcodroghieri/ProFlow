document.addEventListener("DOMContentLoaded", () => {
    const totalBookingsDisplay = document.getElementById("total-bookings-count");
    const totalRevenueDisplay = document.getElementById("total-revenue");
    const chartDiv = document.getElementById("chart_div");

    // Email sidebar e logout sono gestiti da sidebar.js (condiviso su tutte le pagine private)

    // Carichiamo il modulo grafico di Google Charts e disegniamo appena pronto
    if (chartDiv) {
        google.charts.load('current', { packages: ['corechart'] });
        google.charts.setOnLoadCallback(loadAnalyticsChart);
    }

    // Eseguiamo il caricamento delle statistiche se l'elemento c'è
    if (totalBookingsDisplay) {
        loadDashboardStats();
    }

    function loadDashboardStats() {
        // Lanciamo le due richieste IN PARALLELO, non una dopo l'altra
        Promise.all([
            fetch('/api/appointments/count').then(res => {
                if (!res.ok) throw new Error("Impossibile recuperare il conteggio.");
                return res.json();
            }),
            fetch('/api/appointments/revenue').then(res => {
                if (!res.ok) throw new Error("Impossibile recuperare le entrate.");
                return res.json();
            })
        ])
            .then(([countData, revenueData]) => {
                if (countData.success) {
                    totalBookingsDisplay.textContent = countData.count;
                }
                if (revenueData.success && totalRevenueDisplay) {
                    totalRevenueDisplay.textContent = `€ ${revenueData.revenue.toFixed(2)}`;
                }
            })
            .catch(error => {
                console.error("Errore nel caricamento dei dati della dashboard:", error);
                totalBookingsDisplay.textContent = "--";
            });
    }

    function loadAnalyticsChart() {
        fetch('/api/analytics')
            .then(response => {
                if (!response.ok) throw new Error("Impossibile recuperare le statistiche.");
                return response.json();
            })
            .then(data => {
                if (!data.success) return;

                // Trasformiamo i dati "lunghi" (una riga per mese+stato) in un formato "a tabella" per mese
                const monthsMap = {};
                data.monthly.forEach(row => {
                    if (!monthsMap[row.month]) {
                        monthsMap[row.month] = { paid: 0, pending: 0 };
                    }
                    monthsMap[row.month][row.status] = parseInt(row.total, 10);
                });

                // Costruzione della DataTable
                const dataTable = new google.visualization.DataTable();
                dataTable.addColumn('string', 'Month');
                dataTable.addColumn('number', 'Paid');
                dataTable.addColumn('number', 'Pending');

                Object.keys(monthsMap).sort().forEach(month => {
                    dataTable.addRow([month, monthsMap[month].paid, monthsMap[month].pending]);
                });

                // Calcoliamo il valore massimo per generare tacche solo su numeri interi
                let maxValue = 0;
                Object.values(monthsMap).forEach(v => {
                    maxValue = Math.max(maxValue, v.paid, v.pending);
                });
                const yAxisTicks = [];
                for (let i = 0; i <= maxValue + 1; i++) {
                    yAxisTicks.push(i);
                }

                // Opzioni e disegno del grafico
                const options = {
                    legend: { position: 'top', alignment: 'end' },
                    colors: ['#0b912f', '#ea580c'],
                    hAxis: {
                        title: 'Months',
                        titleTextStyle: {
                            italic: false,
                            fontName: 'Arial',
                            fontSize: 16
                        }
                    },
                    vAxis: {
                        title: 'Appointments',
                        format: '0',
                        ticks: yAxisTicks,
                        titleTextStyle: {
                            italic: false,
                            fontName: 'Arial',
                            fontSize: 16
                        }
                    },
                    bar: { groupWidth: '50%' },
                    chartArea: {
                        top: 50,        
                        left: 60,
                        width: '85%'    
                    }
                };
                const chart = new google.visualization.ColumnChart(document.getElementById('chart_div'));
                chart.draw(dataTable, options);
            })
            .catch(error => {
                console.error("Errore nel caricamento del grafico:", error);
            });
    }
});