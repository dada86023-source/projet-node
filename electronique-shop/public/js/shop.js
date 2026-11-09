const productsContainer = document.getElementById('products');
const message = document.getElementById('message');
const template = document.getElementById('product-template');

async function fetchProducts() {
    try {
        const response = await fetch('/api/products');

        if (!response.ok) {
            message.textContent = 'Impossible de charger les produits.';
            return;
        }

        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error(error);
        message.textContent = 'Erreur de connexion au serveur.';
    }
}

function displayProducts(products) {
    productsContainer.innerHTML = '';

    if (products.length === 0) {
        message.textContent = 'Aucun produit disponible.';
        return;
    }

    message.textContent = '';

    products.forEach((product) => {
        const card = document.createElement('div');

        const stockText = product.stock > 0
            ? 'En stock (' + product.stock + ')'
            : 'Rupture de stock';

        card.innerHTML = `
            <img src="${product.image}" width="200">
            <h3>${product.name}</h3>
            <p>${product.category}</p>
            <p>${Number(product.price).toFixed(2)} DH</p>
            <p>${stockText}</p>
        `;

        productsContainer.appendChild(card);
    });
}
fetchProducts();