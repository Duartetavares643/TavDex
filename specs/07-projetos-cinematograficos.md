# Projetos cinematográficos

## Objetivo
Uma das funcionalidades mais distintivas do TavDex é a criação de projetos cinematográficos pelos próprios utilizadores. A ideia é permitir que pessoas publiquem ideias de filmes, séries, curtas, documentários ou videoclipes e encontrem colaboradores.

## Estrutura do projeto
Cada projeto tem:
- título;
- sinopse;
- tipo de projeto;
- género;
- estado de desenvolvimento;
- dono do projeto;
- equipa;
- vagas abertas.

Os dados são armazenados nas tabelas de projetos, equipa e vagas.

## Criação de um projeto
Um utilizador autenticado pode criar um projeto preenchendo:
- nome do projeto;
- descrição;
- tipo;
- género;
- estado atual;
- função no projeto;
- vagas que procura.

O criador entra automaticamente na equipa e é identificado como membro inicial do projeto.

## Equipa e candidaturas
Cada projeto pode ter uma equipa composta por diferentes funções, como:
- realizador;
- produtor;
- argumentista;
- ator;
- diretor de fotografia;
- editor de vídeo.

Outros utilizadores podem candidatar-se a uma vaga. O dono do projeto pode aceitar ou rejeitar candidaturas e, ao aceitar, a pessoa passa a fazer parte da equipa.

## Vagas
A funcionalidade de vagas permite criar anúncios para posições abertas no projeto. Cada vaga pode ter:
- função;
- descrição;
- estado aberto/fechado;
- candidatos.

## Visibilidade e interação
Os utilizadores podem:
- consultar projetos publicamente;
- acompanhar o progresso do projeto;
- avaliar o projeto;
- interagir com a equipa;
- consultar candidaturas submetidas.

## Regras de negócio
- Só utilizadores autenticados podem criar ou candidatar-se a projetos;
- O dono do projeto tem controlo sobre as candidaturas;
- O sistema limita o número de projetos criados num curto intervalo de tempo;
- Candidaturas repetidas são impedidas por chave única.

## Resultado esperado
O TavDex permite transformar a ideia de comunidade de cinema em uma plataforma de produção colaborativa, onde utilizadores podem apresentarem ideias criativas e encontrar parceiros.
