require('dotenv').config();
const express = require('express');
const session = require('express-session');
const db = require('./database/database');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendVerificationEmail } = require('./services/email');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret-temporaire-de-developpement',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24
    }
}));

app.get('/', (req, res) => {
    res.send('Bienvenue dans notre boutique électronique !');
});

app.get('/result', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 + 1 AS result');
        res.json(rows[0]);
    } catch (error) {
        console.error('Erreur /result :', error);
        res.status(500).json({ message: 'Erreur du serveur' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ message: 'Données invalides' });
        }

        const mail = email.trim().toLowerCase();

        const [rows] = await db.query(
            'SELECT id, full_name, password_hash, role, is_verified FROM users WHERE email = ?',
            [mail]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'E-mail ou mot de passe incorrect' });
        }

        const user = rows[0];

        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
            return res.status(401).json({ message: 'E-mail ou mot de passe incorrect' });
        }

        if (!user.is_verified) {
            return res.status(403).json({ message: "Veuillez d'abord vérifier votre e-mail" });
        }

        // On enregistre l'utilisateur dans la session
        req.session.user = {
            id: user.id,
            full_name: user.full_name,
            role: user.role
        };

        res.json({ message: 'Connexion réussie', full_name: user.full_name });
    } catch (error) {
        console.error('Erreur login :', error);
        res.status(500).json({ message: 'Erreur du serveur' });
    }
});

app.get('/api/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Non connecté' });
    }
    res.json(req.session.user);
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ message: 'Déconnexion réussie' });
    });
});

app.post('/api/register', async (req, res) => {
    try {
        const { full_name, email, password } = req.body;

        if (typeof full_name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ message: 'Données invalides' });
        }

        const name = full_name.trim();
        const mail = email.trim().toLowerCase();

        if (name.length < 2 || name.length > 100) {
            return res.status(400).json({ message: 'Nom invalide' });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
            return res.status(400).json({ message: 'E-mail invalide' });
        }

        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({ message: 'Le mot de passe doit contenir entre 8 et 72 caractères' });
        }

        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [mail]);

        if (existing.length > 0) {
            return res.status(409).json({ message: 'Cet e-mail est déjà utilisé' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const token = crypto.randomBytes(32).toString('hex'); // 64 caractères

        await db.query(
            `INSERT INTO users (full_name, email, password_hash, verification_code, verification_expires)
             VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
            [name, mail, passwordHash, token]
        );

        const link = `${process.env.APP_URL || 'http://localhost:3000'}/verify.html?token=${token}`;

        try {
            await sendVerificationEmail(mail, link);
            console.log('E-mail envoyé à', mail);
        } catch (mailError) {
            console.error('Erreur envoi e-mail :', mailError.message);
            return res.status(500).json({ message: "Le compte est créé, mais l'e-mail n'a pas pu être envoyé." });
        }

        res.status(201).json({ message: 'Compte créé. Vérifiez votre e-mail.' });
    } catch (error) {
        console.error('Erreur register :', error);
        res.status(500).json({ message: 'Erreur du serveur' });
    }
});

app.post('/api/verify-email', async (req, res) => {
    try {
        const { token } = req.body;

        if (typeof token !== 'string' || token.length !== 64) {
            return res.status(400).json({ message: 'Lien invalide' });
        }

        const [rows] = await db.query(
            'SELECT id FROM users WHERE verification_code = ? AND verification_expires > NOW()',
            [token]
        );

        if (rows.length === 0) {
            return res.status(400).json({ message: 'Lien invalide, expiré ou déjà utilisé' });
        }

        await db.query(
            'UPDATE users SET is_verified = 1, verification_code = NULL, verification_expires = NULL WHERE id = ?',
            [rows[0].id]
        );

        res.json({ message: 'Votre vérification a réussi !' });
    } catch (error) {
        console.error('Erreur verify :', error);
        res.status(500).json({ message: 'Erreur du serveur' });
    }
});

app.get('/api/verification-status', async (req, res) => {
    try {
        const mail = String(req.query.email || '').trim().toLowerCase();
        const [rows] = await db.query('SELECT is_verified FROM users WHERE email = ?', [mail]);
        res.json({ verified: rows.length > 0 && rows[0].is_verified === 1 });
    } catch (error) {
        console.error('Erreur status :', error);
        res.status(500).json({ verified: false });
    }
});

app.get('/api/products',async(req,res)=>{
     try{
           const [rows]=await db.query(`SELECT p.id, p.name, p.description, p.price, p.stock, p.image,
                    c.name AS category
             FROM products p
             JOIN categories c ON p.category_id = c.id
             ORDER BY p.created_at DESC`);
             res.json(rows);
     }
     catch(error){
        res.status(500).json({message:'Erreur du serveur'});
     }
})
app.listen(port, () => {
    console.log(`Serveur démarré sur le port ${port}`);
});