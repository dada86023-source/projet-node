const loading = document.getElementById('loading');
const result = document.getElementById('result');
const redirect = document.getElementById('redirect');

const token = new URLSearchParams(window.location.search).get('token');

async function verify() {
    const response = await fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
    });

    const data = await response.json();

    loading.style.display = 'none';
    result.style.display = 'block';
    result.textContent = data.message;

    if (response.ok) {
        redirect.style.display = 'block';
        setTimeout(() => { window.location.href = '/login.html'; }, 3000);
    }
}

verify();