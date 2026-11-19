# Comunidade, chat e denúncias

## Objetivo
A dimensão social do TavDex distingue o projeto de um simples catálogo. Além de seguir perfis e avaliar conteúdos, os utilizadores podem publicar, conversar entre si e denunciar conteúdos impróprios.

## Comunidade (feed)
A página da comunidade tem um feed de publicações:
- cada publicação pode ser ligada a um filme/série ou a um projeto;
- pode ter aviso de spoiler;
- tem gostos, comentários e respostas a comentários;
- tem dois separadores: "Todos" e "A seguir" (só quem o utilizador segue);
- o autor (ou um administrador) pode apagar as suas publicações e comentários.

## Chat
O chat inclui:
- uma sala geral para toda a comunidade;
- conversas privadas entre utilizadores;
- uma conversa nova a partir do @nome de outra pessoa (ou do botão "Mensagem" no perfil);
- editar e apagar as próprias mensagens;
- atualização automática a cada 4 segundos.

O destinatário de uma mensagem privada recebe uma notificação.

## Denúncias
Qualquer utilizador com sessão pode denunciar conteúdo impróprio. A denúncia chega à administração.

Tipos de conteúdo que se podem denunciar:
- publicação;
- comentário;
- review;
- mensagem.

Motivos possíveis:
- Spam;
- Ofensivo;
- Spoilers;
- Assédio;
- Conteúdo impróprio;
- Outro.

## Regras contra abuso
- Publicações: no máximo 3 em 5 minutos;
- Comentários: 5 por minuto;
- Mensagens: 8 em 20 segundos;
- Denúncias: 10 por hora;
- Textos com mais de 2 links são recusados;
- Não se pode denunciar duas vezes o mesmo conteúdo enquanto a primeira denúncia está pendente.

## Relação com a administração
Os administradores recebem as denúncias no painel e decidem:
- marcá-las como resolvidas ou ignoradas;
- apagar o conteúdo denunciado;
- bloquear a conta responsável.

## Ficheiros associados
- `routes/comunidade.js` — feed, chat, notificações e denúncias;
- `public/js/paginas/comunidade.js` e `chat.js` — as páginas.

## Casos de uso
- O utilizador publica a sua opinião sobre uma série;
- O utilizador inicia uma conversa com um membro da comunidade;
- O utilizador manda uma mensagem na sala geral;
- O utilizador denuncia uma mensagem ofensiva.

## Resultado esperado
A comunidade do TavDex é ativa, ligada e segura, permitindo comunicação útil entre utilizadores sem prejudicar a qualidade do ambiente.
