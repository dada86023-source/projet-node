const form = document.getElementById('register-form');
const message = document.getElementById('message');

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const full_name = document.getElementById('full_name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirm_password = document.getElementById('confirm_password').value;

    if (password !== confirm_password) {
        message.textContent = 'Les mots de passe ne correspondent pas.';
        return;
    }

    const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name, email, password })
    });

    const data = await response.json();

    if (!response.ok) {
        message.textContent = data.message;
        return;
    }

    // Succès : on cache le formulaire et on montre l'attente
    form.style.display = 'none';
    message.textContent = '';
    document.getElementById('sent-to').textContent = email;
    document.getElementById('waiting').style.display = 'block';

    // Toutes les 3 secondes, on demande si le compte est vérifié
    const timer = setInterval(async () => {
        const res = await fetch('/api/verification-status?email=' + encodeURIComponent(email));
        const status = await res.json();

        if (status.verified) {
            clearInterval(timer);
            window.location.href = '/login.html';
        }
    }, 3000);
});