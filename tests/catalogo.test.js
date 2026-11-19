// =====================================================================
//  TavDex – testes automáticos da gestão do catálogo (routes/titulos/gestao.js)
//  Correr com:  npm test
//  Um administrador cria e apaga um género, uma plataforma, um título com
//  temporada, episódio, elenco e "onde ver". Quem não é admin recebe 403.
//  Tudo o que o teste cria é apagado no fim.
// =====================================================================
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { arrancar, parar, Cliente, criarUtilizador, apagarTestes, linha, executar } = require('./ajuda');

let base;
before(async () => { await apagarTestes(); base = await arrancar(); });
after(parar);

describe('Gestão do catálogo (só administradores)', () => {
  it('um utilizador comum não pode criar títulos, géneros nem plataformas', async () => {
    const u = await criarUtilizador();
    const c = new Cliente(base);
    await c.entrar(u.nome, u.password);
    assert.equal((await c.post('/api/titulos/generos', { nome: 'Teste Proibido' })).status, 403);
    assert.equal((await c.post('/api/titulos/plataformas', { nome: 'Teste Proibido' })).status, 403);
    assert.equal((await c.get('/api/titulos/pessoas/lista')).status, 403);
    assert.equal((await new Cliente(base).post('/api/titulos/generos', { nome: 'Teste Proibido' })).status, 401);
  });

  it('o admin cria e apaga género, plataforma, série, temporada, episódio, elenco e "onde ver"', async () => {
    const admin = await criarUtilizador({ papel: 'admin' });
    const c = new Cliente(base);
    await c.entrar(admin.nome, admin.password);
    const sufixo = Date.now().toString(36);
    let genero = null;
    let plataforma = null;
    let titulo = null;
    try {
      // Género
      const g = await c.post('/api/titulos/generos', { nome: `Teste ${sufixo}` });
      assert.equal(g.status, 201, JSON.stringify(g.dados));
      genero = g.dados.id;
      assert.equal((await c.post('/api/titulos/generos', { nome: `Teste ${sufixo}` })).dados.erro, 'Esse género já existe.');

      // Plataforma (e as regras da cor e do site)
      assert.equal((await c.post('/api/titulos/plataformas', { nome: `Teste ${sufixo}`, cor: 'vermelho' })).dados.erro,
        'Cor inválida (usa o formato #RRGGBB).');
      const p = await c.post('/api/titulos/plataformas', { nome: `Teste ${sufixo}`, cor: '#112233', url: 'https://exemplo.pt' });
      assert.equal(p.status, 201, JSON.stringify(p.dados));
      plataforma = p.dados.id;
      assert.equal((await c.put(`/api/titulos/plataformas/${plataforma}`, { nome: `Teste ${sufixo} 2`, cor: '#445566' })).status, 200);

      // Série com o género
      const t = await c.post('/api/titulos', {
        nome: `Série de teste ${sufixo}`, tipo: 'serie', ano: 2024, idade: 'M/12',
        sinopse: 'Uma série criada pelos testes automáticos.', realizador: 'Ninguém', generos: [genero],
      });
      assert.equal(t.status, 201, JSON.stringify(t.dados));
      titulo = t.dados.id;
      assert.ok(await linha('SELECT 1 FROM titulo_generos WHERE titulo_id = ? AND genero_id = ?', [titulo, genero]));

      // Editar
      const editado = await c.put(`/api/titulos/${titulo}`, {
        nome: `Série editada ${sufixo}`, tipo: 'serie', ano: 2025, idade: 'M/14',
        sinopse: 'Sinopse editada pelos testes automáticos.', generos: [],
      });
      assert.equal(editado.status, 200, JSON.stringify(editado.dados));
      assert.equal((await linha('SELECT nome FROM titulos WHERE id = ?', [titulo])).nome, `Série editada ${sufixo}`);

      // Temporada e episódio
      assert.equal((await c.post(`/api/titulos/${titulo}/temporadas`, { numero: 1, ano: 2025, episodios: 8 })).status, 201);
      const temporada = (await linha('SELECT id FROM temporadas WHERE titulo_id = ? AND numero = 1', [titulo])).id;
      assert.equal((await c.post(`/api/titulos/temporadas/${temporada}/episodios`, { numero: 1, nome: 'Piloto', duracao_min: 50 })).status, 201);
      assert.equal((await c.post(`/api/titulos/temporadas/${temporada}/episodios`, { numero: 1, nome: 'Outra vez' })).dados.erro,
        'Esse episódio já existe.');

      // Elenco (a pessoa é criada pelo nome) e "onde ver"
      assert.equal((await c.post(`/api/titulos/${titulo}/pessoas`, { nome: `Atriz Teste ${sufixo}`, funcao: 'ator', personagem: 'Ela' })).status, 201);
      const pessoa = await linha('SELECT id FROM pessoas WHERE nome = ?', [`Atriz Teste ${sufixo}`]);
      assert.ok((await c.get(`/api/titulos/pessoas/lista?q=${sufixo}`)).dados.pessoas.some(x => x.id === pessoa.id));
      assert.equal((await c.put(`/api/titulos/${titulo}/plataformas`, { plataformas: [{ plataforma_id: plataforma, link: 'https://exemplo.pt/x' }] })).status, 200);

      // A página pública do título mostra tudo
      const publico = await new Cliente(base).get(`/api/titulos/${titulo}`);
      assert.equal(publico.status, 200);

      // Apagar o elenco e a pessoa
      assert.equal((await c.delete(`/api/titulos/${titulo}/pessoas/${pessoa.id}/ator`)).status, 200);
      assert.equal((await c.delete(`/api/titulos/pessoas/${pessoa.id}`)).status, 200);
      assert.equal(await linha('SELECT id FROM pessoas WHERE id = ?', [pessoa.id]), null);
    } finally {
      // Apaga o que o teste criou (o título leva as temporadas, episódios e ligações em cascata)
      if (titulo) assert.equal((await c.delete(`/api/titulos/${titulo}`)).status, 200);
      if (plataforma) assert.equal((await c.delete(`/api/titulos/plataformas/${plataforma}`)).status, 200);
      if (genero) assert.equal((await c.delete(`/api/titulos/generos/${genero}`)).status, 200);
      await executar('DELETE FROM pessoas WHERE nome LIKE ?', [`Atriz Teste ${sufixo}`]);
    }
    assert.equal(await linha('SELECT id FROM titulos WHERE id = ?', [titulo]), null);
  });
});
