# Visão geral e arquitetura

## Descrição do sistema
O TavDex é um site dedicado à descoberta, organização e avaliação de filmes e séries. O objetivo é criar uma plataforma intuitiva, com informação detalhada sobre títulos, listas pessoais, avaliações e comunicação entre utilizadores.

O projeto vai além do catálogo tradicional, porque também inclui uma área de comunidade e uma secção para criação e desenvolvimento de projetos cinematográficos. Desta forma, o TavDex combina conteúdo, interação social e gestão criativa.

## Objetivos principais
- Reunir informação sobre filmes e séries num único local;
- Oferecer pesquisa por vários critérios;
- Permitir que cada utilizador organize o conteúdo de que gosta;
- Apoiar a decisão de visualização com avaliações, reviews e recomendações;
- Promover a partilha de ideias e projetos cinematográficos;
- Desenvolver uma comunidade ativa de utilizadores.

## Arquitetura da solução
O TavDex separa a parte que o utilizador vê (o browser) da parte que guarda e protege os dados (o servidor):

- **Apresentação (browser):** páginas `.html` em `public/` que só têm a "moldura". O JavaScript de cada página (`public/js/paginas/`) pede os dados à API e desenha o conteúdo. As partes comuns (topo, rodapé, cartões, formulários, modo claro/escuro) estão em `public/js/main.js`.
- **API (servidor):** Node.js com Express (`server.js`). Cada área do site tem um ficheiro em `routes/` (autenticação, utilizadores, títulos, projetos, comunidade, administração, …). A API responde sempre em JSON.
- **Regras de negócio:** ficam no servidor, nas rotas e em ficheiros de apoio (`routes/ajudas.js`, `routes/palavras-passe.js`, `routes/consultas.js`). Tudo o que o browser envia é validado outra vez no servidor.
- **Acesso a dados:** MySQL através do `mysql2` (`db.js`), sempre com *prepared statements*.

Fluxo de um pedido:
1. O browser abre uma página `.html`;
2. O JavaScript da página chama a API com `api('/api/...')` (`public/js/api.js`), que junta o token CSRF;
3. O servidor confirma a sessão, valida os dados, consulta o MySQL e responde em JSON;
4. A página mostra o resultado, sempre com o texto escapado (contra XSS).

## Entidades principais
- Utilizadores (com sessões, atividade da conta e géneros favoritos)
- Títulos (filmes e séries, com temporadas e episódios)
- Géneros, pessoas (elenco e equipa) e plataformas de streaming
- Avaliações e reviews
- Listas pessoais (favoritos, a ver, vistos)
- Projetos cinematográficos, equipa, vagas e candidaturas
- Publicações, comentários, gostos e mensagens
- Notificações e denúncias

## Fluxo de utilização principal
1. O utilizador cria conta (e confirma o email) ou entra com o Google.
2. Explora o catálogo ou pesquisa títulos específicos.
3. Adiciona itens aos favoritos, à lista "a ver" ou aos vistos.
4. Avalia conteúdos e escreve reviews.
5. Participa na comunidade: segue pessoas, publica no feed e conversa no chat.
6. Cria ou acompanha projetos cinematográficos e candidata-se a vagas.
7. Recebe notificações sobre seguidores, mensagens, candidaturas e comentários.

## Casos de utilização chave
- Um utilizador quer pesquisar um filme por género e ano;
- Um utilizador quer guardar filmes para ver mais tarde;
- Um utilizador quer deixar uma avaliação de 5 estrelas;
- Um utilizador quer seguir outro utilizador;
- Um utilizador quer criar uma ideia de filme ou série e procurar equipa;
- Um administrador quer tratar denúncias e gerir o catálogo.

## Requisitos de qualidade
- Interface clara e responsiva (telemóvel, tablet e computador), com modo claro e escuro;
- Navegação intuitiva;
- Segurança das contas: palavras-passe fortes, email confirmado, sessões controladas e proteção CSRF;
- Acesso controlado pelo papel do utilizador (utilizador ou administrador);
- Validação de todos os dados no servidor;
- Testes automáticos (`npm test`) para as partes mais importantes;
- Estrutura organizada por áreas, fácil de expandir.
