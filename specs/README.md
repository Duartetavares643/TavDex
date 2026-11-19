# TavDex — documentação funcional

## Visão geral
O TavDex é uma plataforma web de descoberta, organização e avaliação de filmes e séries. A ideia central é reunir num único espaço informação sobre conteúdos audiovisuais, permitir a criação de projetos cinematográficos e a interação entre utilizadores.

O projeto é um site dinâmico e responsivo, com base de dados relacional, contas com autenticação segura e perfis pessoais. A documentação abaixo organiza as principais funcionalidades em ficheiros separados, para facilitar a manutenção, a análise e a apresentação da PAP.

## Objetivo do projeto
- Centralizar um catálogo de filmes e séries;
- Permitir pesquisa, filtros e organização por género, ano, plataforma e avaliação;
- Dar ao utilizador a possibilidade de guardar conteúdo em listas pessoais;
- Permitir avaliações de 1 a 5 estrelas com reviews;
- Criar uma comunidade com perfis, seguidores, feed e chat;
- Facilitar a partilha de projetos cinematográficos e as candidaturas;
- Garantir a gestão administrativa e a segurança das contas.

## Estrutura funcional principal
- Autenticação, sessões e segurança das contas;
- Perfil e seguidores;
- Catálogo, pesquisa, filtros e listas pessoais;
- Avaliações, reviews, recomendações e notificações;
- Projetos cinematográficos;
- Comunidade, chat e denúncias;
- Administração.

## Documentação por funcionalidade
1. [01-visao-geral-e-arquitetura.md](./01-visao-geral-e-arquitetura.md)
2. [02-login-registo-e-recuperacao.md](./02-login-registo-e-recuperacao.md)
3. [03-autenticacao-permissoes-e-seguranca.md](./03-autenticacao-permissoes-e-seguranca.md)
4. [04-perfil-utilizador-e-seguidores.md](./04-perfil-utilizador-e-seguidores.md)
5. [05-catalogo-pesquisa-e-listas.md](./05-catalogo-pesquisa-e-listas.md)
6. [06-avaliacoes-reviews-e-notificacoes.md](./06-avaliacoes-reviews-e-notificacoes.md)
7. [07-projetos-cinematograficos.md](./07-projetos-cinematograficos.md)
8. [08-comunidade-chat-e-denuncias.md](./08-comunidade-chat-e-denuncias.md)
9. [09-administracao-e-gestao.md](./09-administracao-e-gestao.md)

## Tecnologias e base de dados
- **Node.js + Express** no servidor (uma API que responde em JSON);
- **HTML, CSS e JavaScript** no browser (cada página pede os dados à API);
- **MySQL** como base de dados relacional, com *prepared statements* (`?`) em todas as consultas;
- **express-session** para as sessões, guardadas na base de dados;
- **bcrypt** para as palavras-passe, **helmet** para os cabeçalhos de segurança;
- **Nodemailer** (Gmail) para os emails, **sharp** e **multer** para as imagens;
- **Login com o Google** (OAuth 2.0 com PKCE);
- **Testes automáticos** com `node:test` (`npm test`).

## Ficheiros relevantes do projeto
- `server.js` — arranque do servidor, segurança, sessões e ligação das rotas;
- `db.js` — ligação ao MySQL;
- `routes/` — a API, um ficheiro por área (ver `routes/README.md`);
- `public/*.html` — as páginas (uma por ecrã);
- `public/js/main.js` e `public/js/api.js` — partes comuns a todas as páginas;
- `public/js/paginas/` — o JavaScript de cada página;
- `public/css/style.css` — o aspeto do site (modo escuro e modo claro);
- `database/` — scripts SQL (criar a base de dados, dados de exemplo e alterações);
- `tests/` — testes automáticos.
