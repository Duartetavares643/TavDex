// =====================================================================
//  TavDex – envio de emails com o Nodemailer (Gmail por SMTP)
//  EMAIL_MODE no .env:
//    smtp      envia a sério (precisa de GMAIL_UTILIZADOR e GMAIL_PASSWORD_APP)
//    ficheiro  guarda cada email em emails/ (para testar sem enviar nada)
//    consola   escreve o email na consola do servidor
//  Sem EMAIL_MODE: usa smtp se o Gmail estiver configurado, senão consola.
// =====================================================================
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const PASTA_EMAILS = path.join(__dirname, '..', 'emails');
const temGmail = !!(process.env.GMAIL_UTILIZADOR && process.env.GMAIL_PASSWORD_APP);
const MODO = process.env.EMAIL_MODE || (temGmail ? 'smtp' : 'consola');

let transporte = null;
if (MODO === 'smtp' && temGmail) {
  transporte = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_UTILIZADOR, pass: process.env.GMAIL_PASSWORD_APP },
  });
}

// Escapa texto para o HTML do email
function escHtml(t) {
  return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Modelo HTML com o estilo do TavDex (fundo escuro, botão vermelho/magenta).
// Os emails só aceitam CSS "inline" (dentro de style="..."), por isso está tudo aqui.
function modeloEmail({ titulo, paragrafos = [], botao = null, nota = '' }) {
  const ps = paragrafos.map(p => `<p style="margin:0 0 14px;color:#d6d3df;font-size:15px;line-height:1.55">${escHtml(p)}</p>`).join('');
  const b = botao ? `
    <p style="margin:24px 0"><a href="${escHtml(botao.url)}" style="display:inline-block;padding:13px 26px;border-radius:999px;background:#ff2d55;background:linear-gradient(90deg,#ff2d55,#c026d3);color:#fff;font-weight:700;text-decoration:none;font-size:15px">${escHtml(botao.texto)}</a></p>
    <p style="margin:0 0 6px;color:#9a96a8;font-size:13px">Se o botão não funcionar, copia este endereço para o browser:</p>
    <p style="margin:0 0 18px;word-break:break-all;font-size:13px"><a href="${escHtml(botao.url)}" style="color:#ff5c8a">${escHtml(botao.url)}</a></p>` : '';
  return `<!DOCTYPE html><html lang="pt-PT"><body style="margin:0;background:#08070b;font-family:Inter,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#08070b;padding:28px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#121019;border:1px solid #2a2633;border-radius:16px">
      <tr><td style="padding:26px 28px 6px"><span style="font-size:26px;font-weight:800;color:#fff;letter-spacing:.5px">Tav<span style="color:#ff2d55">Dex</span></span></td></tr>
      <tr><td style="padding:10px 28px 26px">
        <h1 style="margin:0 0 16px;color:#fff;font-size:22px">${escHtml(titulo)}</h1>
        ${ps}${b}
        ${nota ? `<p style="margin:18px 0 0;padding-top:14px;border-top:1px solid #2a2633;color:#9a96a8;font-size:13px">${escHtml(nota)}</p>` : ''}
      </td></tr>
    </table>
    <p style="color:#6b6778;font-size:12px;margin:14px 0 0">TavDex · Descobre. Organiza. Avalia. Cria.</p>
  </td></tr></table></body></html>`;
}

// Envia um email. "texto" é a versão simples; "html" é opcional.
// Um email que falha nunca estraga a ação do utilizador (o erro só vai para o log).
async function enviarEmail(para, assunto, texto, html = null) {
  try {
    if (MODO === 'ficheiro') {
      fs.mkdirSync(PASTA_EMAILS, { recursive: true });
      const nome = `${new Date().toISOString().replace(/[:.]/g, '-')}_${String(para).replace(/[^a-z0-9@._-]/gi, '_')}`;
      fs.writeFileSync(path.join(PASTA_EMAILS, nome + '.txt'), `Para: ${para}\nAssunto: ${assunto}\n\n${texto}\n`);
      if (html) fs.writeFileSync(path.join(PASTA_EMAILS, nome + '.html'), html);
      return;
    }
    if (!transporte) {
      console.log(`\n--- EMAIL (modo de teste) ---\nPara: ${para}\nAssunto: ${assunto}\n\n${texto}\n-----------------------------\n`);
      return;
    }
    await transporte.sendMail({
      from: process.env.EMAIL_FROM || `TavDex <${process.env.GMAIL_UTILIZADOR}>`,
      to: para, subject: assunto, text: texto, ...(html ? { html } : {}),
    });
  } catch (erro) {
    console.error('Não foi possível enviar o email:', erro.message);
  }
}

module.exports = { enviarEmail, modeloEmail, PASTA_EMAILS };
