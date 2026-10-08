const loginForm = document.querySelector('.login-form');
const errorBox = document.getElementById('error-message');

// Controllo di sicurezza: esegue il codice solo se il form di login è presente nella pagina
if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();     // Impedisce caricamento immediato della pagina e l'invio sincrono del form

        const emailField = document.querySelector('input[type="email"]').value;
        const passwordField = document.querySelector('input[type="password"]').value;
        
        // Oggetto contenente le credenziali da verificare
        const credentials = {
            email: emailField,
            password: passwordField
        };

        // Fetch asincrona verso l'endpoint di login del server
        fetch('/api/login', {
            method: 'POST',     // Metodo POST protegge i dati nel body
            headers: {
                'Content-Type': 'application/json'      // Dati viaggiono in json
            },
            body: JSON.stringify(credentials)       
        })
            .then(response => {
                if (response.ok) {
                    return response.json();     // converte il body della risposta da JSON a oggetto JavaScript
                } else {
                    return response.json().then(data => {
                        throw new Error(data.message || "Login failed.");
                    });
                }
            })
            .then(data => {
                // Se il server conferma l'autenticazione:
                if (data.success) {
                    window.location.href = "/private/dashboard.html";
                }
            })
            .catch(error => {
                if (errorBox) {
                    errorBox.textContent = error.message;
                    errorBox.style.display = 'block';

                    errorBox.classList.remove('shake');
                    void errorBox.offsetWidth;
                    errorBox.classList.add('shake');
                }
            });
    });

    // Inizializzazione Google Sign-In
    window.onload = function () {
        // Inizializzo la libreria di Google con le credenziali 
        google.accounts.id.initialize({
            // Client ID da Google Console
            client_id: "410866438979-8tevk148t75op8eo9snfrgrincjcagld.apps.googleusercontent.com",

            // Disabilita il login automatico al refresh:
            auto_select: false,
            
            // Funzione callback che si attiverà non appena l'utente seleziona il suo account Google
            callback: handleGoogleLoginResponse
        });

        const googleBtn = document.getElementById("googleBtn");
        if(googleBtn){
            google.accounts.id.renderButton(
                googleBtn,
                {
                    theme: "outline",
                    type: "standard",
                    size: "large",
                    text: "continue_with",
                    shape: "rectangular", 
                    logo_alignment: "center"
                }
            );
        }
    };

    // Ricezione sicura del token da parte di Google
    function handleGoogleLoginResponse(response) {
        const googleIdtoken = response.credential;
        console.log("Token ricevuto da Google con successo!", googleIdtoken);

        fetch('/api/auth/google', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: googleIdtoken})   // Spedizione token dentro oggetto JSON
        })
        .then(res => {
            if (res.ok) {
                return res.json();
            } else {
                return res.json().then(data => {
                    throw new Error(data.message || "Google authentication failed.");
                });
            }
        })
        .then(data => {
            if(data.success) {
                console.log("Login with Google successfully completed!");
                // Se il server ha verificato tutto e rilasciato il cookie andiamo in dashboard!
                window.location.href = "/private/dashboard.html";
            }
        })
        .catch(error => {
            console.error("Error during login with Google:", error);
            if(errorBox){
                errorBox.textContent = error.message;
                errorBox.style.display = 'block';

                errorBox.classList.remove('shake');
                void errorBox.offsetWidth;
                errorBox.classList.add('shake');
            }
        });
    }
}