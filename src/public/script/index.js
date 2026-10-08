// Avvia lo slideshow automatico: cambia slide ogni 4 secondi
window.addEventListener("load", function() {
    setInterval(updateSlide, 4000);
});

const slides = [
    {
        title: "Reduce no-shows and stay on track",
        icon: "event_available",
        image: "/assets/slideshow/screenshot1.png"
    },
    {
        title: "Manage all your bookings in one place",
        icon: "calendar_month",
        image: "/assets/slideshow/screenshot2.png"
    },
    {
        title: "Share your link and start receiving clients",
        icon: "link",
        image: "/assets/slideshow/screenshot3.png"
    },
    {
        title: "Track your revenue in real-time",
        icon: "payments",
        image: "/assets/slideshow/screenshot4.png"
    }
];

// Indice che tiene traccia di quale slide è attualmente mostrata
let currentIndex = 0;

// Aggiorna testo, icona, immagine e pallini della slide successiva
function updateSlide() {
    const titleElement = document.getElementById('slide-main-title');
    const imageElement = document.getElementById('slide-image');

    if (!titleElement || !imageElement) return;

    // Avvia la dissolvenza in uscita
    titleElement.classList.add('fade-out');
    imageElement.classList.add('fade-out');

    setTimeout(() => {
        // Passa alla slide successiva 
        currentIndex = (currentIndex + 1) % slides.length;

        // Aggiorna testo, icona del badge, e l'immagine
        document.getElementById('slide-badge-text').textContent = slides[currentIndex].title;
        document.getElementById('slide-icon').textContent = slides[currentIndex].icon;
        imageElement.src = slides[currentIndex].image;

        // Aggiorna i pallini indicatori
        document.querySelectorAll('.slide-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === currentIndex);
        });

        // Dissolvenza in entrata della nuova slide
        titleElement.classList.remove('fade-out');
        imageElement.classList.remove('fade-out');
    }, 500);
}