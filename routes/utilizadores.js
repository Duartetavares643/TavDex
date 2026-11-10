// =====================================================================
//  TavDex – utilizadores, seguidores e definições (Passos 9 e 10)
//  Endereço base: /api/utilizadores
//  GET    /?q=                    procurar utilizadores (chat, pesquisa)
//  GET    /eu/definicoes          dados da página Definições
//  PUT    /eu/perfil              alterar perfil (devolve os erros de todos os campos)
//  POST   /eu/foto                carregar foto de perfil (multipart, campo "foto")
//  DELETE /eu/foto                remover a foto
//  PUT    /eu/email               mudar email
//  PUT    /eu/password            alterar ou definir palavra-passe
//  DELETE /eu/google              desligar a conta Google (igual a POST /api/conta/google/desligar)
//  DELETE /eu/sessoes/:id         terminar uma sessão noutro dispositivo
//  DELETE /eu/sessoes             terminar todas as outras sessões
//  DELETE /eu                     apagar a conta
//  GET    /:id/foto               a foto de perfil (JPEG)
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
const { compararPassword, validarPassword, validarNome } = require('./auth');
const { desligarGoogle } = require('./google');
const { receberFoto, processarFoto } = require('./fotos');

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
  res.json({
    id: u.id, nome: u.nome, nome_exibicao: u.nome_exibicao || '', email: u.email, bio: u.bio, localizacao: u.localizacao,
    cor: u.cor, tema_banner: a.temaBanner(u.tema_banner), foto_versao: Number(u.foto_versao) || 0, papel: u.papel, criado_em: u.criado_em,
    notif_email: !!u.notif_email, tem_password: !!u.password_hash, google_email: u.google_id ? u.google_email : null,
    // Resumo "Proteção da conta"
    protecao: {
      email_verificado: !!u.email_verificado,
      tem_password: !!u.password_hash,
      google: !!u.google_id,
      sessoes: sessoes.length,
    },
    sessoes, atividade, silenciadas,
    cores: a.CORES_AVATAR,
    temas_banner: a.TEMAS_BANNER,
  });
});

router.put('/eu/perfil', exigirLogin, async (req, res) => {
  const v = new a.Validacao();
  const nomeExibicao = v.campo('nome_exibicao', () => a.texto(req.body.nome_exibicao, 'Nome', 2, 50));
  const nome = v.campo('nome', () => validarNome(req.body.nome));
  const cor = v.campo('cor', () => a.inteiro(req.body.cor, 'Cor', 0, 359));
  // Cenário do banner: só um dos 4 valores (se não vier, mantém o atual)
  const temaBanner = req.body.tema_banner === undefined ? a.temaBanner(req.u.tema_banner) : req.body.tema_banner;
  if (!a.TEMAS_BANNER.includes(temaBanner)) v.erro('tema_banner', 'Escolhe um dos cenários.');
  const localizacao = v.campo('localizacao', () => a.texto(req.body.localizacao, 'Localização', 0, 40));
  const bio = v.campo('bio', () => a.texto(req.body.bio, 'Biografia', 0, 160));
  const notifEmail = a.booleano(req.body.notif_email) ? 1 : 0;
  // O @nome é único (sem distinguir maiúsculas), mas pode manter o seu
  if (nome && await linha('SELECT id FROM utilizadores WHERE nome = ? AND id <> ?', [nome, req.u.id])) {
    v.erro('nome', 'Esse @nome já está a ser usado.');
  }
  v.verificar();

  await executar('UPDATE utilizadores SET nome = ?, nome_exibicao = ?, cor = ?, tema_banner = ?, localizacao = ?, bio = ?, notif_email = ? WHERE id = ?',
    [nome, nomeExibicao, cor, temaBanner, localizacao, bio, notifEmail, req.u.id]);
  if (nome !== req.u.nome) await a.registarAtividade(req, req.u.id, 'nome_alterado', `@nome alterado (de @${req.u.nome} para @${nome})`);
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

router.put('/eu/email', exigirLogin, async (req, res) => {
  const novo = a.email(req.body.email);
  if (req.u.password_hash && !(await compararPassword(String(req.body.password || ''), req.u.password_hash))) {
    await a.registarAtividade(req, req.u.id, 'email_falhado', 'Tentativa falhada de mudar o email (palavra-passe errada)');
    a.falha(400, 'A palavra-passe atual está errada.', { erros: { password: 'A palavra-passe atual está errada.' } });
  }
  if (novo === req.u.email) a.falha(400, 'Esse já é o teu email.', { erros: { email: 'Esse já é o teu email.' } });
  if (await linha('SELECT id FROM utilizadores WHERE email = ?', [novo])) {
    a.falha(400, 'Já existe uma conta com esse email.', { erros: { email: 'Já existe uma conta com esse email.' } });
  }

  // O email novo ainda não está confirmado
  await executar('UPDATE utilizadores SET email = ?, email_verificado = 0 WHERE id = ?', [novo, req.u.id]);
  await a.registarAtividade(req, req.u.id, 'email_alterado', `Email alterado (de ${req.u.email} para ${novo})`);
  // Aviso para o email antigo (se não foi o dono, fica a saber)
  const nome = req.u.nome_exibicao || req.u.nome;
  await enviarEmail(req.u.email, 'TavDex – o email da tua conta foi alterado',
    `Olá ${nome},\n\nO email da tua conta TavDex (@${req.u.nome}) foi alterado para ${novo}.\nSe não foste tu, recupera a conta e contacta a administração do TavDex.`,
    modeloEmail({
      titulo: 'O email da tua conta foi alterado',
      paragrafos: [`Olá ${nome},`, `O email da tua conta TavDex (@${req.u.nome}) foi alterado para ${novo}.`],
      nota: 'Se não foste tu, recupera a conta e contacta a administração do TavDex.',
    }));
  res.json({ ok: true, mensagem: 'Email alterado. Enviámos um aviso para o email antigo.' });
});

router.put('/eu/password', exigirLogin, async (req, res) => {
  const tinha = !!req.u.password_hash;
  // Quem já tem palavra-passe tem de escrever a atual (contas só com Google não têm)
  if (tinha && !(await compararPassword(String(req.body.atual || ''), req.u.password_hash))) {
    await a.registarAtividade(req, req.u.id, 'palavra_passe_falhada', 'Tentativa falhada de mudar a palavra-passe');
    a.falha(400, 'A palavra-passe atual está errada.', { erros: { atual: 'A palavra-passe atual está errada.' } });
  }
  const v = new a.Validacao();
  const nova = v.campo('nova', () => validarPassword(req.body.nova, 'Palavra-passe nova'));
  if (req.body.nova2 !== undefined && String(req.body.nova2) !== String(req.body.nova ?? '')) v.erro('nova2', 'As palavras-passe não são iguais.');
  if (nova && tinha && await compararPassword(nova, req.u.password_hash)) v.erro('nova', 'A palavra-passe nova tem de ser diferente da atual.');
  v.verificar();

  const hash = await bcrypt.hash(nova, 10);
  await executar('UPDATE utilizadores SET password_hash = ? WHERE id = ?', [hash, req.u.id]);
  // Por omissão termina as sessões dos outros dispositivos
  const terminarOutras = req.body.terminarOutras === undefined ? true : a.booleano(req.body.terminarOutras);
  if (terminarOutras) await executar('DELETE FROM sessoes WHERE utilizador_id = ? AND id <> ?', [req.u.id, req.sessaoId]);
  await a.registarAtividade(req, req.u.id, tinha ? 'palavra_passe_alterada' : 'palavra_passe_definida',
    tinha ? 'Palavra-passe alterada' : 'Palavra-passe definida');
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
  await terminarSessao(req, 'A tua conta foi apagada.');
  res.json({ ok: true });
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

// ---------------------------------------------------------------------
// Perfil público (qualquer visitante pode ver)
// ---------------------------------------------------------------------
router.get('/:nome', async (req, res) => {
  const p = await linha(`SELECT id, nome, nome_exibicao, cor, tema_banner, foto_versao, papel, bio, localizacao, criado_em
    FROM utilizadores WHERE nome = ?`, [String(req.params.nome).replace(/^@/, '')]);
  if (!p) a.falha(404, 'Este perfil não existe.');
  p.tema_banner = a.temaBanner(p.tema_banner);
  const id = p.id;
  const meu = !!req.u && req.u.id === id;

  const [seguidores, aSeguir, favoritos, paraVer, vistos, avaliacoes, projetos, generos] = await Promise.all([
    linhas(`SELECT ${COLUNAS} FROM seguidores s JOIN utilizadores u ON u.id = s.seguidor_id
            WHERE s.seguido_id = ? ORDER BY s.criado_em DESC`, [id]),
    linhas(`SELECT ${COLUNAS} FROM seguidores s JOIN utilizadores u ON u.id = s.seguido_id
            WHERE s.seguidor_id = ? ORDER BY s.criado_em DESC`, [id]),
    listaDe(id, 'favorito'),
    listaDe(id, 'ver'),
    listaDe(id, 'visto'),
    linhas(`SELECT a.id, a.nota, a.review, a.spoiler, a.criado_em, t.id AS titulo_id, t.nome AS titulo
            FROM avaliacoes a JOIN titulos t ON t.id = a.titulo_id WHERE a.utilizador_id = ? ORDER BY a.criado_em DESC`, [id]),
    linhas(`${SQL_PROJETOS} WHERE p.dono_id = ? OR p.id IN (SELECT projeto_id FROM projeto_equipa WHERE utilizador_id = ?)
            ORDER BY p.criado_em DESC`, [id, id]),
    // Géneros preferidos: géneros dos favoritos e das avaliações com 4 ou 5 estrelas
    linhas(`SELECT g.nome, COUNT(*) AS n FROM generos g JOIN titulo_generos tg ON tg.genero_id = g.id
            WHERE tg.titulo_id IN (SELECT titulo_id FROM listas WHERE utilizador_id = ? AND tipo = 'favorito')
               OR tg.titulo_id IN (SELECT titulo_id FROM avaliacoes WHERE utilizador_id = ? AND nota >= 4)
            GROUP BY g.nome ORDER BY n DESC, g.nome LIMIT 5`, [id, id]),
  ]);

  res.json({
    perfil: p,
    meu,
    sigo: !!req.u && seguidores.some(s => s.id === req.u.id),
    contagens: {
      seguidores: seguidores.length, a_seguir: aSeguir.length, avaliacoes: avaliacoes.length,
      vistos: vistos.length, projetos: projetos.length,
    },
    seguidores, aSeguir, favoritos, paraVer, vistos, avaliacoes, projetos, generos,
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
