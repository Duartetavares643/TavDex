# Avaliações, reviews, recomendações e notificações

## Objetivo
O TavDex não se resume à consulta de conteúdo. Cada utilizador pode dar a sua opinião, receber sugestões à medida e ser avisado das interações da comunidade.

## Avaliações
Os utilizadores podem classificar títulos de 1 a 5 estrelas.

Regras:
- cada utilizador avalia cada título uma única vez (se avaliar outra vez, a avaliação é editada);
- a nota é validada no servidor (1 a 5);
- a avaliação pode ter uma review opcional (até 2000 caracteres);
- quem avalia passa a ter o título nos "vistos".

As avaliações ficam na tabela `avaliacoes`. A média e o total vêm da vista `vw_titulos_avaliacao` e aparecem no catálogo e na página do título.

## Reviews
A review permite deixar uma opinião mais completa sobre o conteúdo, com:
- texto livre (no máximo 2 links);
- aviso de spoiler (o texto fica escondido até se clicar);
- edição posterior, com a data da última edição;
- botão para denunciar.

## Recomendações
O "Recomendado para ti" sugere títulos com base:
- nos géneros dos títulos que o utilizador avaliou bem ou marcou como favoritos;
- nos géneros favoritos escolhidos no perfil (útil enquanto há poucas avaliações).

Não sugere títulos que o utilizador já viu ou avaliou.

## Notificações
O sistema cria notificações para avisar os utilizadores de:
- novo seguidor;
- comentário numa publicação ou projeto;
- gosto numa publicação;
- candidatura recebida ou resposta a uma candidatura;
- nova mensagem privada;
- novidades num projeto que acompanha;
- avisos do sistema.

A página de notificações:
- tem filtros por tipo;
- permite marcar como lidas (uma ou todas);
- permite silenciar tipos de notificação.

O utilizador pode também receber as notificações por email. O número de notificações por ler aparece no topo do site.

## Feedback ao utilizador
A plataforma mostra avisos verdes (sucesso) e vermelhos (erro) no topo da página. Nos formulários, os campos errados ficam a vermelho com a mensagem por baixo.

## Regras de segurança
- O servidor valida tudo antes de guardar;
- Avaliar e comentar exige sessão iniciada;
- Cada notificação pertence a um utilizador e só ele a vê;
- Ninguém é notificado das suas próprias ações;
- Há limites contra o excesso de ações em pouco tempo.

## Ficheiros associados
- `routes/avaliacoes.js` — avaliações, listas e recomendações;
- `routes/consultas.js` — cálculo das recomendações;
- `routes/comunidade.js` — notificações;
- `routes/ajudas.js` — função `notificar()`;
- `public/js/paginas/titulo.js` e `notificacoes.js` — as páginas.

## Casos de uso
- O utilizador avalia um filme com 4 estrelas;
- O utilizador escreve uma review com aviso de spoiler;
- O utilizador recebe uma notificação de novo seguidor;
- O utilizador recebe uma mensagem privada ou a resposta a uma candidatura.

## Resultado esperado
O utilizador consegue classificar, comentar, receber sugestões e ser avisado do que acontece, tornando a plataforma mais dinâmica e interativa.
