# Catálogo, pesquisa e listas pessoais

## Objetivo
O TavDex funciona como um centro de organização e descoberta de filmes e séries. Para isso, reúne o catálogo, a pesquisa, os filtros, a paginação e as listas pessoais.

## Página inicial
A página inicial mostra:
- um destaque com vários títulos a passar (ocupa cerca de 60% da altura do ecrã);
- filas de cartazes (novidades, mais populares e alguns géneros);
- o top 10 dos mais bem avaliados;
- os projetos mais recentes;
- para quem tem sessão, as recomendações.

## Catálogo
A página do catálogo (`catalogo.html`) mostra os títulos com:
- filtro por tipo: filme ou série;
- pesquisa por título ou realizador;
- filtro por género (botões no topo);
- filtro por ano;
- filtro por plataforma de streaming;
- ordenação: mais recentes, nome, ano, melhor avaliados ou mais populares;
- paginação (24 títulos por página).

## Pesquisa e filtros
A pesquisa geral (barra do topo) procura ao mesmo tempo títulos, projetos, pessoas e utilizadores.

Segurança das consultas:
- Os valores dos filtros vão sempre em *prepared statements* (`?`);
- A ordenação só aceita uma das opções de uma lista fixa (não se pode pôr `?` no `ORDER BY`).

## Página de um título
Para cada filme ou série, o sistema mostra:
- cartaz (ou, quando não há imagem, um cartaz desenhado só com a cor e o nome do título; o ano e o tipo aparecem por baixo do cartão);
- nome, ano, tipo, duração e géneros;
- sinopse e realizador;
- avaliação média e número de avaliações;
- onde ver (plataformas de streaming);
- elenco e equipa;
- temporadas e episódios (séries);
- avaliações e reviews dos utilizadores.

## Listas pessoais
Cada utilizador pode guardar títulos em três listas:
- Favoritos;
- A ver;
- Vistos.

Na página de um título, cada botão funciona como um interruptor (põe ou tira da lista). A página "As minhas listas" mostra as três listas em separadores.

## Regras das listas
- Um título não pode aparecer duas vezes na mesma lista (chave única);
- Cada lista pertence a um só utilizador;
- Marcar como visto (ou avaliar) tira o título da lista "a ver";
- No perfil público, as listas só aparecem se o dono o permitir.

## Ficheiros associados
- `routes/titulos/publico.js` — catálogo, página inicial, pesquisa e página do título;
- `routes/avaliacoes.js` — listas pessoais e recomendações;
- `routes/consultas.js` — SQL partilhado dos cartões;
- `public/js/paginas/index.js`, `catalogo.js`, `pesquisa.js`, `titulo.js`, `listas.js` — as páginas.

## Casos de uso
- O utilizador procura um filme pelo nome;
- O utilizador vê só séries de um género, ordenadas pelas melhor avaliadas;
- O utilizador guarda itens nos favoritos;
- O utilizador marca um título como já visto;
- O utilizador consulta as suas listas pessoais.

## Resultado esperado
O utilizador encontra conteúdos rapidamente, organiza os seus interesses e gere as suas listas de filmes e séries na plataforma.
