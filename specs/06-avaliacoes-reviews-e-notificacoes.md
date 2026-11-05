# Avaliações, reviews e notificações

## Objetivo
A experiência do TavDex não se resume à consulta de conteúdo. O sistema permite que cada utilizador exprima a sua opinião e receba informação relevante sobre interações dentro da comunidade.

## Avaliações
Os utilizadores podem classificar títulos de 1 a 5 estrelas.

Regras:
- cada utilizador pode avaliar cada título apenas uma vez;
- a nota é guardada com validação de intervalo 1 a 5;
- a avaliação pode incluir review opcional;
- existe suporte para marcar spoiler.

As avaliações são guardadas em `avaliacoes` e a média resultante pode ser apresentada em páginas de catálogo e detalhe.

## Reviews
A review permite deixar um comentário mais completo sobre o conteúdo, com possibilidade de:
- texto livre;
- identificação de spoilers;
- edição posterior da revisão;
- visualização da data da última edição.

## Notificações
O sistema produz notificações para informar os utilizadores sobre eventos importantes, como:
- início de seguimento;
- resposta a candidatura;
- nova mensagem recebida;
- alterações no estado de um projeto;
- interação relevante na comunidade.

## Feedback ao utilizador
A plataforma usa mensagens flash para confirmar ações e informar o utilizador de erros. Isso melhora a experiência e facilita o entendimento dos estados do sistema.

## Regras de segurança
- O sistema valida a informação antes de guardar;
- as ações de avaliação e comentários dependem de sessão autenticada;
- as notificações são associadas ao respetivo utilizador;
- há controlo para prevenir abuso e excesso de ações num curto intervalo de tempo.

## Casos de uso
- O utilizador avalia um filme com 4 estrelas;
- O utilizador escreve uma review com aviso de spoiler;
- O utilizador recebe uma notificação de novo seguidor;
- O utilizador recebe uma mensagem privada ou uma resposta a uma candidatura.

## Resultado esperado
O utilizador consegue classificar, comentar e receber feedback contextualizado, tornando a plataforma mais dinâmica e interativa.
