// =====================================================================
//  TavDex – envio de emails com o Nodemailer (Gmail)
//  Se o Gmail não estiver configurado no .env, o email é escrito na
//  consola do servidor (útil para testar a recuperação da palavra-passe).
// =====================================================================
const nodemailer = require('nodemailer');

let transporte = null;
if (process.env.GMAIL_UTILIZADOR && process.env.GMAIL_PASSWORD_APP) {
  transporte = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_UTILIZADOR, pass: process.env.GMAIL_PASSWORD_APP },
  });
}

// Envia um email de texto simples
async function enviarEmail(para, assunto, texto) {
  if (!transporte) {
    console.log(`\n--- EMAIL (modo de teste) ---\nPara: ${para}\nAssunto: ${assunto}\n\n${texto}\n-----------------------------\n`);
    return;
  }
  try {
    await transporte.sendMail({ from: `TavDex <${process.env.GMAIL_UTILIZADOR}>`, to: para, subject: assunto, text: texto });
  } catch (erro) {
    // Um email que falha não deve estragar a ação do utilizador
    console.error('Não foi possível enviar o email:', erro.message);
  }
}

module.exports = { enviarEmail };
