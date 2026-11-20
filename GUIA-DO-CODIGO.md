# TavDex – guia do código

Este guia diz **onde está cada coisa** no código e **como as peças se ligam**. A instalação e as funcionalidades estão no [LEIA-ME.md](LEIA-ME.md); a descrição de cada funcionalidade está em [specs/](specs/README.md).

## 1. Como funciona um pedido

```
Browser                                   Servidor (Node.js + Express)                MySQL
───────                                   ────────────────────────────                ─────
pagina.html (só a "moldura")
  └─ js/paginas/<pagina>.js
       └─ api('/api/...')  ── JSON ──►  server.js (helmet, sessão, CSRF)
                                          └─ routes/<área>.js  ── SQL com "?" ──►   tavdex_site
       ◄── JSON ───────────────────────   res.json({...})       ◄──────────────
       └─ desenha o HTML com esc(texto)
```

1. O browser abre uma página `.html`, que só tem a moldura (`<main id="app">`).
2. O JavaScript da página pede os dados à API com `api('/api/...')` (`public/js/api.js`), que junta o token CSRF.
3. O servidor confirma a sessão (`routes/middleware.js`), valida tudo e consulta o MySQL com *prepared statements* (`?`).
4. A página desenha o HTML com os dados, sempre com `esc()` no texto dos utilizadores (contra XSS).

## 2. Servidor

| Ficheiro | O que tem |
|---|---|
| `server.js` | arranque: segurança (helmet, CSRF), sessões, ligação das rotas, páginas privadas, erros, limpeza automática e verificação da base de dados |
| `db.js` | ligação ao MySQL: `linhas()`, `linha()`, `executar()` |
| `routes/auth.js` | registo, login, logout, recuperação da palavra-passe |
| `routes/google.js` | login com o Google (OAuth 2.0 + PKCE), ligar e desligar a conta Google |
| `routes/confirmacao-email.js` | links de confirmação do email (registo e mudança de email) |
| `routes/utilizadores/` | `index.js` junta as três partes, **por esta ordem**: |
| ↳ `definicoes.js` | a própria conta: dados das Definições, @nome disponível, perfil, email, palavra-passe, Google, apagar a conta |
| ↳ `fotos-e-sessoes.js` | foto de perfil, imagem do banner e sessões ativas |
| ↳ `perfil-publico.js` | perfil público, pesquisa de utilizadores e seguir (fica no fim: `GET /:nome` apanha tudo) |
| `routes/titulos/` | `index.js` junta: |
| ↳ `publico.js` | catálogo, página inicial, pesquisa e página de um título |
| ↳ `gestao.js` | criar, editar e apagar títulos, géneros, pessoas, plataformas, temporadas e episódios (só admin) |
| `routes/projetos.js` | projetos, equipa, vagas, candidaturas, comentários e avaliações |
| `routes/comunidade.js` | feed, gostos, comentários, chat, notificações e denúncias |
| `routes/avaliacoes.js` | estrelas e reviews, listas pessoais e recomendações |
| `routes/admin.js` | estatísticas, utilizadores e denúncias (só admin) |
| **Apoio** | |
| `routes/middleware.js` | sessões: quem está a ver (`req.u`), `exigirLogin`, `exigirAdmin`, iniciar e terminar sessão |
| `routes/ajudas.js` | `falha()`, validação (`Validacao`, `texto`, `inteiro`, `validarEmail`, `nomeExibicao`, `validarArroba`), anti-spam, notificações |
| `routes/palavras-passe.js` | regras do servidor para as palavras-passe: as do browser + lista das mais comuns + fugas de dados |
| `routes/fotos.js` | receber e reduzir imagens (foto 256×256, banner 1500×500) |
| `routes/consultas.js` | SQL partilhado dos cartões e das recomendações |
| `routes/email.js` | envio de emails (Gmail) e o modelo HTML dos emails |

## 3. Browser

### Regras partilhadas com o servidor (o mesmo ficheiro nos dois lados)
| Ficheiro | Regras |
|---|---|
| `public/js/regras-palavra-passe.js` | 10+ caracteres, maiúsculas, minúsculas, números, símbolos, nada pessoal |
| `public/js/regras-email.js` | formato do email, "Querias dizer …?", esconder o email (`d•••@gmail.com`) |
| `public/js/regras-nomes.js` | nome da pessoa (só letras), @nome (letras, números, `_` e `.`), @nomes reservados |

### Partes comuns a todas as páginas (`public/js/comum/`)
| Ficheiro | O que tem |
|---|---|
| `sessao.js` | quem tem sessão (`sessao`, `sessaoAtual`), ler o endereço (`param`), terminar sessão, avisar os outros separadores, botão do Google |
| `desenho.js` | funções que desenham HTML: avatares, cartazes, cartões, estrelas, datas, paginação, destaque da página inicial |
| `cabecalho-perfil.js` | o cartão do perfil: banner, avatar, nome e números |
| `janelas.js` | janelas (`abrirJanela`, `confirmarJanela`, "Inicia sessão para continuar") e avisos no topo |
| `campos.js` | campos com verificação ao vivo: palavra-passe, email, nome e @nome (ficam a vermelho logo) |
| `formularios.js` | `ligarFormulario()`: envia, desativa o botão e mostra os erros de cada campo; `tentar()` |
| `topo-e-rodape.js` | barra do topo e rodapé |
| `arranque.js` | o que corre ao abrir a página: desenha o topo e o rodapé, mostra os avisos, liga os cliques comuns |

### Banner do perfil (`public/js/banner/`)
`ajudantes.js` (funções de desenho em SVG) → um ficheiro por cenário (`colina.js`, `pipocas.js`, `claquete.js`, `pelicula.js`, `marquise.js`) → `motor.js` (desenha o cenário em cada banner e redesenha quando o tamanho muda).

### Páginas (`public/js/paginas/`)
Um ficheiro por página, com o mesmo nome do `.html`. As duas páginas maiores têm uma pasta com as partes:
- `definicoes.js` + `definicoes/`: `separador-perfil.js`, `separador-seguranca.js`, `recortar-imagem.js`;
- `admin.js` + `admin/`: `resumo.js`, `utilizadores.js`, `denuncias.js`, `titulos.js`, `catalogo.js`.

### Ordem em que cada página carrega os ficheiros
```
tema.js → api.js → regras-*.js (só as que a página usa)
→ comum/sessao.js → desenho.js → cabecalho-perfil.js → janelas.js → campos.js → formularios.js → topo-e-rodape.js → arranque.js
→ banner/*.js (só perfil e Definições) → as partes da página (se tiver pasta) → paginas/<pagina>.js
```
A ordem importa: cada ficheiro só pode usar, **ao carregar**, o que já foi carregado antes. Por isso o `arranque.js`, que desenha o topo logo ao abrir, é o último de `comum/`.

## 4. Base de dados

| Ficheiro | Para quê |
|---|---|
| `database/tavdex_site.sql` | **instalar**: cria a base `tavdex_site` com todas as tabelas, a vista `vw_titulos_avaliacao` e os dados de exemplo |
| `database/modelo_er.png` / `.svg` | modelo entidade-relação |
| `database/alteracoes-antigas/` | os scripts com que a base cresceu (só para pôr em dia uma base antiga sem perder dados) |

Ao arrancar, o `server.js` faz **uma** verificação (`verificarBaseDados`). Se a base não existir ou for antiga, mostra uma só mensagem: "Instala a base de dados com o script `database/tavdex_site.sql`…".

## 5. Testes (`npm test`)

| Ficheiro | O que testa |
|---|---|
| `tests/ajuda.js` | arranca o servidor numa porta livre; `Cliente` = um "browser" de teste com cookies e CSRF |
| `tests/contas.test.js` | contas, sessões, perfil, fotos, banner, Definições |
| `tests/seguranca.test.js` | palavras-passe, emails, confirmação, recuperação, logout, privacidade, regras dos nomes partilhadas |
| `tests/catalogo.test.js` | gestão do catálogo pelo admin (e que os outros não podem) |

## 6. O que mudou na arrumação do código (para explicar ao júri)

O site faz exatamente o mesmo e tem o mesmo aspeto. Só mudou a organização do código, para ser mais fácil de ler e de explicar.

1. **Ficheiros grandes divididos por tema** (o código foi copiado tal como estava, só mudou de sítio):
   - `public/js/main.js` (1016 linhas) → 8 ficheiros em `public/js/comum/`;
   - `public/js/paginas/definicoes.js` (680) → separador Perfil, separador Conta e segurança, e o recorte da imagem;
   - `routes/utilizadores.js` (505) → perfil público e seguir / Definições / fotos e sessões;
   - `routes/titulos.js` (427) → parte pública / gestão do catálogo pelo admin;
   - `public/js/banner-perfil.js` (554) → um ficheiro por cenário + ajudantes + motor;
   - `public/js/paginas/admin.js` (308) → um ficheiro por secção do painel.
2. **Regras num só sítio:** a regra do nome da pessoa, a do @nome, os caracteres invisíveis e os @nomes reservados estavam repetidos no browser e no servidor (3 cópias). Agora estão só em `public/js/regras-nomes.js`, como já acontecia com as regras do email e das palavras-passe. O browser e o servidor dão as mesmas mensagens.
3. **Base de dados com um só script:** em vez de 9 scripts para correr por ordem (com a base "TavDex", quando o site usa "tavdex_site"), há só o `database/tavdex_site.sql`. As verificações da base de dados no arranque (uma por script antigo) ficaram numa só, com uma mensagem clara.
4. **Nomes em português e iguais em todo o projeto:** `compararPassword` → `compararPalavraPasse`, `campoPassword` → `campoPalavraPasse`, `ligarForm` → `ligarFormulario`, `badgeEstado` → `etiquetaEstado`, `recortarFoto` → `recortarImagem` (também recorta o banner), `validarNome` → `validarArroba` (era o @nome); um nome só para cada coisa (tirado o `validarPassword`, que era outro nome do `validarPalavraPasse`). Cada função tem uma linha a explicar o que faz.
5. **Mais testes:** gestão do catálogo pelo admin e regras dos nomes partilhadas (73 testes).

**Como se confirmou que nada mudou:** em cada passo correram os testes automáticos (`npm test`) e foi comparado o texto de 37 páginas do site (com e sem sessão iniciada, incluindo todas as secções do painel de administração) antes e depois. Os desenhos dos banners foram comparados letra a letra, e a base de dados criada pelo script novo foi comparada com a criada pelos 9 scripts antigos (tabelas, colunas, índices, chaves e dados).

## 7. Design mais simples e última limpeza (para explicar ao júri)

Nenhuma funcionalidade saiu e a base de dados e a API ficaram iguais.

1. **Design** (só o aspeto):
   - cartões dos filmes e séries: dentro do cartaz ficam só a cor, o título e a nota (★); o título e "ano · tipo" continuam por baixo (`cartaz()` em `js/comum/desenho.js`);
   - página inicial: o destaque ocupa cerca de 60% da altura do ecrã;
   - perfil: os 5 cartões de números passaram a uma linha ("9 seguidores · 14 a seguir · …", em `js/comum/cabecalho-perfil.js`); uma só caixa de géneros; o nome e a etiqueta "Admin" ficam por baixo do banner; no telemóvel a página já não fica mais larga do que o ecrã;
   - Definições: a atividade recente mostra as últimas 5 e "Ver mais"; os acessos deste computador aparecem como "Este computador" (`js/paginas/definicoes/separador-seguranca.js`).
2. **CSS:** saíram as regras que nenhuma página usava (`.spoiler` e a cor `--mag`) e as 12 secções do `style.css` têm títulos iguais (`/* ===== 5. Componentes ===== */`) e um índice no topo.
3. **Código morto:** saíram uma variável que o cenário "Rolo de película" nunca lia e duas exportações que nenhum ficheiro usava (`demasiado` e `MOTIVOS`; as funções continuam no seu ficheiro).

**Como se confirmou:** `npm test` em cada passo; fotografias das páginas (computador, telemóvel e modo claro) antes e depois, comparadas píxel a píxel no passo do CSS; e as 14 páginas principais (Início, Filmes, Séries, um filme, Projetos, um projeto, Comunidade, Chat, Notificações, Perfil, Definições, Login, Registar e Administração) abertas no Edge sem erros na consola.
