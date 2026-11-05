# Catálogo, pesquisa e listas pessoais

## Objetivo
O TavDex pretende funcionar como um centro de organização e descoberta de filmes e séries. Para isso, reúne as funcionalidades de catálogo, pesquisa, filtros, paginação e gestão de listas pessoais.

## Catálogo
A página catalogo.php apresenta os títulos disponíveis, com:
- filtro por tipo: filme ou série;
- pesquisa por título ou realizador;
- filtro por género;
- filtro por ano;
- filtro por avaliação mínima;
- filtro por plataforma de streaming;
- ordenação por nome, data, avaliação ou popularidade;
- paginação de resultados.

## Pesquisa e filtros
A busca usa parâmetros de query string e constrói a consulta de forma segura, sem concatenar diretamente texto sem validação.

Filtros implementados:
- tipo de conteúdo;
- palavra-chave;
- género;
- ano;
- avaliação mínima;
- plataforma;
- ordem de apresentação.

## Listas pessoais
Cada utilizador pode guardar conteúdos em listas de:
- Favoritos;
- Para ver;
- Vistos.

Essas listas são geridas em listas.php e ações por acoes.php. Quando um utilizador marca um título como visto, o sistema remove automaticamente a opção de “para ver” para esse mesmo item.

## Regras de lista
- Um utilizador não pode repetir o mesmo item na mesma lista;
- Cada lista é específica para o utilizador;
- A listagem pode ser visualizada por categoria;
- É possível remover itens da lista.

## Conteúdo associado
Para cada título, o sistema pode mostrar:
- cartaz;
- nome;
- tipo;
- género;
- avaliação média;
- número de avaliações;
- sinopse;
- plataformas de visualização.

## Casos de uso
- O utilizador procura um filme por nome;
- O utilizador escolhe apenas séries com avaliação acima de 4 estrelas;
- O utilizador guarda itens nos favoritos;
- O utilizador marca um título como já visto;
- O utilizador consulta o histórico das suas listas pessoais.

## Resultado esperado
O utilizador consegue encontrar conteúdos rapidamente, organizar os seus interesses e manter uma gestão pessoal eficaz de filmes e séries na plataforma.
