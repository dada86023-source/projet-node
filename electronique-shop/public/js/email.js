require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendVerificationEmail(to, link) {
    await transporter.sendMail({
        from: `"Boutique Électronique" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: 'Vérifiez votre compte',
        html: `<p>Bienvenue ! Cliquez sur le lien pour activer votre compte :</p>
               <p><a href="${link}">Vérifier mon e-mail</a></p>
               <p>Ce lien expire dans 24 heures.</p>`
    });
}

module.exports = { sendVerificationEmail };