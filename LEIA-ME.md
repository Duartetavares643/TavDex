# TavDex – PAP 2026/2027

Site dinâmico e responsivo para descobrir, organizar e avaliar filmes e séries, com comunidade e projetos cinematográficos.

**Tecnologias:** HTML, CSS e JavaScript puro (páginas) · Node.js + Express 5 (servidor) · MySQL 8 com mysql2 (base de dados) · bcryptjs, express-session, CSRF, Google OAuth 2.0 e Nodemailer.

## Instalação
1. Instalar o **Node.js 20** (ou mais recente) e o **MySQL 8** (ou o MySQL do XAMPP).
2. No MySQL Workbench, executar **por esta ordem**:
   1. `database/01_criar_bd.sql`: cria a base de dados `TavDex` (apaga-a se já existir)
   2. `database/02_inserir_dados.sql`: dados de exemplo
   3. `database/extras.sql`: tabelas e colunas das Fases 2 a 6 (sessões, atividade, gostos, elenco, episódios, …)
3. Copiar `.env.example` para `.env` e preencher pelo menos `BD_PASSWORD` e `SEGREDO_SESSAO`.
   - **Google** (opcional): criar um "ID do cliente OAuth" em https://console.cloud.google.com com o URI de redirecionamento
     `http://localhost:3000/api/auth/google/callback` e pôr `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.
   - **Gmail** (opcional): pôr o email em `GMAIL_UTILIZADOR` e uma *palavra-passe de aplicação* em `GMAIL_PASSWORD_APP`.
     Sem isto, os emails (ex.: recuperar palavra-passe) aparecem escritos na consola do servidor.
4. Na pasta do projeto:
   ```
   npm install
   npm start
   ```
5. Abrir http://localhost:3000

## Contas de teste
| Conta | Email | Palavra-passe |
|---|---|---|
| Administrador | duarte@tavdex.pt | Admin#2026 |
| Utilizador | lara@mail.pt | tavdex123 |

Os outros utilizadores de exemplo usam `nome@mail.pt` e a palavra-passe `tavdex123`. Também se pode entrar com o nome (ex.: `DuarteT`).

## Estrutura
```
server.js            servidor Express: sessões, CSRF, cabeçalhos de segurança, rotas, erros
db.js                ligação ao MySQL: linhas(), linha(), executar()
.env                 segredos (não vai para o GitHub)
routes/              API – ver routes/README.md
  middleware.js      utilizadorAtual, exigirLogin, exigirAdmin, iniciar/terminar sessão
  ajudas.js          validação, anti-spam, notificações, paginação
  consultas.js       SQL partilhado (cartões) e recomendações
  email.js           Nodemailer
public/              páginas .html (uma por ecrã)
  js/api.js          api() (fetch + token CSRF) e esc() (contra XSS)
  js/main.js         barra de navegação, rodapé, tema, cartões, estrelas, separadores
  js/paginas/        o JavaScript de cada página
  css/style.css      tema escuro vermelho/magenta (e modo claro)
database/            scripts SQL e modelo ER
specs/               documentação funcional
antigo_php/          versão anterior em PHP (só como referência)
```

## Como funciona (para explicar ao júri)
1. O browser abre uma página `.html` (só tem a "moldura").
2. O JavaScript da página pede os dados à API com `api('/api/...')`, que devolve JSON.
3. O servidor valida tudo, consulta o MySQL com prepared statements (`?`) e responde.
4. A página desenha o HTML com os dados, escapando sempre o texto com `esc()`.

**Segurança:** palavras-passe com bcrypt · sessões guardadas no MySQL, com a lista de dispositivos em `sessoes` (dá para terminar sessões noutros dispositivos) · token CSRF em todos os POST/PUT/DELETE · bloqueio após 5 logins falhados em 15 minutos (tabela `tentativas_login`) · registo de eventos em `atividade_conta` · tokens de recuperação guardados só em SHA-256, válidos 30 minutos e de uso único · anti-spam (limites por tempo, campo-armadilha, máximo de 2 links) · permissões de dono/admin verificadas no servidor.

## Fases
| Fase | O quê | Páginas | API |
|---|---|---|---|
| 1 ✔ | Base de dados e servidor | – | `/api/estado` |
| 2 ✔ | Registo, login (+ Google), recuperação, perfil, seguidores, definições | index, registar, login, recuperar, repor, perfil, definicoes | `routes/auth.js`, `routes/utilizadores.js` |
| 3 ✔ | Projetos, equipa, vagas, candidaturas, acompanhar, comentários, avaliações | projetos, projeto, projeto-novo, projeto-editar, candidaturas | `routes/projetos.js` |
| 4 ✔ | Feed, gostos, chat, notificações (silenciar), denúncias, admin | comunidade, chat, notificacoes, admin | `routes/comunidade.js`, `routes/admin.js` |
| 5 ✔ | Catálogo, filtros, pesquisa, página do título, elenco, temporadas/episódios, CRUD | catalogo, titulo, pesquisa, admin (Filmes e séries) | `routes/titulos.js` |
| 6 ✔ | Estrelas, reviews com spoilers, listas, recomendações | titulo, listas, perfil, index | `routes/avaliacoes.js` |

## Testar no browser (roteiro para a apresentação)
1. **Sem conta:** página inicial → catálogo (filtrar por género, ordenar por nota) → abrir *Breaking Bad* (elenco, temporadas e episódios) → pesquisar "nolan".
2. **Registo:** criar conta → escolher a cor do avatar nas Definições.
3. **Login falhado 5 vezes** com a mesma conta → aparece o bloqueio de 15 minutos.
4. **Recuperar palavra-passe:** o link aparece na consola do servidor (ou no Gmail, se estiver configurado).
5. **Como lara@mail.pt:** avaliar um filme com review e spoiler, pôr em favoritos, ver as recomendações em "As minhas listas".
6. **Projetos:** criar um projeto com uma vaga → entrar com outra conta e candidatar-se → voltar ao dono e aprovar (o candidato passa para a equipa).
7. **Comunidade e chat:** publicar, gostar, comentar e responder; mandar uma mensagem privada (aparece sozinha na outra conta).
8. **Notificações:** ver o sino com o número, silenciar "Gostos".
9. **Admin (duarte@tavdex.pt):** estatísticas, bloquear um utilizador, resolver uma denúncia, criar um filme com elenco e uma série com temporadas.
10. **Definições:** sessões ativas noutro browser → "Terminar" → essa sessão perde o login.
