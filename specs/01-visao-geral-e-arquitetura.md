# Visão geral e arquitetura

## Descrição do sistema
O TavDex é um site dedicado à descoberta, organização e avaliação de filmes e séries. O objetivo é criar uma plataforma intuitiva, com informação detalhada sobre títulos, listas pessoais, avaliações e comunicação entre utilizadores.

O projeto vai além do catálogo tradicional, porque também inclui uma área de comunidade e uma secção para criação e desenvolvimento de projetos cinematográficos. Desta forma, o TavDex combina conteúdo, interação social e gestão criativa.

## Objetivos principais
- Reunir informação sobre filmes e séries num único local;
- Oferecer pesquisa por múltiplos critérios;
- Permitir que cada utilizador organize o conteúdo que gosta;
- Apoiar a decisão de visualização com avaliações e comentários;
- Promover a partilha de ideias e projetos cinematográficos;
- Desenvolver uma comunidade ativa de utilizadores.

## Arquitetura da solução
A arquitetura do TavDex é baseada em um modelo web simples e funcional:

- Camada de apresentação: páginas PHP com HTML, CSS e JS;
- Camada de lógica: funções em lib.php para sessão, autenticação, segurança e apresentação;
- Camada de acesso a dados: consultas PDO para MySQL;
- Camada de negócio: regras para avaliações, listas, projetos e convites/conversas.

## Entidades principais
- Utilizadores
- Títulos (filmes e séries)
- Géneros
- Plataformas de streaming
- Avaliações
- Listas pessoais
- Projetos cinematográficos
- Equipa e vagas de projeto
- Candidaturas
- Mensagens e notificações
- Denúncias e administração

## Fluxo de utilização principal
1. O utilizador cria conta ou inicia sessão.
2. Explora o catálogo ou pesquisa títulos específicos.
3. Adiciona itens a favoritos, para ver ou vistos.
4. Avalia conteúdos e escreve reviews.
5. Participa na comunidade com seguidores, mensagens e chats.
6. Cria ou acompanha projetos cinematográficos.
7. Recebe notificações e interage com pedidos de candidatura ou mensagens.

## Casos de utilização chave
- Um utilizador quer pesquisar um filme por género e ano;
- Um utilizador quer guardar filmes para ver mais tarde;
- Um utilizador quer deixar uma avaliação de 5 estrelas;
- Um utilizador quer seguir outro utilizador;
- Um utilizador quer criar uma ideia de filme ou série e publicar a sua equipa;
- Um administrador quer gerir denúncias e candidaturas.

## Requisitos de qualidade
- Interface clara e responsiva;
- Navegação intuitiva;
- Segurança de sessão e CSRF;
- Acesso controlado por papel de utilizador;
- Validação de dados de entrada;
- Estrutura escalável para futura expansão.
