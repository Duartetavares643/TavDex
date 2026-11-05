# TavDex — documentação funcional

## Visão geral
O TavDex é uma plataforma web de descoberta, organização e avaliação de filmes e séries. A ideia central é reunir num único espaço informação sobre conteúdos audiovisuais, para além de permitir a criação de projetos cinematográficos e a interação entre utilizadores.

O projeto foi pensado como um sistema dinâmico e responsivo, com base de dados relacional, acesso autenticado e perfis pessoais. A documentação abaixo organiza as principais funcionalidades do sistema em ficheiros separados, para facilitar manutenção, análise e apresentação da PAP.

## Objetivo do projeto
- Centralizar catálogo de filmes e séries;
- Permitir pesquisa, filtros e organização por género, ano e avaliação;
- Dar ao utilizador a possibilidade de guardar conteúdo em listas pessoais;
- Permitir avaliação com classificação 1 a 5 e reviews;
- Criar comunidade com perfis, seguidores e chat;
- Facilitar a partilha de projetos cinematográficos e candidaturas;
- Garantir gestão administrativa e controlo de segurança.

## Estrutura funcional principal
- Autenticação e sessão do utilizador;
- Gestão de perfil e seguidores;
- Catálogo, pesquisa e filtros;
- Listas pessoais;
- Avaliações, reviews e recomendações;
- Projetos cinematográficos;
- Comunicação e comunidade;
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
O projeto utiliza:
- PHP para a lógica do servidor;
- HTML, CSS e JavaScript para a interface web;
- MySQL como base de dados relacional;
- Sessões para autenticação e controlo de acesso;
- PDO para consulta e segurança das queries;
- CSRF e validação de inputs para reduzir vulnerabilidades.

## Ficheiros relevantes do projeto
- login.php, registar.php, recuperar.php, repor.php — fluxo de autenticação;
- lib.php — funções de sessão, validação, segurança e apresentação;
- catalogo.php — pesquisa, filtros e paginação;
- listas.php — listas pessoais de favoritos e conteúdos;
- projeto_novo.php e projeto_form.php — criação de projetos;
- chat.php e chat_api.php — comunidade e mensagens;
- admin.php — gestão administrativa.
