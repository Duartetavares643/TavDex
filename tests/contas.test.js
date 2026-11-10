// =====================================================================
//  TavDex – testes automáticos dos Passos 4 a 10 (contas, sessões, perfil)
//  Correr com:  npm test
//  Precisa do MySQL ligado e da base de dados TavDex com os scripts 01, 02, extras e 03.
//  Cria contas "teste_..." e apaga-as no fim (não mexe nas contas verdadeiras).
// =====================================================================
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { arrancar, parar, Cliente, criarUtilizador, apagarTestes, ultimoEmail, linha, linhas, executar } = require('./ajuda');
const { voltarSeguro, nomeDispositivo } = require('../routes/ajudas');

let base;
before(async () => { await apagarTestes(); base = await arrancar(); });
after(parar);

// ---------------------------------------------------------------------
describe('Funções de segurança', () => {
  it('voltarSeguro só aceita caminhos internos (contra open redirect)', () => {
    assert.equal(voltarSeguro('/titulo.html?id=3'), '/titulo.html?id=3');
    assert.equal(voltarSeguro('//site-mau.com'), '/');
    assert.equal(voltarSeguro('/\\site-mau.com'), '/');
    assert.equal(voltarSeguro('https://site-mau.com'), '/');
    assert.equal(voltarSeguro('javascript:alert(1)'), '/');
    assert.equal(voltarSeguro('/login.html?voltar=/x'), '/');
    assert.equal(voltarSeguro('/registar'), '/');
    assert.equal(voltarSeguro(undefined), '/');
  });

  it('nomeDispositivo dá um nome legível', () => {
    assert.equal(nomeDispositivo('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36'), 'Windows · Chrome');
    assert.equal(nomeDispositivo('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'), 'Telemóvel Android · Chrome');
    assert.equal(nomeDispositivo('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'), 'iPhone · Safari');
  });
});

// ---------------------------------------------------------------------
describe('Passo 4 – modo visitante', () => {
  it('o visitante vê o início, o catálogo, um filme e um perfil sem login', async () => {
    const v = new Cliente(base);
    assert.equal((await v.get('/')).status, 200);
    assert.equal((await v.get('/catalogo.html')).status, 200);
    const inicio = await v.get('/api/titulos/inicio');
    assert.equal(inicio.status, 200);
    assert.ok(inicio.dados.top10.length > 0);
    assert.deepEqual(inicio.dados.recomendados, [], 'o visitante não recebe recomendações (vê o convite para criar conta)');
    assert.equal((await v.get('/api/titulos/1')).status, 200);
    assert.equal((await v.get('/api/utilizadores/DuarteT')).status, 200);
  });

  it('as filas de género são Ação, Drama e Ficção Científica', async () => {
    const r = await new Cliente(base).get('/api/titulos/inicio');
    assert.deepEqual(r.dados.generos.map(g => g.nome), ['Ação', 'Drama', 'Ficção Científica']);
  });

  it('ações que precisam de conta respondem 401 login_necessario', async () => {
    const v = new Cliente(base);
    for (const caminho of ['/api/seguir/1', '/api/listas/1/favorito', '/api/listas/1/ver']) {
      const r = await v.post(caminho);
      assert.equal(r.status, 401, caminho);
      assert.equal(r.dados.erro, 'login_necessario');
    }
  });

  it('/definicoes sem sessão leva ao login e guarda a página para voltar', async () => {
    const v = new Cliente(base);
    for (const caminho of ['/definicoes', '/definicoes.html?tab=seguranca']) {
      const r = await v.get(caminho);
      assert.equal(r.status, 302);
      assert.equal(r.local, '/login.html?voltar=' + encodeURIComponent(caminho));
    }
  });

  it('os atalhos /entrar, /perfil/:nome, /privacidade e /termos funcionam', async () => {
    const v = new Cliente(base);
    assert.equal((await v.get('/entrar')).status, 200);
    assert.equal((await v.get('/privacidade')).status, 200);
    assert.equal((await v.get('/termos')).status, 200);
    const p = await v.get('/perfil/DuarteT');
    assert.equal(p.status, 302);
    assert.equal(p.local, '/perfil.html?u=DuarteT');
  });
});

// ---------------------------------------------------------------------
describe('Passo 5 – registo', () => {
  it('cria a conta, entra logo e regista "Conta criada"', async () => {
    const c = new Cliente(base);
    const s = Date.now().toString(36);
    const r = await c.post('/api/auth/registar', {
      nome_exibicao: 'Teste Registo', nome: `teste_r${s}`, email: `teste_r${s}@exemplo.pt`,
      password: 'abc12345', password2: 'abc12345', aceito: true,
    });
    assert.equal(r.status, 201, JSON.stringify(r.dados));
    assert.equal(r.dados.mensagem, 'Conta criada! Bem-vindo ao TavDex, Teste Registo.');
    const eu = await c.get('/api/auth/eu');
    assert.equal(eu.dados.u.nome, `teste_r${s}`);
    const u = await linha('SELECT * FROM utilizadores WHERE id = ?', [eu.dados.u.id]);
    assert.ok([330, 0, 25, 45, 150, 199, 215, 270].includes(u.cor));
    assert.ok(u.password_hash.startsWith('$2'), 'palavra-passe guardada com bcrypt');
    const at = await linha('SELECT descricao FROM atividade_conta WHERE utilizador_id = ? AND tipo = ?', [u.id, 'registo']);
    assert.equal(at.descricao, 'Conta criada');
  });

  it('recusa email ou @nome repetidos (sem distinguir maiúsculas) e devolve todos os erros juntos', async () => {
    const existente = await criarUtilizador();
    const r = await new Cliente(base).post('/api/auth/registar', {
      nome_exibicao: 'X', nome: existente.nome.toUpperCase(), email: existente.email,
      password: 'semnumeros', password2: 'outra', aceito: false,
    });
    assert.equal(r.status, 400);
    assert.deepEqual(Object.keys(r.dados.erros).sort(), ['aceito', 'email', 'nome', 'nome_exibicao', 'password', 'password2']);
    assert.equal(r.dados.erros.nome, 'Esse @nome já está a ser usado.');
    assert.equal(r.dados.erros.email, 'Já existe uma conta com esse email.');
  });
});

// ---------------------------------------------------------------------
describe('Passo 6 – login', () => {
  it('entra com o @nome ou com o email, cria a sessão do dispositivo e regista na atividade', async () => {
    const u = await criarUtilizador();
    const c = new Cliente(base);
    await c.entrar('@' + u.nome, u.password);
    const s = await linha('SELECT dispositivo, via FROM sessoes WHERE utilizador_id = ?', [u.id]);
    assert.equal(s.dispositivo, 'Windows · Chrome');
    assert.equal(s.via, 'palavra_passe');
    assert.ok((await linha('SELECT ultimo_login FROM utilizadores WHERE id = ?', [u.id])).ultimo_login);
    const at = await linha("SELECT descricao FROM atividade_conta WHERE utilizador_id = ? AND tipo = 'login'", [u.id]);
    assert.equal(at.descricao, 'Sessão iniciada com palavra-passe · Windows · Chrome');
    await new Cliente(base).entrar(u.email.toUpperCase(), u.password);
  });

  it('a mensagem de erro é sempre igual, exista a conta ou não', async () => {
    const u = await criarUtilizador();
    const a = await new Cliente(base).post('/api/auth/login', { login: u.nome, password: 'errada123' });
    const b = await new Cliente(base).post('/api/auth/login', { login: 'ninguem_' + Date.now(), password: 'errada123' });
    assert.equal(a.status, 400);
    assert.equal(a.dados.erro, 'Nome de utilizador/email ou palavra-passe incorretos.');
    assert.equal(b.dados.erro, a.dados.erro);
  });

  it('5 falhas bloqueiam durante 15 minutos (mesmo com a palavra-passe certa)', async () => {
    const u = await criarUtilizador();
    const c = new Cliente(base);
    const respostas = [];
    for (let i = 0; i < 5; i++) respostas.push(await c.post('/api/auth/login', { login: u.email, password: 'errada123' }));
    assert.equal(respostas[2].dados.erro, 'Nome de utilizador/email ou palavra-passe incorretos. Restam 2 tentativas antes do bloqueio.');
    assert.equal(respostas[3].dados.erro, 'Nome de utilizador/email ou palavra-passe incorretos. Restam 1 tentativa antes do bloqueio.');
    assert.equal(respostas[4].status, 429);
    assert.equal(respostas[4].dados.codigo, 'bloqueado');
    const certa = await c.post('/api/auth/login', { login: u.email, password: u.password });
    assert.equal(certa.status, 429);
    assert.equal(certa.dados.erro, 'Demasiadas tentativas falhadas. Espera 15 minutos ou recupera a palavra-passe.');
  });

  it('conta suspensa não entra', async () => {
    const u = await criarUtilizador({ bloqueado: 1 });
    const r = await new Cliente(base).post('/api/auth/login', { login: u.nome, password: u.password });
    assert.equal(r.status, 403);
    assert.equal(r.dados.erro, 'Esta conta foi suspensa. Contacta a administração do TavDex.');
  });
});

// ---------------------------------------------------------------------
describe('Passo 7 – terminar sessão e sessões por dispositivo', () => {
  it('logout só por POST com CSRF e deixa a mensagem para a página seguinte', async () => {
    const u = await criarUtilizador();
    const c = new Cliente(base);
    await c.entrar(u.nome, u.password);
    // Sem token CSRF não termina
    const cookies = Object.entries(c.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    const semToken = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { cookie: cookies } });
    assert.equal(semToken.status, 403);
    assert.equal((await c.post('/api/auth/logout')).status, 200);
    const eu = await c.get('/api/auth/eu');
    assert.equal(eu.dados.u, null);
    assert.equal(eu.dados.aviso, 'Sessão terminada. Podes continuar a explorar o TavDex sem conta.');
    assert.equal((await linha('SELECT COUNT(*) AS n FROM sessoes WHERE utilizador_id = ?', [u.id])).n, 0);
  });

  it('terminar a sessão de outro browser põe esse browser como visitante', async () => {
    const u = await criarUtilizador();
    const pc = new Cliente(base);
    const telemovel = new Cliente(base, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile/15E148 Safari/604.1');
    await pc.entrar(u.nome, u.password);
    await telemovel.entrar(u.nome, u.password);
    const def = await pc.get('/api/utilizadores/eu/definicoes');
    const outra = def.dados.sessoes.find(s => !s.atual);
    assert.equal(outra.dispositivo, 'iPhone · Safari');
    assert.equal((await pc.delete('/api/utilizadores/eu/sessoes/' + outra.id)).status, 200);
    const eu = await telemovel.get('/api/auth/eu');
    assert.equal(eu.dados.u, null);
    assert.equal(eu.dados.aviso, 'A tua sessão foi terminada. Inicia sessão outra vez.');
  });

  it('ninguém consegue terminar sessões de outra pessoa', async () => {
    const a = await criarUtilizador();
    const b = await criarUtilizador();
    const ca = new Cliente(base);
    const cb = new Cliente(base);
    await ca.entrar(a.nome, a.password);
    await cb.entrar(b.nome, b.password);
    const sessaoB = await linha('SELECT id FROM sessoes WHERE utilizador_id = ?', [b.id]);
    assert.equal((await ca.delete('/api/utilizadores/eu/sessoes/' + sessaoB.id)).status, 404);
    assert.notEqual((await cb.get('/api/auth/eu')).dados.u, null);
  });
});

// ---------------------------------------------------------------------
describe('Passo 8 – recuperação da palavra-passe', () => {
  it('com um email inexistente dá a mesma mensagem', async () => {
    const r = await new Cliente(base).post('/api/auth/recuperar', { email: 'ninguem_x@exemplo.pt' });
    assert.equal(r.status, 200);
    assert.equal(r.dados.mensagem, 'Se existir uma conta TavDex com o email ninguem_x@exemplo.pt, vais receber dentro de momentos um link para definir uma nova palavra-passe. O link é válido durante 30 minutos.');
    assert.equal(ultimoEmail('ninguem_x@exemplo.pt'), null);
  });

  it('o link muda a palavra-passe, termina as sessões e não serve duas vezes', async () => {
    const u = await criarUtilizador();
    const outro = new Cliente(base);
    await outro.entrar(u.nome, u.password);

    await new Cliente(base).post('/api/auth/recuperar', { email: u.email });
    const email = ultimoEmail(u.email);
    assert.ok(email, 'o email foi "enviado" (ficheiro)');
    const token = email.match(/token=([a-f0-9]{64})/)[1];
    assert.equal((await linha('SELECT COUNT(*) AS n FROM recuperacoes WHERE token_hash = ?', [token])).n, 0, 'na BD fica só o hash');

    const c = new Cliente(base);
    assert.equal((await c.get('/api/auth/repor/' + token)).dados.valido, true);
    const r = await c.post('/api/auth/repor', { token, password: 'NovaPass123', password2: 'NovaPass123' });
    assert.equal(r.status, 200);
    assert.equal(r.dados.mensagem, 'Palavra-passe alterada! Por segurança, terminámos todas as sessões desta conta.');
    assert.equal((await outro.get('/api/auth/eu')).dados.u, null, 'a outra sessão terminou');
    assert.equal((await linha('SELECT email_verificado FROM utilizadores WHERE id = ?', [u.id])).email_verificado, 1);
    await new Cliente(base).entrar(u.nome, 'NovaPass123');

    const outraVez = await c.post('/api/auth/repor', { token, password: 'Outra12345', password2: 'Outra12345' });
    assert.equal(outraVez.status, 400);
    assert.equal(outraVez.dados.erro, 'Este link não é válido ou já expirou.');
  });

  it('um link com mais de 30 minutos não funciona e um pedido novo anula os anteriores', async () => {
    const u = await criarUtilizador();
    const c = new Cliente(base);
    await c.post('/api/auth/recuperar', { email: u.email });
    const token1 = ultimoEmail(u.email).match(/token=([a-f0-9]{64})/)[1];
    await new Promise(r => setTimeout(r, 1100));   // os ficheiros dos emails têm a data no nome
    await c.post('/api/auth/recuperar', { email: u.email });
    const token2 = ultimoEmail(u.email).match(/token=([a-f0-9]{64})/)[1];
    assert.notEqual(token1, token2);
    assert.equal((await c.get('/api/auth/repor/' + token1)).dados.valido, false, 'o primeiro link foi anulado');
    await executar('UPDATE recuperacoes SET expira_em = NOW() - INTERVAL 1 MINUTE WHERE utilizador_id = ?', [u.id]);
    assert.equal((await c.get('/api/auth/repor/' + token2)).dados.valido, false, 'link expirado');
  });

  it('no máximo 3 pedidos por hora por conta', async () => {
    const u = await criarUtilizador();
    const c = new Cliente(base);
    for (let i = 0; i < 4; i++) await c.post('/api/auth/recuperar', { email: u.email });
    assert.equal((await linha('SELECT COUNT(*) AS n FROM recuperacoes WHERE utilizador_id = ?', [u.id])).n, 3);
  });
});

// ---------------------------------------------------------------------
describe('Passo 9 – perfil público e seguir', () => {
  it('perfil inexistente dá 404 "Este perfil não existe."', async () => {
    const r = await new Cliente(base).get('/api/utilizadores/teste_nao_existe');
    assert.equal(r.status, 404);
    assert.equal(r.dados.erro, 'Este perfil não existe.');
  });

  it('seguir e deixar de seguir atualiza o número e cria a notificação', async () => {
    const a = await criarUtilizador();
    const b = await criarUtilizador();
    const c = new Cliente(base);
    await c.entrar(a.nome, a.password);
    const r1 = await c.post('/api/seguir/' + b.id);
    assert.deepEqual([r1.dados.a_seguir, r1.dados.seguidores], [true, 1]);
    const n = await linha("SELECT texto FROM notificacoes WHERE utilizador_id = ? AND tipo = 'seguidor'", [b.id]);
    assert.equal(n.texto, `@${a.nome} começou a seguir-te.`);
    const perfil = await new Cliente(base).get('/api/utilizadores/' + b.nome);
    assert.equal(perfil.dados.contagens.seguidores, 1);
    const r2 = await c.post('/api/seguir/' + b.id);
    assert.deepEqual([r2.dados.a_seguir, r2.dados.seguidores], [false, 0]);
  });

  it('não cria a notificação se a pessoa a silenciou, e ninguém se segue a si próprio', async () => {
    const a = await criarUtilizador();
    const b = await criarUtilizador();
    await executar("INSERT INTO notif_silenciadas (utilizador_id, tipo) VALUES (?, 'seguidor')", [b.id]);
    const c = new Cliente(base);
    await c.entrar(a.nome, a.password);
    await c.post('/api/seguir/' + b.id);
    assert.equal((await linha('SELECT COUNT(*) AS n FROM notificacoes WHERE utilizador_id = ?', [b.id])).n, 0);
    assert.equal((await c.post('/api/seguir/' + a.id)).status, 400);
  });
});

// ---------------------------------------------------------------------
describe('Passo 10 – definições', () => {
  it('@nome repetido nas definições dá erro no campo', async () => {
    const a = await criarUtilizador();
    const b = await criarUtilizador();
    const c = new Cliente(base);
    await c.entrar(a.nome, a.password);
    const r = await c.put('/api/utilizadores/eu/perfil', { nome_exibicao: 'Teste', nome: b.nome, cor: 330, localizacao: '', bio: '' });
    assert.equal(r.status, 400);
    assert.equal(r.dados.erros.nome, 'Esse @nome já está a ser usado.');
    const ok = await c.put('/api/utilizadores/eu/perfil', { nome_exibicao: 'Teste Novo', nome: a.nome + 'x', cor: 150, localizacao: 'Lisboa', bio: 'Olá' });
    assert.equal(ok.dados.mensagem, 'Perfil atualizado.');
    const at = await linha("SELECT descricao FROM atividade_conta WHERE utilizador_id = ? AND tipo = 'nome_alterado'", [a.id]);
    assert.equal(at.descricao, `@nome alterado (de @${a.nome} para @${a.nome}x)`);
  });

  it('banner: um utilizador novo tem o cenário "chuva" no perfil público e nas definições', async () => {
    const u = await criarUtilizador();
    const c = new Cliente(base);
    await c.entrar(u.nome, u.password);
    assert.equal((await new Cliente(base).get('/api/utilizadores/' + u.nome)).dados.perfil.tema_banner, 'chuva');
    const def = await c.get('/api/utilizadores/eu/definicoes');
    assert.equal(def.dados.tema_banner, 'chuva');
    assert.deepEqual(def.dados.temas_banner, ['chuva', 'synthwave', 'beco', 'montanhas']);
  });

  it('banner: um cenário que não existe é recusado com o erro no campo', async () => {
    const u = await criarUtilizador();
    const c = new Cliente(base);
    await c.entrar(u.nome, u.password);
    const r = await c.put('/api/utilizadores/eu/perfil', { nome_exibicao: 'Teste', nome: u.nome, cor: 330, tema_banner: 'qualquercoisa', localizacao: '', bio: '' });
    assert.equal(r.status, 400);
    assert.equal(r.dados.erros.tema_banner, 'Escolhe um dos cenários.');
    assert.equal((await linha('SELECT tema_banner FROM utilizadores WHERE id = ?', [u.id])).tema_banner, 'chuva');
  });

  it('banner: guardar "beco" muda o perfil público (e sem tema_banner mantém o que estava)', async () => {
    const u = await criarUtilizador();
    const c = new Cliente(base);
    await c.entrar(u.nome, u.password);
    const r = await c.put('/api/utilizadores/eu/perfil', { nome_exibicao: 'Teste', nome: u.nome, cor: 199, tema_banner: 'beco', localizacao: '', bio: '' });
    assert.equal(r.status, 200, JSON.stringify(r.dados));
    const perfil = await new Cliente(base).get('/api/utilizadores/' + u.nome);
    assert.equal(perfil.dados.perfil.tema_banner, 'beco');
    assert.equal(perfil.dados.perfil.cor, 199);
    await c.put('/api/utilizadores/eu/perfil', { nome_exibicao: 'Teste', nome: u.nome, cor: 199, localizacao: '', bio: '' });
    assert.equal((await new Cliente(base).get('/api/utilizadores/' + u.nome)).dados.perfil.tema_banner, 'beco');
  });

  it('um ficheiro que não é imagem é recusado; a foto fica 256×256 e a antiga é substituída', async () => {
    const u = await criarUtilizador();
    const c = new Cliente(base);
    await c.entrar(u.nome, u.password);

    const falso = new FormData();
    falso.append('foto', new Blob(['<?php echo "olá"; ?>'], { type: 'image/png' }), 'foto.png');
    const r1 = await c.post('/api/utilizadores/eu/foto', falso);
    assert.equal(r1.status, 400);
    assert.equal(r1.dados.erro, 'O ficheiro tem de ser uma imagem JPG, PNG ou WebP.');

    const png = await sharp({ create: { width: 800, height: 500, channels: 3, background: '#ff2d55' } }).png().toBuffer();
    const envio = new FormData();
    envio.append('foto', new Blob([png], { type: 'image/png' }), 'foto.png');
    const r2 = await c.post('/api/utilizadores/eu/foto', envio);
    assert.equal(r2.status, 200, JSON.stringify(r2.dados));

    const foto = await c.get(`/api/utilizadores/${u.id}/foto?v=${r2.dados.foto_versao}`);
    assert.equal(foto.headers.get('content-type'), 'image/jpeg');
    const info = await sharp(foto.dados).metadata();
    assert.deepEqual([info.format, info.width, info.height], ['jpeg', 256, 256]);

    await new Promise(r => setTimeout(r, 1100));
    const webp = await sharp({ create: { width: 300, height: 300, channels: 3, background: '#0000ff' } }).webp().toBuffer();
    const envio2 = new FormData();
    envio2.append('foto', new Blob([webp], { type: 'image/webp' }), 'b.webp');
    const r3 = await c.post('/api/utilizadores/eu/foto', envio2);
    assert.notEqual(r3.dados.foto_versao, r2.dados.foto_versao, 'versão nova (o browser não usa a antiga da cache)');

    assert.equal((await c.delete('/api/utilizadores/eu/foto')).status, 200);
    assert.equal((await c.get(`/api/utilizadores/${u.id}/foto`)).status, 404);
  });

  it('alterar a palavra-passe com a atual errada é recusado e fica na atividade', async () => {
    const u = await criarUtilizador();
    const c = new Cliente(base);
    await c.entrar(u.nome, u.password);
    const r = await c.put('/api/utilizadores/eu/password', { atual: 'errada123', nova: 'Nova12345', nova2: 'Nova12345' });
    assert.equal(r.status, 400);
    assert.equal(r.dados.erros.atual, 'A palavra-passe atual está errada.');
    const at = await linha("SELECT descricao FROM atividade_conta WHERE utilizador_id = ? AND tipo = 'palavra_passe_falhada'", [u.id]);
    assert.equal(at.descricao, 'Tentativa falhada de mudar a palavra-passe');
    const igual = await c.put('/api/utilizadores/eu/password', { atual: u.password, nova: u.password, nova2: u.password });
    assert.equal(igual.dados.erros.nova, 'A palavra-passe nova tem de ser diferente da atual.');
  });

  it('pode manter as sessões dos outros dispositivos ao mudar a palavra-passe', async () => {
    const u = await criarUtilizador();
    const a = new Cliente(base);
    const b = new Cliente(base);
    await a.entrar(u.nome, u.password);
    await b.entrar(u.nome, u.password);
    await a.put('/api/utilizadores/eu/password', { atual: u.password, nova: 'Nova12345', nova2: 'Nova12345', terminarOutras: false });
    assert.notEqual((await b.get('/api/auth/eu')).dados.u, null);
    await a.put('/api/utilizadores/eu/password', { atual: 'Nova12345', nova: 'Outra12345', nova2: 'Outra12345' });
    assert.equal((await b.get('/api/auth/eu')).dados.u, null, 'por omissão termina as outras');
  });

  it('mudar o email envia um aviso para o email antigo e o novo fica por confirmar', async () => {
    const u = await criarUtilizador({ email_verificado: 1 });
    const c = new Cliente(base);
    await c.entrar(u.nome, u.password);
    const novo = u.email.replace('@', '.novo@');
    const r = await c.put('/api/utilizadores/eu/email', { email: novo, password: u.password });
    assert.equal(r.status, 200);
    assert.match(ultimoEmail(u.email), /foi alterado para/);
    assert.equal((await linha('SELECT email_verificado FROM utilizadores WHERE id = ?', [u.id])).email_verificado, 0);
  });

  it('apagar conta sem escrever o @ certo não apaga; com o @ certo apaga tudo', async () => {
    const u = await criarUtilizador();
    const c = new Cliente(base);
    await c.entrar(u.nome, u.password);
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000000' } }).png().toBuffer();
    const envio = new FormData();
    envio.append('foto', new Blob([png], { type: 'image/png' }), 'f.png');
    await c.post('/api/utilizadores/eu/foto', envio);

    const errado = await c.delete('/api/utilizadores/eu', { password: u.password, confirmacao: '@outro' });
    assert.equal(errado.status, 400);
    assert.ok(errado.dados.erros.confirmacao);
    assert.ok(await linha('SELECT id FROM utilizadores WHERE id = ?', [u.id]));

    const certo = await c.delete('/api/utilizadores/eu', { password: u.password, confirmacao: '@' + u.nome });
    assert.equal(certo.status, 200);
    assert.equal(await linha('SELECT id FROM utilizadores WHERE id = ?', [u.id]), null);
    assert.equal((await linha('SELECT COUNT(*) AS n FROM sessoes WHERE utilizador_id = ?', [u.id])).n, 0);
    assert.equal((await linha('SELECT COUNT(*) AS n FROM atividade_conta WHERE utilizador_id = ?', [u.id])).n, 0);
    assert.equal((await c.get(`/api/utilizadores/${u.id}/foto`)).status, 404);
    assert.equal((await c.get('/api/auth/eu')).dados.aviso, 'A tua conta foi apagada.');
  });

  it('o único administrador não pode apagar a conta', async () => {
    const admin = await criarUtilizador({ papel: 'admin' });
    // Durante este teste, o admin de teste passa a ser o único (os outros voltam no fim, mesmo que o teste falhe)
    const outros = (await linhas("SELECT id FROM utilizadores WHERE papel = 'admin' AND id <> ?", [admin.id])).map(o => o.id);
    const lista = outros.map(() => '?').join(',');
    try {
      if (outros.length) await executar(`UPDATE utilizadores SET papel = 'utilizador' WHERE id IN (${lista})`, outros);
      const c = new Cliente(base);
      await c.entrar(admin.nome, admin.password);
      const r = await c.delete('/api/utilizadores/eu', { password: admin.password, confirmacao: admin.nome });
      assert.equal(r.status, 400);
      assert.equal(r.dados.erro, 'A conta de administrador não pode ser apagada: o TavDex precisa sempre de pelo menos um administrador.');
      assert.ok(await linha('SELECT id FROM utilizadores WHERE id = ?', [admin.id]));
    } finally {
      if (outros.length) await executar(`UPDATE utilizadores SET papel = 'admin' WHERE id IN (${lista})`, outros);
    }
  });
});

// ---------------------------------------------------------------------
describe('Login com o Google (sem falar com a Google)', () => {
  it('sem GOOGLE_CLIENT_ID diz que não está configurado', async () => {
    const r = await new Cliente(base).get('/api/auth/google');
    assert.equal(r.status, 302);
    assert.equal(new URL(r.local, 'http://x').searchParams.get('erro'), 'O login com Google ainda não foi configurado.');
  });

  describe('com o Google configurado', () => {
    before(() => {
      process.env.GOOGLE_CLIENT_ID = 'id-de-teste.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'segredo-de-teste';
    });
    after(() => { process.env.GOOGLE_CLIENT_ID = ''; process.env.GOOGLE_CLIENT_SECRET = ''; });

    it('manda para a Google com state, PKCE S256, select_account e o redirect_uri certo', async () => {
      const r = await new Cliente(base).get('/api/auth/google?voltar=' + encodeURIComponent('/titulo.html?id=1'));
      assert.equal(r.status, 302);
      const url = new URL(r.local);
      assert.equal(url.origin + url.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
      const p = url.searchParams;
      assert.equal(p.get('response_type'), 'code');
      assert.equal(p.get('scope'), 'openid email profile');
      assert.equal(p.get('code_challenge_method'), 'S256');
      assert.equal(p.get('prompt'), 'select_account');
      assert.equal(p.get('redirect_uri'), process.env.GOOGLE_REDIRECT_URI || `${process.env.URL_SITE || 'http://localhost:3000'}/api/auth/google/callback`);
      assert.match(p.get('state'), /^[a-f0-9]{64}$/);
      assert.ok(p.get('code_challenge').length >= 43);
    });

    it('cancelar na página da Google volta ao login com a mensagem, sem entrar (e guarda a página)', async () => {
      const c = new Cliente(base);
      const ida = await c.get('/api/auth/google?voltar=' + encodeURIComponent('/titulo.html?id=1'));
      const state = new URL(ida.local).searchParams.get('state');
      const volta = await c.get(`/api/auth/google/callback?error=access_denied&state=${state}`);
      assert.equal(volta.status, 302);
      const destino = new URL(volta.local, 'http://x');
      assert.equal(destino.pathname, '/login.html');
      assert.equal(destino.searchParams.get('voltar'), '/titulo.html?id=1');
      assert.equal(destino.searchParams.get('erro'), 'Cancelaste o login com o Google. Podes tentar outra vez ou entrar com a palavra-passe.');
      assert.equal((await c.get('/api/auth/eu')).dados.u, null);
    });

    it('state errado ou repetido no callback é recusado', async () => {
      const c = new Cliente(base);
      const ida = await c.get('/api/auth/google');
      const state = new URL(ida.local).searchParams.get('state');
      const errado = await c.get('/api/auth/google/callback?code=abc&state=' + 'f'.repeat(64));
      assert.equal(new URL(errado.local, 'http://x').searchParams.get('erro'), 'O pedido expirou. Tenta outra vez.');
      // O state certo também já não serve: só se usa uma vez
      const repetido = await c.get(`/api/auth/google/callback?code=abc&state=${state}`);
      assert.equal(new URL(repetido.local, 'http://x').searchParams.get('erro'), 'O pedido expirou. Tenta outra vez.');
    });

    it('um "voltar" para outro site é ignorado', async () => {
      const c = new Cliente(base);
      const ida = await c.get('/api/auth/google?voltar=' + encodeURIComponent('//site-mau.com'));
      const state = new URL(ida.local).searchParams.get('state');
      const volta = await c.get(`/api/auth/google/callback?error=access_denied&state=${state}`);
      assert.equal(new URL(volta.local, 'http://x').searchParams.get('voltar'), '/');
    });

    it('desligar o Google numa conta sem palavra-passe é recusado', async () => {
      const u = await criarUtilizador();
      const c = new Cliente(base);
      await c.entrar(u.nome, u.password);
      await executar('UPDATE utilizadores SET password_hash = NULL, google_id = ?, google_email = ? WHERE id = ?', ['teste-g-' + u.id, u.email, u.id]);
      const r = await c.post('/api/conta/google/desligar');
      assert.equal(r.status, 400);
      assert.equal(r.dados.erro, 'Define primeiro uma palavra-passe. Sem ela e sem o Google ficavas sem forma de entrar.');
    });

    it('ligar a partir das Definições pede sessão e envia login_hint para contas Gmail', async () => {
      const v = await new Cliente(base).get('/api/auth/google?modo=ligar');
      assert.equal(v.local, '/login.html?voltar=' + encodeURIComponent('/definicoes.html?tab=seguranca'));
      const u = await criarUtilizador({ email: `teste_${Date.now()}@gmail.com` });
      const c = new Cliente(base);
      await c.entrar(u.nome, u.password);
      const r = await c.get('/api/auth/google?modo=ligar');
      assert.equal(new URL(r.local).searchParams.get('login_hint'), u.email);
    });
  });
});
