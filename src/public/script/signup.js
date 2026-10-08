// Riferimenti al form di registrazione e al contenitore dei messaggi di errore
const signupForm = document.querySelector('.login-form');
const errorBox = document.getElementById('error-message');

if (signupForm) {

    signupForm.addEventListener('submit', function(e) {

        // Blocca il ricaricamento automatico della pagina, così il JavaScript può prima validare i dati
        e.preventDefault();

        // Leggiamo i campi; .trim() rimuove gli spazi iniziali e finali accidentali
        const nameField = document.getElementById('regname') ? document.getElementById('regname').value.trim() : '';
        const emailField = document.querySelector('input[type="email"]').value.trim();

        // Ci sono due campi password: li selezioniamo per indice ([0] = password, [1] = conferma)
        const passwordField = document.querySelectorAll('input[type="password"]')[0].value;
        const confirmPasswordField = document.querySelectorAll('input[type="password"]')[1].value;

        // Conterrà il testo dell'errore se una regola di validazione fallisce
        let errorMessage = "";

        // Validazione lato client: nome completo, email valida, password lunga almeno 6 caratteri e conferma corrispondente
        if (!nameField.includes(" ") || nameField.split(" ").filter(word => word.length >= 3).length < 2) {
            errorMessage = "Please enter your full name (First and Last name).";
        } else if (!emailField.endsWith(".com") && !emailField.endsWith(".it")) {
            errorMessage = "Please enter a valid email."
        } else if (passwordField.length < 6) {
            errorMessage = "Password must be at least 6 characters long.";
        } else if (passwordField !== confirmPasswordField) {
            errorMessage = "Passwords do not match. Please try again.";
        }

        if (errorMessage !== "") {
            if (errorBox) {
                // Verifica se era già presente un messaggio di errore a schermo
                const wasAlreadyShowing = errorBox.textContent !== "";

                // Inserisce il nuovo messaggio di errore
                errorBox.textContent = errorMessage;
                errorBox.style.display = 'block'; // Lo rende visibile

                if (wasAlreadyShowing) {
                    // Tentativi successivi: riavvia l'animazione "shake" per richiamare l'attenzione
                    errorBox.classList.remove('shake');
                    void errorBox.offsetWidth;
                    errorBox.classList.add('shake');
                }
            } else {
                console.error("Error: Could not find an element with id='error-message' in the HTML.");
            }
        } else {
            // Dati validi: prepariamo l'oggetto da inviare al server
            const userAccount = {
                name: nameField,
                email: emailField,
                password: passwordField
            };

            // Fetch asincrona verso il backend
            fetch('/api/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'      // I dati viaggiano in formato JSON
                },
                body: JSON.stringify(userAccount)       // Trasformiamo l'oggetto in stringa di testo
            })
            .then(response => {
                if(response.ok) {
                    window.location.href = "login.html";
                } else {
                    return response.json().then(data => {
                        throw new Error(data.message || "Registration failed on server.");
                    });
                }
            })
            .catch(error => {
                if(errorBox) {
                    const wasAlreadyShowing = errorBox.textContent !== "";
                    errorBox.textContent = error.message;
                    errorBox.style.display = 'block';

                    if (wasAlreadyShowing) {
                        errorBox.classList.remove('shake');
                        void errorBox.offsetWidth;
                        errorBox.classList.add('shake');
                    }
                }
            });
        }
    });

    // Inizializzazione del pulsante "Sign up with Google"
    window.onload = function () {
        // Inizializza la libreria di Google con le credenziali dell'app
        google.accounts.id.initialize({
            // Client ID preso dalla Google Console
            client_id: "410866438979-8tevk148t75op8eo9snfrgrincjcagld.apps.googleusercontent.com",

            // Disabilita il login automatico al refresh della pagina
            auto_select: false,

            // Funzione richiamata appena l'utente sceglie il proprio account Google
            callback: HandleGoogleSignupResponse
        });

        const googleBtn = document.getElementById("googleBtn");
        if(googleBtn) {
            google.accounts.id.renderButton(
                googleBtn,
                {
                    theme: "outline",
                    type: "standard",
                    size: "large",
                    text: "signup_with",
                    shape: "rectangular",
                    logo_alignment: "center"
                }
            );
        }
    };

    // Riceve il token generato da Google e lo invia al server per la verifica
    function HandleGoogleSignupResponse(response) {
        const googleIdtoken = response.credential;
        console.log("Sending registration token to the server...");

        fetch('/api/auth/google', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: googleIdtoken }) // Token inviato dentro un oggetto JSON
        })
        .then(res => {
            if(res.ok) {
                return res.json();
            } else {
                return res.json().then(data => {
                    throw new Error(data.message || "Google registration failed.");
                });
            }
        })
        .then(data => {
            if(data.success) {
                console.log("Login with Google successfully completed!");
                // Se il server ha verificato tutto e rilasciato il cookie, andiamo alla dashboard
                window.location.href = "/private/dashboard.html";
            }
        })
        .catch(error => {
            console.error("Errore durante il signup con Google:", error);
            // Mostra l'eventuale errore nel box della pagina di registrazione
            if (errorBox) {
                errorBox.textContent = error.message;
                errorBox.style.display = 'block';
                errorBox.classList.add('shake');
            }
        });
    }
}
