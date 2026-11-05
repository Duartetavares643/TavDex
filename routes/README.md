# routes/ – API do TavDex

Cada ficheiro desta pasta trata de uma parte do site e é ligado no `server.js`.

| Ficheiro (fase) | Endereço |
|---|---|
| `auth.js` (2) | `/api/auth`: registo, login, Google, logout, recuperação da palavra-passe |
| `utilizadores.js` (2) | `/api/utilizadores`: perfil público, definições, seguir |
| `projetos.js` (3) | `/api/projetos`: projetos, candidaturas, avaliações de projetos |
| `comunidade.js` (4) | `/api/comunidade`: feed, comentários, chat, notificações, denúncias |
| `admin.js` (4) | `/api/admin`: utilizadores e denúncias |
| `titulos.js` (5) | `/api/titulos`: catálogo, pesquisa, filtros, temporadas, CRUD (admin) |
| `avaliacoes.js` (6) | `/api/avaliacoes` e `/api/listas`: estrelas, reviews, listas, recomendações |
