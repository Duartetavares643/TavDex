// =====================================================================
//  TavDex – utilizadores, seguidores e definições (Passos 9 e 10)
//  Endereço base: /api/utilizadores
//  GET    /?q=                    procurar utilizadores (chat, pesquisa)
//  GET    /eu/definicoes          dados da página Definições
//  PUT    /eu/perfil              alterar perfil (devolve os erros de todos os campos)
//  POST   /eu/foto                carregar foto de perfil (multipart, campo "foto")
//  DELETE /eu/foto                remover a foto
//  POST   /eu/banner              carregar imagem própria para o banner (multipart, campo "banner")
//  DELETE /eu/banner              tirar a imagem (volta ao cenário escolhido)
//  PUT    /eu/email               mudar email
//  PUT    /eu/password            alterar ou definir palavra-passe
//  DELETE /eu/google              desligar a conta Google (igual a POST /api/conta/google/desligar)
//  DELETE /eu/sessoes/:id         terminar uma sessão noutro dispositivo
//  DELETE /eu/sessoes             terminar todas as outras sessões
//  DELETE /eu                     apagar a conta
//  GET    /:id/foto               a foto de perfil (JPEG)
//  GET    /:id/banner             a imagem do banner (JPEG)
//  GET    /:nome                  perfil público
//  POST   /:id/seguir             seguir / deixar de seguir (também em POST /api/seguir/:id)
// =====================================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const { linha, linhas, executar } = require('../db');
const a = require('./ajudas');
const { exigirLogin, terminarSessao } = require('./middleware');
const { enviarEmail, modeloEmail } = require('./email');
const { SQL_PROJETOS, listaDe, recomendacoes } = require('./consultas');
const { compararPassword, validarPassword, validarNome, avisarPalavraPasseAlterada } = require('./auth');
const { dadosPessoais } = require('./palavras-passe');
const { enviarConfirmacao, limiteEnvios } = require('./confirmacao-email');
const { desligarGoogle } = require('./google');
const { receberFoto, processarFoto, receberBanner, processarBanner } = require('./fotos');

const router = express.Router();
const MAX_ID = 2147483647;
const COLUNAS = a.colunasPublicas('u');

// ---------------------------------------------------------------------
// Procurar utilizadores pelo nome
// ---------------------------------------------------------------------
router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim().replace(/^@/, '').slice(0, 40);
  if (q.length < 1) return res.json({ utilizadores: [] });
  const lista = await linhas(`SELECT ${COLUNAS} FROM utilizadores u
    WHERE (u.nome LIKE ? OR u.nome_exibicao LIKE ?) AND u.bloqueado = 0 ORDER BY u.nome LIMIT 20`, ['%' + q + '%', '%' + q + '%']);
  res.json({ utilizadores: lista });
});

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

// Foto de perfil: validada pelo conteúdo, recortada e reduzida a 256×256 JPEG
router.post('/eu/foto', exigirLogin, receberFoto, async (req, res) => {
  const foto = await processarFoto(req.file && req.file.buffer);
  const versao = Math.floor(Date.now() / 1000);
  // A foto antiga é substituída (apagada) pela nova
  await executar('UPDATE utilizadores SET foto = ?, foto_versao = ? WHERE id = ?', [foto, versao, req.u.id]);
  res.json({ ok: true, foto_versao: versao, mensagem: 'Foto atualizada.' });
});

router.delete('/eu/foto', exigirLogin, async (req, res) => {
  await executar('UPDATE utilizadores SET foto = NULL, foto_versao = 0 WHERE id = ?', [req.u.id]);
  res.json({ ok: true, mensagem: 'Foto removida.' });
});

// Banner com uma imagem própria: validada pelo conteúdo e guardada em 1500×500 JPEG.
// Enquanto houver imagem, ela aparece no lugar do cenário desenhado.
router.post('/eu/banner', exigirLogin, receberBanner, async (req, res) => {
  const banner = await processarBanner(req.file && req.file.buffer);
  const versao = Math.floor(Date.now() / 1000);
  await executar('UPDATE utilizadores SET banner = ?, banner_versao = ? WHERE id = ?', [banner, versao, req.u.id]);
  res.json({ ok: true, banner_versao: versao, mensagem: 'Banner atualizado.' });
});

router.delete('/eu/banner', exigirLogin, async (req, res) => {
  await executar('UPDATE utilizadores SET banner = NULL, banner_versao = 0 WHERE id = ?', [req.u.id]);
  res.json({ ok: true, mensagem: 'Imagem do banner removida.' });
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

router.delete('/eu/google', exigirLogin, desligarGoogle);

router.delete('/eu/sessoes/:id', exigirLogin, async (req, res) => {
  const id = a.inteiro(req.params.id, 'Sessão', 1, MAX_ID);
  if (id === req.sessaoId) a.falha(400, 'Para terminar esta sessão usa "Terminar sessão".');
  // "AND utilizador_id = ?": ninguém consegue terminar sessões de outra pessoa
  const s = await linha('SELECT dispositivo FROM sessoes WHERE id = ? AND utilizador_id = ?', [id, req.u.id]);
  if (!s) a.falha(404, 'Essa sessão já não existe.');
  await executar('DELETE FROM sessoes WHERE id = ? AND utilizador_id = ?', [id, req.u.id]);
  await a.registarAtividade(req, req.u.id, 'sessao_terminada', `Sessão terminada noutro dispositivo (${s.dispositivo})`);
  res.json({ ok: true });
});

router.delete('/eu/sessoes', exigirLogin, async (req, res) => {
  await executar('DELETE FROM sessoes WHERE utilizador_id = ? AND id <> ?', [req.u.id, req.sessaoId]);
  await a.registarAtividade(req, req.u.id, 'sessoes_terminadas', 'Sessões terminadas noutros dispositivos');
  res.json({ ok: true });
});

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

// ---------------------------------------------------------------------
// Foto de perfil (pública). O ?v= muda quando a foto muda, por isso o
// browser pode guardá-la em cache durante muito tempo.
// ---------------------------------------------------------------------
router.get('/:id/foto', async (req, res) => {
  const id = a.inteiro(req.params.id, 'Utilizador', 1, MAX_ID);
  const r = await linha('SELECT foto FROM utilizadores WHERE id = ?', [id]);
  if (!r || !r.foto) return res.status(404).end();
  res.set('Content-Type', 'image/jpeg');
  res.set('Cache-Control', req.query.v ? 'public, max-age=31536000, immutable' : 'no-cache');
  res.send(r.foto);
});

// Imagem do banner (pública), com a mesma cache da foto
router.get('/:id/banner', async (req, res) => {
  const id = a.inteiro(req.params.id, 'Utilizador', 1, MAX_ID);
  const r = await linha('SELECT banner FROM utilizadores WHERE id = ?', [id]);
  if (!r || !r.banner) return res.status(404).end();
  res.set('Content-Type', 'image/jpeg');
  res.set('Cache-Control', req.query.v ? 'public, max-age=31536000, immutable' : 'no-cache');
  res.send(r.banner);
});

// ---------------------------------------------------------------------
// Perfil público (qualquer visitante pode ver)
// ---------------------------------------------------------------------
// Seguidores ou "a seguir" de uma conta, 20 de cada vez ("Ver mais")
const POR_PAGINA_SEGUIDORES = 20;
function listaSeguidores(id, tipo, pagina = 1) {
  const [juntar, filtrar] = tipo === 'seguidores' ? ['s.seguidor_id', 's.seguido_id'] : ['s.seguido_id', 's.seguidor_id'];
  const desde = (Math.max(1, pagina) - 1) * POR_PAGINA_SEGUIDORES;
  return linhas(`SELECT ${COLUNAS} FROM seguidores s JOIN utilizadores u ON u.id = ${juntar}
    WHERE ${filtrar} = ? ORDER BY s.criado_em DESC LIMIT ${POR_PAGINA_SEGUIDORES} OFFSET ${desde}`, [id]);
}

// Procura o perfil pelo @nome (sem distinguir maiúsculas: /perfil/duarte = @Duarte)
async function procurarPerfil(nome) {
  return linha(`SELECT id, nome, nome_exibicao, cor, tema_banner, foto_versao, banner_versao, papel, bio, localizacao, criado_em,
      mostrar_listas, mostrar_seguidores
    FROM utilizadores WHERE nome = ?`, [String(nome).replace(/^@/, '').slice(0, 40)]);
}

// @nome antigo (mudado há menos de 30 dias)? Devolve o @nome novo, ou null
async function nomeNovo(nomeAntigo) {
  const r = await linha(`SELECT u.nome FROM nomes_antigos n JOIN utilizadores u ON u.id = n.utilizador_id
    WHERE n.nome = ? AND n.data >= NOW() - INTERVAL 30 DAY`, [String(nomeAntigo).replace(/^@/, '').slice(0, 40)]);
  return r ? r.nome : null;
}

// Mais seguidores ou "a seguir" (botão "Ver mais"): ?tipo=seguidores|a_seguir&p=2
// Respeita a privacidade, tal como o perfil.
router.get('/:nome/seguidores', async (req, res) => {
  const p = await procurarPerfil(req.params.nome);
  if (!p) a.falha(404, 'Este perfil não existe.');
  const meu = !!req.u && req.u.id === p.id;
  if (!meu && !p.mostrar_seguidores) return res.json({ utilizadores: [], privado: true });
  const tipo = req.query.tipo === 'a_seguir' ? 'a_seguir' : 'seguidores';
  const pagina = Math.max(1, Math.min(500, Math.floor(Number(req.query.p)) || 1));
  res.json({ utilizadores: await listaSeguidores(p.id, tipo, pagina) });
});

router.get('/:nome', async (req, res) => {
  const p = await procurarPerfil(req.params.nome);
  if (!p) {
    // @nome antigo: a página vai para o perfil novo
    const novo = await nomeNovo(req.params.nome);
    if (novo) return res.json({ redirecionar: novo });
    a.falha(404, 'Este perfil não existe.');
  }
  p.tema_banner = a.temaBanner(p.tema_banner);
  const id = p.id;
  const meu = !!req.u && req.u.id === id;
  // Privacidade escolhida nas Definições (o dono vê sempre tudo).
  // É a API que esconde: não chega esconder no browser.
  const verListas = meu || !!p.mostrar_listas;
  const verSeguidores = meu || !!p.mostrar_seguidores;

  const [nSeg, nASeg, seguidores, aSeguir, favoritos, paraVer, vistos, avaliacoes, projetos, generos, distribuicao, generosAvaliados, escolhidos, relacao] = await Promise.all([
    linha('SELECT COUNT(*) AS n FROM seguidores WHERE seguido_id = ?', [id]),
    linha('SELECT COUNT(*) AS n FROM seguidores WHERE seguidor_id = ?', [id]),
    verSeguidores ? listaSeguidores(id, 'seguidores') : [],
    verSeguidores ? listaSeguidores(id, 'a_seguir') : [],
    verListas ? listaDe(id, 'favorito') : [],
    verListas ? listaDe(id, 'ver') : [],
    listaDe(id, 'visto'),   // o número de vistos aparece sempre; a lista só com permissão
    linhas(`SELECT a.id, a.nota, a.review, a.spoiler, a.criado_em, t.id AS titulo_id, t.nome AS titulo
            FROM avaliacoes a JOIN titulos t ON t.id = a.titulo_id WHERE a.utilizador_id = ? ORDER BY a.criado_em DESC`, [id]),
    linhas(`${SQL_PROJETOS} WHERE p.dono_id = ? OR p.id IN (SELECT projeto_id FROM projeto_equipa WHERE utilizador_id = ?)
            ORDER BY p.criado_em DESC`, [id, id]),
    // Géneros preferidos: géneros dos favoritos e das avaliações com 4 ou 5 estrelas
    linhas(`SELECT g.nome, COUNT(*) AS n FROM generos g JOIN titulo_generos tg ON tg.genero_id = g.id
            WHERE tg.titulo_id IN (SELECT titulo_id FROM listas WHERE utilizador_id = ? AND tipo = 'favorito')
               OR tg.titulo_id IN (SELECT titulo_id FROM avaliacoes WHERE utilizador_id = ? AND nota >= 4)
            GROUP BY g.nome ORDER BY n DESC, g.nome LIMIT 5`, [id, id]),
    // Resumo: quantas avaliações de cada nota (1 a 5 estrelas)
    linhas('SELECT nota, COUNT(*) AS n FROM avaliacoes WHERE utilizador_id = ? GROUP BY nota', [id]),
    // Resumo: os 3 géneros que mais avalia
    linhas(`SELECT g.nome, COUNT(*) AS n FROM avaliacoes a JOIN titulo_generos tg ON tg.titulo_id = a.titulo_id
            JOIN generos g ON g.id = tg.genero_id WHERE a.utilizador_id = ? GROUP BY g.nome ORDER BY n DESC, g.nome LIMIT 3`, [id]),
    // Géneros favoritos escolhidos pela pessoa (etiquetas por baixo da biografia)
    linhas(`SELECT g.id, g.nome FROM utilizador_generos ug JOIN generos g ON g.id = ug.genero_id
            WHERE ug.utilizador_id = ? ORDER BY g.nome`, [id]),
    // Eu sigo esta pessoa? Ela segue-me? (independente da privacidade das listas)
    req.u ? linha(`SELECT EXISTS(SELECT 1 FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?) AS sigo,
                          EXISTS(SELECT 1 FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?) AS segue_me`,
      [req.u.id, id, id, req.u.id]) : null,
  ]);

  // Média das estrelas que dá e distribuição de 1 a 5
  const porNota = [1, 2, 3, 4, 5].map(n => Number((distribuicao.find(d => Number(d.nota) === n) || {}).n || 0));
  const total = porNota.reduce((s, n) => s + n, 0);
  const mediaNotas = total ? porNota.reduce((s, n, i) => s + n * (i + 1), 0) / total : null;

  // O dono vê tudo, mas com a nota "Só tu vês isto" nas listas que escondeu dos outros
  const privacidade = {
    listas: !verListas, seguidores: !verSeguidores,
    so_tu_listas: meu && !p.mostrar_listas, so_tu_seguidores: meu && !p.mostrar_seguidores,
  };
  delete p.mostrar_listas;
  delete p.mostrar_seguidores;
  res.json({
    perfil: p,
    meu,
    sigo: !!(relacao && relacao.sigo),
    segue_te: !meu && !!(relacao && relacao.segue_me),
    contagens: {
      seguidores: nSeg.n, a_seguir: nASeg.n, avaliacoes: avaliacoes.length,
      vistos: vistos.length, projetos: projetos.length,
    },
    // listas/seguidores = escondidos a quem vê (o dono escolheu não mostrar)
    privacidade,
    resumo: { media: mediaNotas, por_nota: porNota, generos: generosAvaliados, recentes: avaliacoes.slice(0, 5) },
    generos_escolhidos: escolhidos,
    seguidores, aSeguir, favoritos, paraVer,
    vistos: verListas ? vistos : [],
    avaliacoes, projetos, generos,
    por_pagina_seguidores: POR_PAGINA_SEGUIDORES,
    recomendados: meu ? await recomendacoes(id, 10) : [],
  });
});

// ---------------------------------------------------------------------
// Seguir / deixar de seguir (alterna). Devolve { a_seguir, seguidores }.
// ---------------------------------------------------------------------
async function seguir(req, res) {
  const id = a.inteiro(req.params.id, 'Utilizador', 1, MAX_ID);
  if (id === req.u.id) a.falha(400, 'Não te podes seguir a ti próprio.');
  const alvo = await linha('SELECT id FROM utilizadores WHERE id = ?', [id]);
  if (!alvo) a.falha(404, 'Este perfil não existe.');

  const jaSigo = await linha('SELECT 1 FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?', [req.u.id, id]);
  if (jaSigo) {
    await executar('DELETE FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?', [req.u.id, id]);
  } else {
    await executar('INSERT INTO seguidores (seguidor_id, seguido_id) VALUES (?, ?)', [req.u.id, id]);
    // Notificação (não é criada se a pessoa silenciou este tipo)
    await a.notificar(id, 'seguidor', `@${req.u.nome} começou a seguir-te.`, `perfil.html?u=${encodeURIComponent(req.u.nome)}`, req.u.id);
  }
  const n = await linha('SELECT COUNT(*) AS n FROM seguidores WHERE seguido_id = ?', [id]);
  res.json({ a_seguir: !jaSigo, sigo: !jaSigo, seguidores: n.n });
}
router.post('/:id/seguir', exigirLogin, seguir);

module.exports = router;
module.exports.seguir = seguir;
module.exports.nomeNovo = nomeNovo;
