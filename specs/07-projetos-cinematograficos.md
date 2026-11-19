# Projetos cinematográficos

## Objetivo
Uma das funcionalidades mais distintivas do TavDex é a criação de projetos cinematográficos pelos próprios utilizadores. As pessoas podem publicar ideias de filmes, séries, curtas, documentários ou videoclipes e encontrar colaboradores.

## Estrutura do projeto
Cada projeto tem:
- título e sinopse;
- tipo: Filme, Série, Curta-metragem, Documentário ou Videoclipe;
- género;
- estado: Ideia, Recrutamento, Pré-produção, Em produção ou Concluído;
- dono do projeto;
- equipa;
- vagas;
- comentários e avaliações.

Os dados ficam nas tabelas `projetos`, `projeto_equipa`, `projeto_vagas`, `candidaturas`, `comentarios` e `projeto_avaliacoes`.

## Criação de um projeto
Um utilizador com sessão pode criar um projeto preenchendo:
- título e sinopse;
- tipo, género e estado;
- a sua função no projeto;
- as vagas que procura.

O criador entra automaticamente na equipa com a função que escolheu.

## Equipa e candidaturas
A equipa pode ter várias funções, por exemplo:
- realizador;
- produtor;
- argumentista;
- ator;
- diretor de fotografia;
- editor de vídeo.

Os membros podem ser utilizadores do TavDex ou pessoas de fora (só com o nome).

Outros utilizadores candidatam-se a uma vaga aberta, com uma mensagem para o dono. O dono vê as candidaturas e aceita ou rejeita cada uma: quem é aceite entra na equipa e recebe uma notificação. Uma candidatura pode ser retirada enquanto está pendente.

## Vagas
Cada vaga tem:
- função;
- descrição;
- estado aberta ou fechada;
- candidaturas.

## Visibilidade e interação
Qualquer pessoa pode:
- ver a lista de projetos, com pesquisa e filtros por tipo, estado e "com vagas abertas";
- abrir a página de um projeto.

Com sessão, também pode:
- acompanhar o projeto (recebe notificações de novidades);
- avaliar o projeto de 1 a 5 estrelas, com texto (o dono não pode avaliar o seu);
- comentar;
- candidatar-se a vagas.

## Regras de negócio
- Só utilizadores com sessão podem criar projetos ou candidatar-se;
- Só o dono (ou um administrador) edita o projeto, gere a equipa e as vagas e decide as candidaturas;
- Ninguém se pode candidatar ao próprio projeto;
- No máximo 3 projetos novos por hora e 5 candidaturas em 10 minutos;
- As candidaturas repetidas são impedidas por uma chave única;
- Apagar um projeto apaga também a equipa, as vagas e as candidaturas (em cascata).

## Ficheiros associados
- `routes/projetos.js` — toda a API dos projetos;
- `public/js/paginas/projetos.js`, `projeto.js`, `projeto-novo.js`, `projeto-editar.js`, `candidaturas.js` — as páginas;
- `public/js/projeto-form.js` — campos do formulário (criar e editar).

## Resultado esperado
O TavDex transforma a comunidade de cinema numa plataforma de produção colaborativa, onde os utilizadores apresentam ideias criativas e encontram parceiros.
