# Autenticação, permissões e segurança

## Objetivo
O TavDex tem regras de segurança para garantir que apenas as pessoas certas acedem a cada conteúdo. Este documento descreve o sistema de sessões, as permissões e as proteções contra os ataques mais comuns.

## Sessão e autenticação
O servidor usa o **express-session**. O cookie (`tavdex.sid`) é `httpOnly` (o JavaScript da página não o lê), `sameSite=lax` e `secure` em https.

Cada login cria também uma linha na tabela `sessoes`, com o dispositivo e o IP. Assim o utilizador vê as **sessões ativas** nas Definições e pode terminá-las.

Duração da sessão:
- **Sem "Manter sessão iniciada":** acaba ao fechar o browser ou depois de 12 horas sem atividade;
- **Com "Manter sessão iniciada":** dura 30 dias, renovados com a atividade, e nunca mais de 90 dias.

Funções principais (`routes/middleware.js`):
- `utilizadorAtual` — em cada pedido à API, confirma a sessão, que não expirou e que a conta não está bloqueada; põe o utilizador em `req.u`;
- `exigirLogin` — bloqueia a API a quem não tem sessão (a página abre a janela "Inicia sessão para continuar");
- `exigirAdmin` — só deixa passar administradores;
- `exigirLoginPagina` — as páginas privadas mandam para o login e voltam depois;
- `iniciarSessao` — cria uma sessão com um ID novo (contra *session fixation*);
- `terminarSessao` — apaga a sessão e o cookie.

O logout pode ser só neste dispositivo ou em todos. Os outros separadores abertos ficam logo a saber (BroadcastChannel). Depois de sair, o botão Retroceder não mostra dados da conta (`Cache-Control: no-store`).

## Níveis de acesso
O sistema tem dois papéis:
- utilizador;
- administrador.

O administrador:
- trata denúncias e apaga conteúdo impróprio;
- bloqueia contas e muda papéis;
- gere o catálogo (títulos, géneros, pessoas, plataformas, temporadas);
- pode gerir qualquer projeto e as suas candidaturas.

## Proteção CSRF
Cada sessão recebe um token secreto (`GET /api/csrf`). Todos os pedidos que mudam dados (POST, PUT, PATCH, DELETE) têm de o enviar no cabeçalho `X-CSRF-Token`. Sem o token certo, o servidor responde 403.

## Prevenção de XSS e cabeçalhos de segurança
- Todo o texto dos utilizadores é escapado com `esc()` antes de entrar no HTML;
- O **helmet** envia uma *Content Security Policy* (só scripts do próprio site), proteção contra *clickjacking* e outros cabeçalhos de segurança.

## Base de dados
- Todas as consultas usam *prepared statements* (`?`), contra *SQL injection*;
- As palavras-passe são guardadas com **bcrypt**;
- Os tokens dos links dos emails são guardados apenas em hash (SHA-256).

## Controlo de abuso (anti-spam)
- Login: 5 falhas por conta ou 20 por IP em 15 minutos bloqueiam durante 15 minutos;
- Registo: 15 contas por IP em 10 minutos, campo-armadilha e tempo mínimo de preenchimento;
- Recuperação da palavra-passe: 3 pedidos por hora por conta e 10 por IP;
- Emails de confirmação: 5 por hora, com 60 segundos entre envios;
- Publicações: 3 em 5 minutos;
- Comentários: 5 por minuto;
- Mensagens: 8 em 20 segundos;
- Projetos: 3 por hora;
- Candidaturas: 5 em 10 minutos;
- Denúncias: 10 por hora;
- Textos com mais de 2 links são recusados;
- Os administradores podem bloquear contas.

## Mensagens ao utilizador
A API responde aos erros com `{ erro: 'mensagem' }` e, nos formulários, com os erros de cada campo. A página marca os campos a vermelho e mostra avisos verdes ou vermelhos no topo. Os erros técnicos ficam só no registo do servidor.

## Regras de negócio relevantes
- Só utilizadores com sessão podem avaliar, publicar, comentar, enviar mensagens ou criar projetos;
- Só o dono do projeto (ou um administrador) vê e decide as candidaturas;
- Cada pessoa só pode editar ou apagar o que é seu (os administradores podem apagar conteúdo impróprio);
- O endereço "voltar" depois do login só aceita páginas do próprio site (contra *open redirect*).

## Resultado esperado
O TavDex oferece um sistema seguro, com autenticação fiável, controlo de permissões e proteção contra os ataques mais comuns da web.
