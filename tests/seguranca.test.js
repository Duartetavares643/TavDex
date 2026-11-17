// =====================================================================
//  TavDex – testes automáticos das "Contas mais seguras"
//  (palavras-passe fortes, emails válidos, confirmação do email, recuperação,
//   logout e sessões, perfil público e Definições)
//  Correr com:  npm test   (precisa da base de dados com o 06_seguranca_contas.sql)
//  Corre sem internet: o tests/ajuda.js desliga o Have I Been Pwned e o DNS.
// =====================================================================
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { arrancar, parar, Cliente, criarUtilizador, apagarTestes, ultimoEmail, linha, executar } = require('./ajuda');

let base;
before(async () => { await apagarTestes(); base = await arrancar(); });
after(parar);

const FORTE = 'Cinema#Noir7';
const FORTE2 = 'Nova#Forte2026';
let n = 0;
// Dados para um registo novo (o @nome e o email começam por "teste_", para serem apagados no fim)
function novoRegisto(extra = {}) {
  const s = `${Date.now().toString(36)}${++n}`;
  return { nome_exibicao: 'Pessoa Nova', nome: `teste_s${s}`, email: `teste_s${s}@exemplo.pt`, password: FORTE, password2: FORTE, aceito: true, ...extra };
}
// Token do último email de confirmação enviado para um endereço
const tokenConfirmacao = email => (ultimoEmail(email) || '').match(/confirmar-email\/([a-f0-9]{64})/)?.[1];
const esperar = ms => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------------
describe('1. Palavras-passe fortes', () => {
  it('recusa uma fraca, uma das mais comuns e uma com o @nome, com o erro no campo', async () => {
    const c = new Cliente(base);
    const fraca = await c.post('/api/auth/registar', novoRegisto({ password: 'abc12345', password2: 'abc12345' }));
    assert.equal(fraca.status, 400);
    assert.equal(fraca.dados.erros.password, 'A palavra-passe tem de ter pelo menos 10 caracteres.');

    const comum = await c.post('/api/auth/registar', novoRegisto({ password: 'Password1!', password2: 'Password1!' }));
    assert.equal(comum.dados.erros.password, 'Essa palavra-passe é demasiado comum. Escolhe outra.');

    const dados = novoRegisto();
    const comNome = await c.post('/api/auth/registar', { ...dados, password: `${dados.nome}#X9`, password2: `${dados.nome}#X9` });
    assert.equal(comNome.dados.erros.password, 'A palavra-passe não pode conter o teu nome nem o teu email.');

    const sequencia = await c.post('/api/auth/registar', novoRegisto({ password: 'Zebra#1234x', password2: 'Zebra#1234x' }));
    assert.equal(sequencia.dados.erros.password, 'Evita sequências óbvias como 1234, abcd ou qwer.');
  });

  it('as palavras-passe que não coincidem dão erro no campo de confirmar', async () => {
    const r = await new Cliente(base).post('/api/auth/registar', novoRegisto({ password2: 'Outra#Coisa99' }));
    assert.equal(r.dados.erros.password2, 'As palavras-passe não coincidem.');
  });

  it('uma conta antiga com palavra-passe fraca entra, mas recebe o aviso (uma vez)', async () => {
    const u = await criarUtilizador();   // palavra-passe "Teste12345" (sem símbolo)
    const c = new Cliente(base);
    const r = await c.entrar(u.nome, u.password);
    assert.equal(r.dados.palavra_passe_fraca, true);
    assert.equal((await c.get('/api/auth/eu')).dados.palavra_passe_fraca, true);
    assert.equal((await c.get('/api/auth/eu')).dados.palavra_passe_fraca, false, 'só aparece uma vez');
    const def = await c.get('/api/utilizadores/eu/definicoes');
    assert.equal(def.dados.protecao.palavra_passe_fraca, true);
  });
});

// ---------------------------------------------------------------------
describe('2. Só emails válidos', () => {
  it('recusa um formato errado e um email descartável, com a mensagem certa', async () => {
    const c = new Cliente(base);
    const formato = await c.post('/api/auth/registar', novoRegisto({ email: 'teste_x..y@exemplo' }));
    assert.equal(formato.dados.erros.email, 'Escreve um email válido (ex.: nome@gmail.com).');
    const descartavel = await c.post('/api/auth/registar', novoRegisto({ email: 'teste_alguem@mailinator.com' }));
    assert.equal(descartavel.dados.erros.email, 'Não aceitamos emails temporários. Usa o teu email habitual.');
  });

  // Precisa de internet (DNS): só corre com TESTAR_DNS=1
  it('recusa um domínio que não existe', { skip: process.env.TESTAR_DNS !== '1' && 'precisa de internet (TESTAR_DNS=1)' }, async () => {
    process.env.VERIFICAR_DNS = '1';
    try {
      const r = await new Cliente(base).post('/api/auth/registar', novoRegisto({ email: 'teste_alguem@dominio-que-nao-existe.invalid' }));
      assert.equal(r.dados.erros.email, 'O domínio @dominio-que-nao-existe.invalid não existe ou não recebe emails.');
    } finally {
      process.env.VERIFICAR_DNS = '0';
    }
  });
});

// ---------------------------------------------------------------------
describe('3. Confirmação do email', () => {
  it('o registo cria a conta com email_verificado = 0 e sem sessão', async () => {
    const c = new Cliente(base);
    const dados = novoRegisto();
    assert.equal((await c.post('/api/auth/registar', dados)).status, 201);
    assert.equal((await linha('SELECT email_verificado FROM utilizadores WHERE nome = ?', [dados.nome])).email_verificado, 0);
    assert.equal((await c.get('/api/auth/eu')).dados.u, null);
    assert.equal((await c.get('/api/utilizadores/eu/definicoes')).status, 401);
    // A página "Confirma o teu email" mostra o email escondido
    assert.equal((await c.get('/api/confirmacao')).dados.email, 't•••••@exemplo.pt');
  });

  it('login antes de confirmar: palavra-passe certa -> "Ainda não confirmaste"; errada -> mensagem normal', async () => {
    const dados = novoRegisto();
    await new Cliente(base).post('/api/auth/registar', dados);
    const certa = await new Cliente(base).post('/api/auth/login', { login: dados.nome, password: FORTE });
    assert.equal(certa.status, 403);
    assert.equal(certa.dados.erro, 'Ainda não confirmaste o teu email.');
    assert.equal(certa.dados.codigo, 'email_por_confirmar');
    const errada = await new Cliente(base).post('/api/auth/login', { login: dados.nome, password: 'Errada#9999' });
    assert.equal(errada.status, 400);
    assert.equal(errada.dados.erro, 'Nome de utilizador/email ou palavra-passe incorretos.');
  });

  it('o link confirma, inicia sessão e não funciona segunda vez; na BD fica só o hash', async () => {
    const dados = novoRegisto();
    await new Cliente(base).post('/api/auth/registar', dados);
    const token = tokenConfirmacao(dados.email);
    assert.ok(token, 'o email de confirmação foi enviado');
    assert.equal((await linha('SELECT COUNT(*) AS n FROM verificacao_email WHERE token = ?', [token])).n, 0, 'na BD fica só o hash');

    const c = new Cliente(base);
    assert.deepEqual((await c.get('/api/confirmacao/' + token)).dados, { valido: true, tipo: 'registo', email: 't•••••@exemplo.pt' });
    const r = await c.post('/api/confirmacao', { token });
    assert.equal(r.status, 200, JSON.stringify(r.dados));
    assert.equal(r.dados.mensagem, 'Email confirmado! Bem-vindo ao TavDex, Pessoa Nova.');
    assert.equal((await c.get('/api/auth/eu')).dados.u.nome, dados.nome, 'entrou neste browser');
    assert.equal((await linha('SELECT email_verificado FROM utilizadores WHERE nome = ?', [dados.nome])).email_verificado, 1);

    const outraVez = await new Cliente(base).post('/api/confirmacao', { token });
    assert.equal(outraVez.status, 400);
    assert.equal(outraVez.dados.erro, 'Este link não é válido ou já expirou.');
  });

  it('um link com mais de 24 horas não funciona', async () => {
    const dados = novoRegisto();
    await new Cliente(base).post('/api/auth/registar', dados);
    const token = tokenConfirmacao(dados.email);
    await executar(`UPDATE verificacao_email SET expira_em = NOW() - INTERVAL 1 MINUTE
      WHERE utilizador_id = (SELECT id FROM utilizadores WHERE nome = ?)`, [dados.nome]);
    assert.equal((await new Cliente(base).get('/api/confirmacao/' + token)).dados.valido, false);
  });

  it('reenviar: espera de 60 segundos e no máximo 5 envios por hora', async () => {
    const c = new Cliente(base);
    const dados = novoRegisto();
    await c.post('/api/auth/registar', dados);
    const u = await linha('SELECT id FROM utilizadores WHERE nome = ?', [dados.nome]);
    const cedo = await c.post('/api/confirmacao/reenviar');
    assert.equal(cedo.status, 429, 'logo a seguir ao registo tem de esperar');
    // Cada envio "passa" 2 minutos para trás, para não ter de esperar de verdade
    for (let i = 0; i < 4; i++) {
      await executar('UPDATE verificacao_email SET data_pedido = data_pedido - INTERVAL 2 MINUTE WHERE utilizador_id = ?', [u.id]);
      assert.equal((await c.post('/api/confirmacao/reenviar')).status, 200, `envio ${i + 2}`);
    }
    await executar('UPDATE verificacao_email SET data_pedido = data_pedido - INTERVAL 2 MINUTE WHERE utilizador_id = ?', [u.id]);
    const sexto = await c.post('/api/confirmacao/reenviar');
    assert.equal(sexto.status, 429);
    assert.equal(sexto.dados.erro, 'Já pediste 5 emails na última hora. Tenta mais tarde.');
  });

  it('pedir um link novo com o email escrito dá sempre a mesma resposta', async () => {
    const a = await new Cliente(base).post('/api/confirmacao/reenviar', { email: 'ninguem_y@exemplo.pt' });
    const dados = novoRegisto();
    await new Cliente(base).post('/api/auth/registar', dados);
    await executar("UPDATE verificacao_email SET data_pedido = data_pedido - INTERVAL 2 MINUTE WHERE email = ?", [dados.email]);
    const b = await new Cliente(base).post('/api/confirmacao/reenviar', { email: dados.email });
    assert.equal(a.dados.mensagem, b.dados.mensagem);
  });

  it('mudar o email: só troca depois de confirmar; o email antigo recebe os avisos', async () => {
    const u = await criarUtilizador();
    const c = new Cliente(base);
    await c.entrar(u.nome, u.password);
    const novo = u.email.replace('@', '.novo@');
    const r = await c.put('/api/utilizadores/eu/email', { email: novo, password: u.password });
    assert.equal(r.status, 200, JSON.stringify(r.dados));
    let conta = await linha('SELECT email, email_pendente FROM utilizadores WHERE id = ?', [u.id]);
    assert.deepEqual([conta.email, conta.email_pendente], [u.email, novo], 'o email antigo continua até confirmar');
    assert.match(ultimoEmail(u.email), /Foi pedido para mudar o email/);
    assert.equal((await c.get('/api/utilizadores/eu/definicoes')).dados.email_pendente, novo);

    const token = tokenConfirmacao(novo);
    assert.equal((await new Cliente(base).get('/api/confirmacao/' + token)).dados.tipo, 'mudanca');
    await esperar(1100);   // os ficheiros dos emails têm a data no nome
    const confirmar = await new Cliente(base).post('/api/confirmacao', { token });
    assert.equal(confirmar.status, 200, JSON.stringify(confirmar.dados));
    conta = await linha('SELECT email, email_pendente, email_verificado FROM utilizadores WHERE id = ?', [u.id]);
    assert.deepEqual([conta.email, conta.email_pendente, conta.email_verificado], [novo, null, 1]);
    assert.match(ultimoEmail(u.email), /foi alterado para/);
    const at = await linha("SELECT descricao FROM atividade_conta WHERE utilizador_id = ? AND tipo = 'email_alterado'", [u.id]);
    assert.equal(at.descricao, `Email alterado de ${u.email} para ${novo}`);
  });

  it('cancelar a mudança de email anula o link', async () => {
    const u = await criarUtilizador();
    const c = new Cliente(base);
    await c.entrar(u.nome, u.password);
    const novo = u.email.replace('@', '.outro@');
    await c.put('/api/utilizadores/eu/email', { email: novo, password: u.password });
    const token = tokenConfirmacao(novo);
    assert.equal((await c.delete('/api/utilizadores/eu/email')).status, 200);
    assert.equal((await new Cliente(base).get('/api/confirmacao/' + token)).dados.valido, false);
    assert.equal((await linha('SELECT email_pendente FROM utilizadores WHERE id = ?', [u.id])).email_pendente, null);
  });
});

// ---------------------------------------------------------------------
describe('4. Recuperação de login', () => {
  it('funciona com o @nome e o email diz qual é o @nome; com um email inexistente a resposta é igual', async () => {
    const u = await criarUtilizador();
    const r = await new Cliente(base).post('/api/auth/recuperar', { login: '@' + u.nome });
    const email = ultimoEmail(u.email);
    assert.ok(email, 'enviou o email');
    assert.match(email, new RegExp(`O teu nome de utilizador é @${u.nome}`));
    assert.match(email, /Pedido feito a \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2} · Windows · Chrome/);
    const ninguem = await new Cliente(base).post('/api/auth/recuperar', { login: 'ninguem_z@exemplo.pt' });
    assert.equal(ninguem.dados.mensagem, r.dados.mensagem);
  });

  it('no máximo 10 pedidos por hora por IP (o 11.º não envia, mas responde igual)', async () => {
    const ip = '10.250.250.' + (Date.now() % 200 + 1);
    const outra = await criarUtilizador();
    for (let i = 0; i < 10; i++) {
      await executar('INSERT INTO recuperacoes (utilizador_id, token_hash, expira_em, ip) VALUES (?, ?, NOW() + INTERVAL 30 MINUTE, ?)',
        [outra.id, require('crypto').randomBytes(32).toString('hex'), ip]);
    }
    const u = await criarUtilizador();
    const r = await new Cliente(base, undefined, ip).post('/api/auth/recuperar', { email: u.email });
    assert.equal(r.status, 200);
    assert.equal(ultimoEmail(u.email), null, 'não enviou');
  });

  it('contas só com o Google recebem o texto próprio', async () => {
    const u = await criarUtilizador({ password_hash: null, google_id: 'teste-g-' + Date.now() });
    await new Cliente(base).post('/api/auth/recuperar', { email: u.email });
    assert.match(ultimoEmail(u.email), /Esta conta entra com o Google/);
  });

  it('mudar a palavra-passe nas Definições envia o email de aviso', async () => {
    const u = await criarUtilizador();
    const c = new Cliente(base);
    await c.entrar(u.nome, u.password);
    const r = await c.put('/api/utilizadores/eu/password', { atual: u.password, nova: FORTE2, nova2: FORTE2 });
    assert.equal(r.status, 200, JSON.stringify(r.dados));
    assert.match(ultimoEmail(u.email), /A palavra-passe da tua conta TavDex \(@.*\) foi alterada/);
    assert.match(ultimoEmail(u.email), /Não foste tu\?/);
    const def = await c.get('/api/utilizadores/eu/definicoes');
    assert.equal(def.dados.protecao.palavra_passe_fraca, false);
    assert.equal(def.dados.protecao.palavra_passe_dias, 0);
  });
});

// ---------------------------------------------------------------------
describe('5. Logout e sessões', () => {
  it('as respostas da API não ficam em cache (Retroceder não mostra dados)', async () => {
    const r = await new Cliente(base).get('/api/auth/eu');
    assert.equal(r.headers.get('cache-control'), 'no-store');
  });

  it('"Terminar sessão em todos os dispositivos" apaga todas as sessões da conta, incluindo esta', async () => {
    const u = await criarUtilizador();
    const a = new Cliente(base);
    const b = new Cliente(base);
    await a.entrar(u.nome, u.password);
    await b.entrar(u.nome, u.password);
    const r = await a.post('/api/auth/logout-todos');
    assert.equal(r.status, 200);
    assert.equal((await linha('SELECT COUNT(*) AS n FROM sessoes WHERE utilizador_id = ?', [u.id])).n, 0);
    assert.equal((await a.get('/api/auth/eu')).dados.u, null);
    assert.equal((await b.get('/api/auth/eu')).dados.u, null);
  });

  it('sem "Manter sessão iniciada", 12 horas sem atividade passam a visitante; com ela, não', async () => {
    const u = await criarUtilizador();
    const sem = new Cliente(base);
    await sem.entrar(u.nome, u.password);
    const com = new Cliente(base);
    const r = await com.post('/api/auth/login', { login: u.nome, password: u.password, manter: true });
    assert.equal(r.status, 200);
    // O cookie "Manter" tem data (30 dias); o outro é de sessão (sem Expires)
    assert.match(r.headers.getSetCookie().join(';'), /tavdex\.sid=.*Expires=/i);
    await executar('UPDATE sessoes SET ultimo_acesso = NOW() - INTERVAL 13 HOUR WHERE utilizador_id = ?', [u.id]);
    assert.equal((await sem.get('/api/utilizadores/eu/definicoes')).status, 401);
    assert.equal((await sem.get('/api/auth/eu')).dados.aviso, 'A tua sessão expirou. Inicia sessão outra vez.');
    assert.equal((await com.get('/api/utilizadores/eu/definicoes')).status, 200, 'com "Manter" continua');
  });

  it('GET /sair só mostra a página (nunca termina a sessão)', async () => {
    const u = await criarUtilizador();
    const c = new Cliente(base);
    await c.entrar(u.nome, u.password);
    assert.equal((await c.get('/sair')).status, 200);
    assert.notEqual((await c.get('/api/auth/eu')).dados.u, null);
    // Sair sem sessão não dá erro
    assert.equal((await new Cliente(base).post('/api/auth/logout')).status, 200);
  });
});

// ---------------------------------------------------------------------
describe('6 e 7. Perfil público e Definições', () => {
  it('@nome só muda uma vez em 30 dias e o @ antigo redireciona para o novo', async () => {
    const u = await criarUtilizador();
    const c = new Cliente(base);
    await c.entrar(u.nome, u.password);
    const novo = u.nome + 'n';
    const r1 = await c.put('/api/utilizadores/eu/perfil', { nome_exibicao: 'Teste', nome: novo, cor: 330, localizacao: '', bio: '' });
    assert.equal(r1.status, 200, JSON.stringify(r1.dados));
    const r2 = await c.put('/api/utilizadores/eu/perfil', { nome_exibicao: 'Teste', nome: novo + 'm', cor: 330, localizacao: '', bio: '' });
    assert.equal(r2.status, 400);
    assert.match(r2.dados.erros.nome, /^Podes voltar a mudar o teu @nome a partir de \d{2}\/\d{2}\/\d{4}\.$/);
    // O @ antigo: a API diz para onde ir e /perfil/antigo redireciona de vez (301)
    assert.deepEqual((await new Cliente(base).get('/api/utilizadores/' + u.nome)).dados, { redirecionar: novo });
    const pagina = await new Cliente(base).get('/perfil/' + u.nome);
    assert.equal(pagina.status, 301);
    assert.equal(pagina.local, '/perfil.html?u=' + encodeURIComponent(novo));
    // E fica reservado: outra pessoa não o pode usar
    const outra = await criarUtilizador();
    const co = new Cliente(base);
    await co.entrar(outra.nome, outra.password);
    const r3 = await co.put('/api/utilizadores/eu/perfil', { nome_exibicao: 'Teste', nome: u.nome, cor: 330, localizacao: '', bio: '' });
    assert.equal(r3.dados.erros.nome, 'Este nome de utilizador não está disponível.');
  });

  it('@admin e @tavdex são recusados (registo, Definições e "disponível")', async () => {
    const r = await new Cliente(base).post('/api/auth/registar', novoRegisto({ nome: 'admin' }));
    assert.equal(r.dados.erros.nome, 'Este nome de utilizador não está disponível.');
    const u = await criarUtilizador();
    const c = new Cliente(base);
    await c.entrar(u.nome, u.password);
    const p = await c.put('/api/utilizadores/eu/perfil', { nome_exibicao: 'Teste', nome: 'TavDex', cor: 330, localizacao: '', bio: '' });
    assert.equal(p.dados.erros.nome, 'Este nome de utilizador não está disponível.');
    assert.deepEqual((await c.get('/api/utilizadores/disponivel?nome=tavdex')).dados,
      { disponivel: false, mensagem: 'Este nome de utilizador não está disponível.' });
    assert.equal((await c.get('/api/utilizadores/disponivel?nome=' + u.nome + 'livre')).dados.mensagem, '✓ Disponível');
  });

  it('o nome não pode ter caracteres invisíveis nem ser só emojis', async () => {
    const u = await criarUtilizador();
    const c = new Cliente(base);
    await c.entrar(u.nome, u.password);
    const invisivel = await c.put('/api/utilizadores/eu/perfil', { nome_exibicao: 'Du​arte', nome: u.nome, cor: 330, localizacao: '', bio: '' });
    assert.equal(invisivel.dados.erros.nome_exibicao, 'O nome tem caracteres que não se veem. Escreve-o outra vez.');
    const emojis = await c.put('/api/utilizadores/eu/perfil', { nome_exibicao: '🎬🍿', nome: u.nome, cor: 330, localizacao: '', bio: '' });
    assert.equal(emojis.dados.erros.nome_exibicao, 'O nome tem de ter letras.');
  });

  it('com "mostrar listas" desligado, a API não devolve os favoritos nem os vistos a outras pessoas', async () => {
    const u = await criarUtilizador();
    await executar("INSERT INTO listas (utilizador_id, titulo_id, tipo) VALUES (?, 1, 'favorito'), (?, 2, 'visto')", [u.id, u.id]);
    const c = new Cliente(base);
    await c.entrar(u.nome, u.password);
    const r = await c.put('/api/utilizadores/eu/perfil', {
      nome_exibicao: 'Teste', nome: u.nome, cor: 330, localizacao: '', bio: '', mostrar_listas: false, mostrar_seguidores: false,
    });
    assert.equal(r.status, 200, JSON.stringify(r.dados));
    const visitante = await new Cliente(base).get('/api/utilizadores/' + u.nome);
    assert.deepEqual([visitante.dados.favoritos, visitante.dados.vistos, visitante.dados.seguidores], [[], [], []]);
    assert.equal(visitante.dados.privacidade.listas, true);
    assert.equal(visitante.dados.contagens.vistos, 1, 'os números continuam visíveis');
    const dono = await c.get('/api/utilizadores/' + u.nome);
    assert.equal(dono.dados.favoritos.length, 1, 'o dono vê sempre tudo');
    assert.equal(dono.dados.privacidade.so_tu_listas, true);
  });

  it('o perfil aceita o @ sem distinguir maiúsculas, mostra "Segue-te", o resumo e os géneros escolhidos', async () => {
    const a = await criarUtilizador();
    const b = await criarUtilizador();
    await executar('INSERT INTO seguidores (seguidor_id, seguido_id) VALUES (?, ?)', [a.id, b.id]);
    await executar("INSERT INTO avaliacoes (utilizador_id, titulo_id, nota) VALUES (?, 1, 5), (?, 2, 3)", [a.id, a.id]);
    const ca = new Cliente(base);
    await ca.entrar(a.nome, a.password);
    const g = await linha('SELECT id, nome FROM generos ORDER BY id LIMIT 1');
    assert.equal((await ca.put('/api/utilizadores/eu/perfil', { nome_exibicao: 'Teste', nome: a.nome, cor: 330, localizacao: '', bio: '', generos: [g.id] })).status, 200);
    const muitos = await ca.put('/api/utilizadores/eu/perfil', { nome_exibicao: 'Teste', nome: a.nome, cor: 330, localizacao: '', bio: '', generos: [1, 2, 3, 4] });
    assert.equal(muitos.dados.erros.generos, 'Escolhe no máximo 3 géneros.');

    const cb = new Cliente(base);
    await cb.entrar(b.nome, b.password);
    const perfil = await cb.get('/api/utilizadores/' + a.nome.toUpperCase());
    assert.equal(perfil.dados.perfil.nome, a.nome, 'o @ vem com as maiúsculas guardadas');
    assert.equal(perfil.dados.segue_te, true);
    assert.equal(perfil.dados.resumo.media, 4);
    assert.deepEqual(perfil.dados.resumo.por_nota, [0, 0, 1, 0, 1]);
    assert.deepEqual(perfil.dados.generos_escolhidos, [{ id: g.id, nome: g.nome }]);
  });
});
