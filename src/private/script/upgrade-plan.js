document.addEventListener("DOMContentLoaded", () => {
    // Email sidebar e logout sono gestiti da sidebar.js (condiviso su tutte le pagine private)

    // Intercettazione della prenotazione upgrade
    const upgradeBtn = document.querySelector(".plan-submit-upgrade");
    if (upgradeBtn) {
        upgradeBtn.addEventListener("click", () => {
            alert("Not available yet!");
        });
    }
});
