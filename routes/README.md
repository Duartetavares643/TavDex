# routes/ – API do TavDex

Cada ficheiro trata de uma parte do site e é ligado no `server.js`. A lista completa de endereços está no topo de cada ficheiro.

| Ficheiro (fase) | Endereço base | O quê |
|---|---|---|
| `auth.js` (2) | `/api/auth` | registo, login, logout, recuperação da palavra-passe (`GET /repor/:token` verifica o link), `@nome`/email disponível |
| `confirmacao-email.js` (2) | `/api/confirmacao` | confirmar o email por link (registo e mudança de email), reenviar o link |
| `google.js` (2) | `/api/auth/google` e `/api/conta` | login com o Google (OAuth 2.0 + PKCE), ligar (`?modo=ligar`), `POST /api/conta/google/desligar` |
| `utilizadores.js` (2) | `/api/utilizadores` | perfil público, seguir (também `POST /api/seguir/:id`), definições, foto e banner (`/eu/foto`, `/eu/banner`), sessões ativas, apagar conta |
| `projetos.js` (3) | `/api/projetos` | projetos, equipa, vagas, candidaturas, acompanhar, comentários, avaliações |
| `comunidade.js` (4) | `/api/comunidade` | feed, gostos, comentários, chat, notificações, denúncias |
| `admin.js` (4) | `/api/admin` | estatísticas, utilizadores, denúncias |
| `titulos.js` (5) | `/api/titulos` | catálogo, página inicial, pesquisa, página do título, CRUD (admin) |
| `avaliacoes.js` (6) | `/api/avaliacoes`, `/api/listas`, `/api/recomendacoes` | estrelas e reviews, listas pessoais, recomendações |

Ficheiros de apoio (não têm endereços próprios):

| Ficheiro | O quê |
|---|---|
| `middleware.js` | `utilizadorAtual` (confirma a sessão na tabela `sessoes` e que a conta não está bloqueada), `exigirLogin`, `exigirAdmin`, `exigirLoginPagina`, `iniciarSessao`, `terminarSessao` |
| `ajudas.js` | `falha()` (erro com mensagem), `Validacao` (todos os erros juntos), validação (`texto`, `inteiro`, `email`, `validarEmail`, …), anti-spam, `notificar()`, paginação |
| `palavras-passe.js` | regras das palavras-passe no servidor: as mesmas do browser + lista das mais comuns + fugas de dados (HIBP) |
| `consultas.js` | SQL dos cartões de títulos e projetos, listas pessoais e `recomendacoes()` |
| `fotos.js` | receber, validar e reduzir as fotos de perfil e as imagens do banner (multer + sharp) |
| `email.js` | envio de emails com o Nodemailer pelo Gmail (sem Gmail, ficam guardados na pasta `emails/`) |

**Erros:** uma rota faz `falha(400, 'mensagem')` e o `server.js` responde `{ erro: 'mensagem' }` com esse código.
