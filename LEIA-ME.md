# TavDex – PAP 2026/2027

Site dinâmico e responsivo para descobrir, organizar e avaliar filmes e séries, com comunidade e projetos cinematográficos.

**Tecnologias:** HTML, CSS e JavaScript puro (páginas) · Node.js + Express 5 (servidor) · MySQL 8 com mysql2 (base de dados) · bcryptjs, express-session, helmet, CSRF, Google OAuth 2.0 com PKCE (feito com `fetch`, sem bibliotecas do Google), multer + sharp (fotos) e Nodemailer.

> **bcryptjs ou bcrypt?** O `bcryptjs` é o mesmo algoritmo bcrypt escrito em JavaScript. Os hashes são iguais aos do `bcrypt` e não é preciso compilar nada no Windows.

## Instalação
1. Instalar o **Node.js 20** (ou mais recente) e o **MySQL 8** (ou o WAMP).
2. Criar a base de dados com **um só script**, `database/tavdex_site.sql` (tabelas + dados de exemplo):
   - phpMyAdmin: **Importar** → escolher o ficheiro → Executar; ou
   - na linha de comandos: `mysql -u root < database/tavdex_site.sql`

   Cria a base de dados `tavdex_site` (apaga-a se já existir).
   > A pasta `database/alteracoes-antigas/` tem os scripts com que a base de dados foi crescendo. Só servem para pôr em dia uma base de dados antiga **sem perder os dados**; para instalar, não são precisos.
3. Copiar `.env.example` para `.env` e preencher pelo menos `BD_PASSWORD` (vazia no WAMP), `BD_NOME=tavdex_site` e `SEGREDO_SESSAO`.
   O Google e o Gmail são opcionais (ver as secções abaixo).
4. Na pasta do projeto:
   ```
   npm install
   npm start
   ```
5. Abrir http://localhost:3000 (sempre `localhost`, nunca `127.0.0.1`: se os misturares, o login com o Google perde a sessão)
6. Testes automáticos (com o MySQL ligado): `npm test`. Criam contas `teste_…` e apagam-nas no fim.

## Contas de teste
| Conta | Email | Palavra-passe |
|---|---|---|
| Administrador | duarte@tavdex.pt | Admin#2026 |
| Utilizador | lara@mail.pt | tavdex123 |

Os outros utilizadores de exemplo usam `nome@mail.pt` e a palavra-passe `tavdex123`. Também se pode entrar com o @nome (ex.: `DuarteT`).

## Variáveis de ambiente
Em localhost ficam no ficheiro `.env`. Num alojamento (Render, Railway, …) põem-se no painel **Environment** do serviço.
Valores sem aspas e sem espaços à volta do `=`.

| Variável | Obrigatória | Para que serve |
|---|---|---|
| `PORTA` | não (3000) | porta do servidor |
| `URL_SITE` | sim | endereço público, sem `/` no fim. Se for `https://…`, o site obriga a https e os cookies ficam `secure` |
| `BD_HOST`, `BD_PORTA`, `BD_UTILIZADOR`, `BD_PASSWORD`, `BD_NOME` | sim | ligação ao MySQL |
| `SEGREDO_SESSAO` | sim | assina o cookie da sessão (frase longa e aleatória) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | para o Google | credenciais OAuth da Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | não | por omissão é `URL_SITE` + `/api/auth/google/callback`; tem de ser igual ao registado na Google |
| `EMAIL_MODE` | não | `smtp`, `ficheiro` (pasta `emails/`) ou `consola` |
| `GMAIL_UTILIZADOR`, `GMAIL_PASSWORD_APP` | para enviar emails | conta Gmail e palavra-passe de aplicação |
| `EMAIL_FROM` | não | remetente, ex.: `TavDex <o.teu.email@gmail.com>` |
| `VERIFICAR_FUGAS` | não (1) | `0` desliga a verificação das palavras-passe no Have I Been Pwned |
| `VERIFICAR_DNS` | não (1) | `0` desliga a verificação de que o domínio do email recebe emails |

## Configurar o login com o Google
O TavDex usa OAuth 2.0 "authorization code" com PKCE. O botão leva à página verdadeira da Google
(`prompt=select_account` mostra a lista de contas) e a Google volta a `/api/auth/google/callback`.

1. Em https://console.cloud.google.com criar o projeto **TavDex**.
2. **Google Auth Platform → Marca**: nome *TavDex*, email de suporte e as ligações para a página inicial,
   a Política de privacidade (`/privacidade`) e os Termos (`/termos`).
   Quando o site estiver publicado, acrescentar o domínio em *Domínios autorizados*. Não carregar logótipo,
   porque isso obriga a Google a verificar a marca.
3. **Público**: *Externo*. Enquanto a app estiver em **Teste**, só entram os emails que estiverem em *Utilizadores de teste*.
4. **Clientes → Criar cliente → Aplicação Web**:
   - Origens JavaScript autorizadas: `http://localhost:3000` (e, quando publicado, `https://<domínio>`)
   - URIs de redirecionamento autorizados: `http://localhost:3000/api/auth/google/callback`
     (e, quando publicado, `https://<domínio>/api/auth/google/callback`)
   - O segredo só aparece uma vez: copiá-lo logo.
5. Pôr o ID e o segredo em `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` (no `.env` ou nas variáveis do alojamento,
   **nunca no código**) e reiniciar o servidor.
6. Para qualquer pessoa poder entrar: **Público → Publicar aplicação** (passa de *Teste* para *Em produção*).
   Com os âmbitos `openid email profile` não é preciso a verificação da Google.

Se der erro, a mensagem verdadeira aparece na consola do servidor:
- `redirect_uri_mismatch`: o URI não é exatamente o registado (ver `GOOGLE_REDIRECT_URI` e `URL_SITE`)
- `invalid_client`: o ID ou o segredo estão mal copiados
- "O pedido expirou": o cookie da sessão perdeu-se (misturar `localhost` com `127.0.0.1`, ou https mal configurado)

## Configurar o Gmail (emails a sério)
1. Na conta Google que vai enviar os emails, ligar a **verificação em 2 passos**.
2. Em https://myaccount.google.com/apppasswords criar uma **palavra-passe de aplicação** chamada "TavDex".
3. No `.env`: `GMAIL_UTILIZADOR=o.teu.email@gmail.com`, `GMAIL_PASSWORD_APP=` (os 16 caracteres, sem espaços) e `EMAIL_MODE=smtp`.
4. Reiniciar o servidor e testar com "Esqueci-me da palavra-passe".

Alguns alojamentos gratuitos bloqueiam as portas SMTP. Nesse caso, usar um serviço de email por API (ex.: Brevo ou Resend):
basta mudar a função `enviarEmail` em `routes/email.js`.

## Quando o site for publicado
- `URL_SITE=https://<domínio>` ativa o redirecionamento http → https, o HSTS e os cookies `secure`.
- O servidor já tem `app.set('trust proxy', 1)`: atrás do proxy do Render, Railway ou Heroku, os cookies `secure` funcionam e o IP é o verdadeiro.
- As sessões e as fotos de perfil ficam no MySQL, por isso funcionam mesmo em alojamentos sem disco permanente.
- Acrescentar o domínio e o URI de redirecionamento na Google Cloud Console (ver acima).

## Estrutura
O mapa completo (onde está cada coisa e em que ordem as páginas carregam os ficheiros) está no **[GUIA-DO-CODIGO.md](GUIA-DO-CODIGO.md)**.
```
server.js            servidor Express: helmet, sessões, CSRF, rotas, páginas privadas, erros, limpeza, verificação da BD
db.js                ligação ao MySQL: linhas(), linha(), executar()
.env                 segredos (não vai para o GitHub)
routes/              API – ver routes/README.md
  auth.js · google.js · confirmacao-email.js   contas: registo, login, Google, confirmação do email, recuperação
  utilizadores/      perfil público e seguir · Definições · foto, banner e sessões
  titulos/           catálogo (parte pública) · gestão do catálogo (admin)
  projetos.js · comunidade.js · avaliacoes.js · admin.js
  middleware.js · ajudas.js · palavras-passe.js · fotos.js · consultas.js · email.js   (apoio)
public/              páginas .html (uma por ecrã)
  js/api.js          api() (fetch + token CSRF) e esc() (contra XSS)
  js/regras-*.js     regras partilhadas com o servidor: palavras-passe, email, nome e @nome
  js/comum/          partes comuns a todas as páginas (sessão, desenho, janelas, campos, formulários, topo e rodapé, arranque)
  js/banner/         banner do perfil: um ficheiro por cenário + o motor
  js/paginas/        o JavaScript de cada página (as Definições e o painel de admin têm uma pasta com as partes)
  css/style.css      tema escuro vermelho/magenta (e modo claro)
dados/               palavras-passe-comuns.txt e dominios-descartaveis.txt (ver "Segurança das contas")
database/            tavdex_site.sql (instalação), modelo ER e alteracoes-antigas/
tests/               testes automáticos (npm test)
specs/               documentação funcional
```

## Como funciona (para explicar ao júri)
1. O browser abre uma página `.html` (só tem a "moldura").
2. O JavaScript da página pede os dados à API com `api('/api/...')`, que devolve JSON.
3. O servidor valida tudo, consulta o MySQL com prepared statements (`?`) e responde.
4. A página desenha o HTML com os dados, escapando sempre o texto com `esc()`.

**Modo visitante:** sem conta vê-se tudo (início, catálogo, filmes, projetos, comunidade, perfis). Os botões que precisam de conta têm `data-requer-login="(ação)"`: para um visitante, abrem a janela "Inicia sessão para continuar" em vez de fazer a ação. A proteção verdadeira é a do servidor: a API responde `401 {"erro":"login_necessario"}` e as páginas privadas redirecionam para o login e voltam depois.

**Segurança:** helmet (CSP, e HSTS em https) · palavras-passe com bcrypt · sessões guardadas no MySQL, com a lista de dispositivos em `sessoes` (dá para terminar sessões noutros dispositivos) · token CSRF em todos os POST/PUT/DELETE · bloqueio após 5 logins falhados na conta (ou 20 no mesmo IP) em 15 minutos · registo de eventos em `atividade_conta` (guardado 180 dias) · tokens de recuperação guardados só em SHA-256, válidos 30 minutos e de uso único · Google com `state` e PKCE · fotos validadas pelo conteúdo e desenhadas de novo · `voltar` só para páginas do próprio site · anti-spam (limites por tempo, campo-armadilha, máximo de 2 links) · permissões de dono/admin verificadas no servidor.

## Segurança das contas
Melhorias à Fase 2 do anteprojeto (registo, login, logout, recuperação, perfil e edição do perfil).

**Regras partilhadas.** As regras das palavras-passe, dos emails e do nome/@nome estão em `public/js/regras-palavra-passe.js`, `regras-email.js` e `regras-nomes.js`: o browser usa-as para mostrar os erros enquanto se escreve e o servidor usa os mesmos ficheiros para validar a sério.

**Palavras-passe.** Pelo menos 10 caracteres (e no máximo 72 bytes, o limite do bcrypt), com maiúscula, minúscula, número e símbolo; sem `aaaa` nem sequências como `1234` ou `qwer`; sem o @nome, o nome ou o email. As regras estão num só ficheiro, `public/js/regras-palavra-passe.js`, que o browser usa para a lista de requisitos ao vivo e o servidor usa para validar a sério. O servidor recusa também as 10 000 palavras-passe mais comuns (comparando a versão "limpa": `Password1!` conta como `password`) e as que aparecem em fugas de dados, com a API *Pwned Passwords* do Have I Been Pwned por **k-anonimidade**: só os 5 primeiros caracteres do SHA-1 saem do servidor. Se a API falhar, não bloqueia. As contas antigas com palavras-passe fracas continuam a entrar, mas recebem um aviso para a mudar.

**Emails.** Formato verificado (até 120 caracteres), domínios de emails temporários recusados, e o domínio tem de ter registos MX (ou A/AAAA) no DNS, com 3 segundos de limite e cache de 1 hora (se o DNS falhar, aceita). No browser aparece a sugestão "Querias dizer duarte@gmail.com?".

**Confirmação do email.** A conta criada com email e palavra-passe só entra depois de abrir o link enviado por email: token de 32 bytes, guardado só em SHA-256, válido 24 horas e uma vez. O link abre uma página com um botão, porque a confirmação é por POST (os antivírus de email abrem os links sozinhos). Reenviar: 60 segundos de espera e no máximo 5 por hora. As contas por confirmar há mais de 7 dias são apagadas. Mudar o email também precisa de confirmação: o novo fica "pendente" e o antigo recebe um aviso.

**Recuperação.** Com o email ou o @nome; resposta sempre igual; 3 pedidos por hora por conta e 10 por IP; o email diz o @nome, a data e o dispositivo do pedido; o token sai da barra de endereço e a página não envia o endereço a outros sites (`Referrer-Policy: no-referrer`); depois de mudar a palavra-passe chega um email "A tua palavra-passe foi alterada".

**Sessões e logout.** "Manter sessão iniciada": desligado, o cookie acaba ao fechar o browser e a sessão expira com 12 horas sem atividade; ligado, dura 30 dias (renovados com o uso, no máximo 90). O logout destrói a sessão e apaga o cookie; as respostas da API e as páginas privadas usam `Cache-Control: no-store`, por isso o botão Retroceder não mostra dados; os outros separadores ficam como visitante (`BroadcastChannel`). Há "Terminar sessão em todos os dispositivos". `GET /sair` nunca termina a sessão.

**Perfil e edição.** @nomes reservados (`admin`, `tavdex`, `suporte`, …); o @nome só muda uma vez a cada 30 dias e o antigo fica reservado e redireciona; o nome não aceita caracteres invisíveis; privacidade das listas e dos seguidores respeitada **pela API**; recorte da foto no browser (o servidor continua a validar e a reduzir com o sharp).

**Fontes das listas** (pasta `dados/`): `palavras-passe-comuns.txt` — SecLists, `Passwords/Common-Credentials/10k-most-common.txt` (github.com/danielmiessler/SecLists); `dominios-descartaveis.txt` — github.com/disposable-email-domains/disposable-email-domains (`disposable_email_blocklist.conf`).

## Fases
| Fase | O quê | Páginas | API |
|---|---|---|---|
| 1 ✔ | Base de dados e servidor | – | `/api/estado` |
| 2 ✔ | Registo, login (+ Google), recuperação, perfil, seguidores, definições | index, registar, login, recuperar, repor, perfil, definicoes | `routes/auth.js`, `routes/utilizadores/` |
| 3 ✔ | Projetos, equipa, vagas, candidaturas, acompanhar, comentários, avaliações | projetos, projeto, projeto-novo, projeto-editar, candidaturas | `routes/projetos.js` |
| 4 ✔ | Feed, gostos, chat, notificações (silenciar), denúncias, admin | comunidade, chat, notificacoes, admin | `routes/comunidade.js`, `routes/admin.js` |
| 5 ✔ | Catálogo, filtros, pesquisa, página do título, elenco, temporadas/episódios, CRUD | catalogo, titulo, pesquisa, admin (Filmes e séries) | `routes/titulos/` |
| 6 ✔ | Estrelas, reviews com spoilers, listas, recomendações | titulo, listas, perfil, index | `routes/avaliacoes.js` |
| Passos 4–10 ✔ | Modo visitante (janela de login), registo e login com o Google no topo, Google com PKCE, sessões por dispositivo, recuperação com email HTML, perfil com foto, definições com erros por campo | index, login, registar, recuperar, repor, perfil, definicoes, privacidade, termos | `routes/auth.js`, `routes/google.js`, `routes/utilizadores/`, `routes/fotos.js` |

## Testar no browser (roteiro para a apresentação)
1. **Sem conta:** página inicial → catálogo (filtrar por género, ordenar por nota) → abrir *Breaking Bad* (elenco, temporadas e episódios) → pesquisar "nolan".
2. **Visitante:** carregar em "+ Seguir" num perfil ou em "Favorito" num filme → abre a janela "Inicia sessão para continuar" → entrar → volta à mesma página.
3. **Registo:** criar conta (campos errados a vermelho enquanto se escreve, "Querias dizer …?" com `duarte@gmial.com`, @nome disponível) → vai para o login com o aviso "Conta criada!" → abrir o link do email (no Gmail, ou na pasta `emails/` se o Gmail não estiver configurado) → "Confirmar email" → entra.
   **Definições:** recortar a foto, cor, nome, géneros favoritos, privacidade e pré-visualização ao vivo.
   **Banner do perfil:** escolher um dos 5 cenários (Colina das estrelas, Sessão de pipocas, Claquete antiga, Rolo de película, Cinema à noite) e ver o TAVDEX mudar com a cor do avatar.
   Mudar um campo e carregar num link do topo → aparece "Tens alterações por guardar".
4. **Login falhado 5 vezes** com a mesma conta → aparece o bloqueio de 15 minutos.
5. **Recuperar palavra-passe:** o link chega ao Gmail (ou fica na pasta `emails/`, se o Gmail não estiver configurado).
6. **Como lara@mail.pt:** avaliar um filme com review e spoiler, pôr em favoritos, ver as recomendações em "As minhas listas".
7. **Projetos:** criar um projeto com uma vaga → entrar com outra conta e candidatar-se → voltar ao dono e aprovar (o candidato passa para a equipa).
8. **Comunidade e chat:** publicar, gostar, comentar e responder; mandar uma mensagem privada (aparece sozinha na outra conta).
9. **Notificações:** ver o sino com o número, silenciar "Gostos".
10. **Admin (duarte@tavdex.pt):** estatísticas, bloquear um utilizador, resolver uma denúncia, criar um filme com elenco e uma série com temporadas.
11. **Definições → Conta e segurança:** sessões ativas noutro browser → "Terminar" → esse browser vê "A tua sessão foi terminada".
12. **Google** (com o `.env` configurado): entrar com uma conta nova, entrar com o email de uma conta que já existe, cancelar na página da Google, e ligar/desligar nas Definições.
