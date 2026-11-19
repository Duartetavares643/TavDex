// =====================================================================
//  TavDex – Definições da própria conta (Passo 10)     Base: /api/utilizadores
//  GET    /eu/definicoes          dados da página Definições
//  GET    /disponivel?nome=       o @nome está livre? (registo e Definições)
//  PUT    /eu/perfil              alterar o perfil (devolve os erros de todos os campos)
//  PUT    /eu/email               mudar o email (só muda depois de confirmado)
//  POST   /eu/email/reenviar      reenviar o link para o email novo
//  DELETE /eu/email               cancelar a mudança de email
//  PUT    /eu/password            alterar ou definir a palavra-passe
//  DELETE /eu/google              desligar a conta Google
//  DELETE /eu                     apagar a conta
// =====================================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const { linha, linhas, executar } = require('../../db');
const a = require('../ajudas');
const { exigirLogin, terminarSessao } = require('../middleware');
const { enviarEmail, modeloEmail } = require('../email');
const { compararPassword, validarPassword, validarNome, avisarPalavraPasseAlterada } = require('../auth');
const { dadosPessoais } = require('../palavras-passe');
const { enviarConfirmacao, limiteEnvios } = require('../confirmacao-email');
const { desligarGoogle } = require('../google');

const router = express.Router();
const MAX_ID = 2147483647;   // maior valor de uma coluna INT (ids)

// ---------------------------------------------------------------------
// Definições (só o próprio)
// ---------------------------------------------------------------------
router.get('/eu/definicoes', exigirLogin, async (req, res) => {
  const u = req.u;
  const sessoes = await linhas(`SELECT id, dispositivo, ip, via, criado_em, ultimo_acesso FROM sessoes
    WHERE utilizador_id = ? ORDER BY ultimo_acesso DESC`, [u.id]);
  sessoes.forEach(s => { s.atual = s.id === req.sessaoId; });
  const atividade = await linhas(`SELECT tipo, descricao, ip, dispositivo, criado_em FROM atividade_conta
    WHERE utilizador_id = ? ORDER BY criado_em DESC, id DESC LIMIT 12`, [u.id]);
  const silenciadas = (await linhas('SELECT tipo FROM notif_silenciadas WHERE utilizador_id = ?', [u.id])).map(r => r.tipo);
  const generos = await linhas('SELECT id, nome FROM generos ORDER BY nome');
  const meusGeneros = (await linhas('SELECT genero_id FROM utilizador_generos WHERE utilizador_id = ?', [u.id])).map(r => r.genero_id);
  const nome = await estadoMudancaNome(u);
  const alterada = await linha('SELECT DATEDIFF(NOW(), palavra_passe_alterada_em) AS dias FROM utilizadores WHERE id = ?', [u.id]);
  res.json({
    id: u.id, nome: u.nome, nome_exibicao: u.nome_exibicao || '', email: u.email, bio: u.bio, localizacao: u.localizacao,
    cor: u.cor, tema_banner: a.temaBanner(u.tema_banner), foto_versao: Number(u.foto_versao) || 0, papel: u.papel, criado_em: u.criado_em,
    banner_versao: Number(u.banner_versao) || 0,
    notif_email: !!u.notif_email, tem_password: !!u.password_hash, google_email: u.google_id ? u.google_email : null,
    email_pendente: u.email_pendente || null,
    // @nome: só muda uma vez a cada 30 dias (pode_mudar_nome / nome_livre_em)
    pode_mudar_nome: nome.pode, nome_livre_em: nome.livreEm,
    // Privacidade do perfil e géneros favoritos (até 3)
    mostrar_listas: !!u.mostrar_listas, mostrar_seguidores: !!u.mostrar_seguidores,
    generos, meus_generos: meusGeneros,
    // Resumo "Proteção da conta"
    protecao: {
      email_verificado: !!u.email_verificado,
      tem_password: !!u.password_hash,
      // null = ainda não se sabe (só se verifica no login, porque a palavra-passe nunca é guardada)
      palavra_passe_fraca: u.palavra_passe_fraca === null ? null : !!u.palavra_passe_fraca,
      palavra_passe_dias: alterada.dias,            // há quantos dias foi alterada (null = não se sabe)
      google: !!u.google_id,
      sessoes: sessoes.length,
    },
    sessoes, atividade, silenciadas,
    cores: a.CORES_AVATAR,
    temas_banner: a.TEMAS_BANNER,
  });
});

// O @nome só pode mudar uma vez a cada 30 dias.
// Devolve { pode, livreEm } (livreEm = data a partir da qual pode mudar, "dd/mm/aaaa")
async function estadoMudancaNome(u) {
  const r = await linha(`SELECT nome_alterado_em >= NOW() - INTERVAL 30 DAY AS recente,
    DATE_FORMAT(nome_alterado_em + INTERVAL 30 DAY, '%d/%m/%Y') AS livre FROM utilizadores WHERE id = ?`, [u.id]);
  return { pode: !r.recente, livreEm: r.recente ? r.livre : null };
}

// ---------------------------------------------------------------------
// @nome disponível? (as Definições e o registo perguntam enquanto se escreve)
// No máximo 30 pedidos por minuto por IP (contados em memória).
// ---------------------------------------------------------------------
const pedidosDisponivel = new Map();   // ip -> { n, ate }
// GET /disponivel?nome=  →  { disponivel, mensagem }
router.get('/disponivel', async (req, res) => {
  const ip = a.ipDe(req);
  const agora = Date.now();
  const contagem = pedidosDisponivel.get(ip);
  if (!contagem || contagem.ate < agora) pedidosDisponivel.set(ip, { n: 1, ate: agora + 60000 });
  else if (++contagem.n > 30) a.falha(429, 'Demasiados pedidos. Espera um pouco.');
  if (pedidosDisponivel.size > 5000) for (const [k, v] of pedidosDisponivel) if (v.ate < agora) pedidosDisponivel.delete(k);

  let nome;
  try {
    nome = validarNome(req.query.nome);
  } catch (erro) {
    if (!erro.publico) throw erro;
    return res.json({ disponivel: false, mensagem: erro.message });
  }
  if (req.u && nome === req.u.nome) return res.json({ disponivel: true, mensagem: 'É o teu @nome atual.' });
  const motivo = await a.nomeIndisponivel(nome, req.u ? req.u.id : 0);
  res.json(motivo ? { disponivel: false, mensagem: motivo } : { disponivel: true, mensagem: '✓ Disponível' });
});

// Guardar o perfil (devolve os erros de todos os campos de uma vez)
router.put('/eu/perfil', exigirLogin, async (req, res) => {
  const v = new a.Validacao();
  const nomeExibicao = v.campo('nome_exibicao', () => a.nomeExibicao(req.body.nome_exibicao));
  const nome = v.campo('nome', () => validarNome(req.body.nome));
  const cor = v.campo('cor', () => a.inteiro(req.body.cor, 'Cor', 0, 359));
  // Cenário do banner: só um dos 4 valores (se não vier, mantém o atual)
  const temaBanner = req.body.tema_banner === undefined ? a.temaBanner(req.u.tema_banner) : req.body.tema_banner;
  if (!a.TEMAS_BANNER.includes(temaBanner)) v.erro('tema_banner', 'Escolhe um dos cenários.');
  const localizacao = v.campo('localizacao', () => a.texto(req.body.localizacao, 'Localização', 0, 40));
  const bio = v.campo('bio', () => a.texto(req.body.bio, 'Biografia', 0, 160));
  const notifEmail = a.booleano(req.body.notif_email) ? 1 : 0;
  // Privacidade (se não vier, mantém o que estava)
  const mostrarListas = req.body.mostrar_listas === undefined ? (req.u.mostrar_listas ? 1 : 0) : (a.booleano(req.body.mostrar_listas) ? 1 : 0);
  const mostrarSeguidores = req.body.mostrar_seguidores === undefined ? (req.u.mostrar_seguidores ? 1 : 0) : (a.booleano(req.body.mostrar_seguidores) ? 1 : 0);
  // Géneros favoritos: até 3 ids da tabela generos (se não vier, mantém)
  let generos = null;
  if (req.body.generos !== undefined) {
    const lista = Array.isArray(req.body.generos) ? req.body.generos : String(req.body.generos || '').split(',').filter(Boolean);
    generos = [...new Set(lista.map(Number))];
    if (generos.length > 3) v.erro('generos', 'Escolhe no máximo 3 géneros.');
    else if (generos.some(g => !Number.isInteger(g) || g < 1 || g > MAX_ID)) v.erro('generos', 'Escolhe géneros da lista.');
    else if (generos.length) {
      const existem = await linha(`SELECT COUNT(*) AS n FROM generos WHERE id IN (${a.marcadores(generos)})`, generos);
      if (existem.n !== generos.length) v.erro('generos', 'Escolhe géneros da lista.');
    }
  }

  // O @nome muda? (só mudar maiúsculas/minúsculas, ex.: duarte -> Duarte, não conta como mudança)
  const mudaNome = nome && nome.toLowerCase() !== req.u.nome.toLowerCase();
  if (mudaNome) {
    const estado = await estadoMudancaNome(req.u);
    if (!estado.pode) v.erro('nome', `Podes voltar a mudar o teu @nome a partir de ${estado.livreEm}.`);
    else {
      const motivo = await a.nomeIndisponivel(nome, req.u.id);
      if (motivo) v.erro('nome', motivo);
    }
  }
  v.verificar();

  await executar(`UPDATE utilizadores SET nome = ?, nome_exibicao = ?, cor = ?, tema_banner = ?, localizacao = ?, bio = ?,
      notif_email = ?, mostrar_listas = ?, mostrar_seguidores = ? WHERE id = ?`,
    [nome, nomeExibicao, cor, temaBanner, localizacao, bio, notifEmail, mostrarListas, mostrarSeguidores, req.u.id]);
  if (mudaNome) {
    // O @ antigo fica reservado 30 dias para o dono e o endereço antigo do perfil redireciona
    await executar('DELETE FROM nomes_antigos WHERE nome = ?', [nome]);
    await executar('REPLACE INTO nomes_antigos (nome, utilizador_id, data) VALUES (?, ?, NOW())', [req.u.nome, req.u.id]);
    await executar('UPDATE utilizadores SET nome_alterado_em = NOW() WHERE id = ?', [req.u.id]);
    await a.registarAtividade(req, req.u.id, 'nome_alterado', `@nome alterado (de @${req.u.nome} para @${nome})`);
  }
  if (generos) {
    await executar('DELETE FROM utilizador_generos WHERE utilizador_id = ?', [req.u.id]);
    for (const g of generos) await executar('INSERT INTO utilizador_generos (utilizador_id, genero_id) VALUES (?, ?)', [req.u.id, g]);
  }
  res.json({ ok: true, nome, mensagem: 'Perfil atualizado.' });
});

// Mudar o email: o novo NÃO substitui logo o antigo. Fica em email_pendente e
// recebe um link de confirmação (24 horas); só ao abrir o link é que o email muda
// (ver routes/confirmacao-email.js). Assim um erro de escrita não faz perder a conta.
router.put('/eu/email', exigirLogin, async (req, res) => {
  if (req.u.password_hash && !(await compararPassword(String(req.body.password || ''), req.u.password_hash))) {
    await a.registarAtividade(req, req.u.id, 'email_falhado', 'Tentativa falhada de mudar o email (palavra-passe errada)');
    a.falha(400, 'A palavra-passe atual está errada.', { erros: { password: 'A palavra-passe atual está errada.' } });
  }
  const v = new a.Validacao();
  const novo = await v.campoAsync('email', () => a.validarEmail(req.body.email));
  v.verificar();
  if (novo === req.u.email) a.falha(400, 'Esse já é o teu email.', { erros: { email: 'Esse já é o teu email.' } });
  if (await linha('SELECT id FROM utilizadores WHERE (email = ? OR email_pendente = ?) AND id <> ?', [novo, novo, req.u.id])) {
    a.falha(400, 'Já existe uma conta com este email.', { erros: { email: 'Já existe uma conta com este email.' } });
  }
  const limite = await limiteEnvios(req.u.id);
  if (!limite.pode) a.falha(429, limite.motivo);

  await executar('UPDATE utilizadores SET email_pendente = ? WHERE id = ?', [novo, req.u.id]);
  await enviarConfirmacao(req, { ...req.u, email_pendente: novo }, novo, 'mudanca');
  await a.registarAtividade(req, req.u.id, 'email_pedido', `Pedido para mudar o email para ${novo}`);
  // Aviso para o email antigo (se não foi o dono, fica a saber e o email não muda sem confirmação)
  const nome = req.u.nome_exibicao || req.u.nome;
  await enviarEmail(req.u.email, 'TavDex – pedido para mudar o email da tua conta',
    `Olá ${nome},\n\nFoi pedido para mudar o email da tua conta TavDex (@${req.u.nome}) para ${a.esconderEmail(novo)}.\nO email só muda depois de o novo endereço ser confirmado.\nSe não foste tu, muda a palavra-passe e contacta a administração do TavDex.`,
    modeloEmail({
      titulo: 'Pedido para mudar o email',
      paragrafos: [`Olá ${nome},`, `Foi pedido para mudar o email da tua conta TavDex (@${req.u.nome}) para ${a.esconderEmail(novo)}.`,
        'O email só muda depois de o novo endereço ser confirmado.'],
      nota: 'Se não foste tu, muda a palavra-passe e contacta a administração do TavDex.',
    }));
  res.json({ ok: true, email_pendente: novo, mensagem: `Enviámos um link para ${a.esconderEmail(novo)}. Abre-o para confirmar o novo email.` });
});

// Reenviar o link para o email pendente
router.post('/eu/email/reenviar', exigirLogin, async (req, res) => {
  if (!req.u.email_pendente) a.falha(400, 'Não há nenhuma mudança de email à espera de confirmação.');
  const limite = await limiteEnvios(req.u.id);
  if (!limite.pode) a.falha(429, limite.motivo);
  await enviarConfirmacao(req, req.u, req.u.email_pendente, 'mudanca');
  res.json({ ok: true, mensagem: `Enviámos um novo link para ${a.esconderEmail(req.u.email_pendente)}.` });
});

// Cancelar a mudança de email (o link enviado deixa de servir)
router.delete('/eu/email', exigirLogin, async (req, res) => {
  await executar('UPDATE utilizadores SET email_pendente = NULL WHERE id = ?', [req.u.id]);
  await executar('UPDATE verificacao_email SET usado = 1 WHERE utilizador_id = ? AND usado = 0', [req.u.id]);
  if (req.u.email_pendente) await a.registarAtividade(req, req.u.id, 'email_cancelado', 'Mudança de email cancelada');
  res.json({ ok: true, mensagem: 'Mudança de email cancelada.' });
});

// Alterar a palavra-passe (ou definir uma, nas contas só com Google)
router.put('/eu/password', exigirLogin, async (req, res) => {
  const tinha = !!req.u.password_hash;
  // Quem já tem palavra-passe tem de escrever a atual (contas só com Google não têm)
  if (tinha && !(await compararPassword(String(req.body.atual || ''), req.u.password_hash))) {
    await a.registarAtividade(req, req.u.id, 'palavra_passe_falhada', 'Tentativa falhada de mudar a palavra-passe');
    a.falha(400, 'A palavra-passe atual está errada.', { erros: { atual: 'A palavra-passe atual está errada.' } });
  }
  const v = new a.Validacao();
  const nova = await v.campoAsync('nova', () => validarPassword(req.body.nova, dadosPessoais(req.u)));
  if (req.body.nova2 !== undefined && String(req.body.nova2) !== String(req.body.nova ?? '')) v.erro('nova2', 'As palavras-passe não coincidem.');
  if (nova && tinha && await compararPassword(nova, req.u.password_hash)) v.erro('nova', 'A palavra-passe nova tem de ser diferente da atual.');
  v.verificar();

  const hash = await bcrypt.hash(nova, 10);
  await executar('UPDATE utilizadores SET password_hash = ?, palavra_passe_alterada_em = NOW(), palavra_passe_fraca = 0 WHERE id = ?', [hash, req.u.id]);
  // Por omissão termina as sessões dos outros dispositivos
  const terminarOutras = req.body.terminarOutras === undefined ? true : a.booleano(req.body.terminarOutras);
  if (terminarOutras) await executar('DELETE FROM sessoes WHERE utilizador_id = ? AND id <> ?', [req.u.id, req.sessaoId]);
  await a.registarAtividade(req, req.u.id, tinha ? 'palavra_passe_alterada' : 'palavra_passe_definida',
    tinha ? 'Palavra-passe alterada' : 'Palavra-passe definida');
  // Email "A tua palavra-passe foi alterada" (com data, dispositivo e "Não foste tu?")
  await avisarPalavraPasseAlterada(req, req.u);
  res.json({
    ok: true,
    mensagem: (tinha ? 'Palavra-passe alterada.' : 'Palavra-passe definida.') + (terminarOutras ? ' As sessões dos outros dispositivos foram terminadas.' : ''),
  });
});

// Desligar a conta Google (ver routes/google.js)
router.delete('/eu/google', exigirLogin, desligarGoogle);

// Apagar a conta (pede a palavra-passe e o @nome escrito)
router.delete('/eu', exigirLogin, async (req, res) => {
  const v = new a.Validacao();
  if (req.u.password_hash && !(await compararPassword(String(req.body.password || ''), req.u.password_hash))) {
    v.erro('password', 'A palavra-passe está errada.');
  }
  // Para confirmar, o utilizador escreve o seu @nome
  const confirmacao = String(req.body.confirmacao || '').trim().replace(/^@/, '');
  if (confirmacao.toLowerCase() !== req.u.nome.toLowerCase()) v.erro('confirmacao', `Escreve @${req.u.nome} para confirmar.`);
  v.verificar();

  if (req.u.papel === 'admin') {
    const admins = await linha("SELECT COUNT(*) AS n FROM utilizadores WHERE papel = 'admin'");
    if (admins.n <= 1) a.falha(400, 'A conta de administrador não pode ser apagada: o TavDex precisa sempre de pelo menos um administrador.');
  }
  // As tabelas ligadas têm ON DELETE CASCADE: apaga sessões, atividade, listas, ...
  // A foto está na própria linha do utilizador, por isso também desaparece.
  await executar('DELETE FROM utilizadores WHERE id = ?', [req.u.id]);
  await terminarSessao(req, res);
  res.json({ ok: true, aviso: 'A tua conta foi apagada.' });
});

module.exports = router;
