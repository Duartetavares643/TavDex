# Manual completo do TavDex – como funciona e onde está cada coisa

Este manual serve para **estudar o código** do TavDex e saber **onde está cada funcionalidade**. Lê-o pela ordem: primeiro a ideia geral (secções 1 a 4) e depois cada parte do site (secções 5 a 11). A fase 3 (projetos) tem um manual próprio e mais detalhado: `MANUAL-FASE-3.md`.

> **Atalhos do VS Code que vais usar muito**
> - `Ctrl+P` → abrir um ficheiro pelo nome
> - `Ctrl+G` → ir para uma linha
> - `Ctrl+Shift+F` → procurar um texto em todos os ficheiros (ex.: `case 'seguir'`)
> - `Ctrl+Shift+O` → lista das funções do ficheiro aberto (ótimo no `lib.php`)
> - `F12` em cima de uma função → salta para onde ela foi criada
> - `Ctrl+Shift+V` → ver um `.md` formatado

---

## 1. O que é o TavDex

É um site para **descobrir, organizar e avaliar filmes e séries**. Tem também uma **comunidade** (feed, comentários, chat) e **projetos cinematográficos** criados pelos utilizadores.

**Tecnologias:** HTML, CSS, JavaScript, **PHP 8** e **MySQL 8**, sem frameworks. Corre no **XAMPP** (Apache + MySQL).

---

## 2. Como o site funciona por dentro (o essencial)

### 2.1 O caminho de um pedido

```
Browser  ──pede──►  catalogo.php  ──require──►  lib.php  ──require──►  config.php
                         │                         │
                         │                         └─ liga à base de dados (PDO), inicia a sessão
                         ├─ lê os filtros ($_GET), faz as consultas SQL
                         ├─ require 'cabecalho.php'   (topo: menu, pesquisa, avisos)
                         ├─ escreve o HTML da página
                         └─ require 'rodape.php'      (fundo + main.js)
```

### 2.2 Todas as páginas seguem o mesmo modelo

Abre qualquer página (ex.: `titulo.php`) e vais ver sempre esta ordem:

```php
<?php
// Passo X – descrição          ← comentário com o número do passo do anteprojeto
require 'lib.php';              ← 1. carrega as funções, a base de dados e a sessão
$u = exigir_login();            ← 2. (só se a página precisar de sessão)

if ($_SERVER['REQUEST_METHOD'] === 'POST') {   ← 3. TRATAR FORMULÁRIOS
    verificar_csrf();                          ←    proteção CSRF
    switch ($_POST['op'] ?? '') {              ←    cada formulário diz o que quer fazer em "op"
        case 'avaliar': ... break;
        case 'apagar':  ... break;
    }
    ir('pagina.php');                          ←    redireciona (padrão POST → redirect → GET)
}

$dados = linhas('SELECT ...');  ← 4. IR BUSCAR OS DADOS para mostrar
$titulo = 'Nome da página';     ←    título do separador do browser
require 'cabecalho.php';        ← 5. HTML do topo
?>
<div class="content"> ... </div> ← 6. HTML da página (com <?= e($valor) ?>)
<?php require 'rodape.php'; ?>   ← 7. HTML do fundo
```

**Porque redireciona depois de um POST?** Se o utilizador carregar em F5 depois de enviar um formulário, o browser não volta a enviá-lo (não cria duas avaliações iguais). Chama-se padrão **PRG (Post/Redirect/Get)**.

**O campo `op`:** uma página pode ter vários formulários (avaliar, apagar, …). Cada um tem `<input type="hidden" name="op" value="...">` e o `switch` decide o que fazer. Para encontrar uma ação, procura `case 'nome_da_op'` com `Ctrl+Shift+F`.

### 2.3 Mensagens verdes e vermelhas

`aviso('Texto', 'ok')` ou `aviso('Texto', 'erro')` guarda a mensagem na sessão. Na página seguinte, o `cabecalho.php` mostra-a com `mostrar_avisos()` e apaga-a.

### 2.4 Quem está ligado

- `eu()` devolve o utilizador com sessão iniciada (ou `null`). Lê o `$_SESSION['uid']` e vai buscar a linha à tabela `utilizadores`. Se a conta estiver bloqueada, a sessão é anulada.
- `e_admin()` → `true` se `papel = 'admin'`.
- `exigir_login()` → manda para o login quem não tem sessão.
- `exigir_admin()` → mostra "Acesso restrito" a quem não é admin.

---

## 3. Mapa dos ficheiros

Está tudo numa só pasta.

### Ficheiros partilhados (não são páginas)

| Ficheiro | Para que serve |
|---|---|
| `config.php` | Configuração: dados do MySQL, `URL_SITE`, `MODO_DEV`, chave do TMDB |
| `lib.php` | **Todas as funções** partilhadas (base de dados, sessão, segurança, cartões, TMDB, recomendações, anti-spam). É o ficheiro mais importante para estudar |
| `contas.php` | Funções das **contas**: sessão e "Manter sessão iniciada", regras da palavra-passe e do email, confirmação por link, imagens (foto e banner) e pedidos à internet (Google) |
| `cabecalho.php` | `<head>`, barra de navegação, pesquisa, botão do tema, sino, menu do utilizador, avisos |
| `rodape.php` | Rodapé e `<script src="main.js">` |
| `projeto_form.php` | Formulário e validação dos projetos (usado ao criar e editar) |
| `style.css` | Todo o aspeto do site (modo escuro e claro, responsivo) |
| `main.js` | Todo o JavaScript (menus, separadores, destaque, confirmações, chat, tema) |
| `banner-perfil.js` | Desenha os 5 cenários do banner do perfil em SVG animado |
| `regras-palavra-passe.js`, `regras-email.js` | Regras da palavra-passe e do email mostradas ao vivo nos formulários (as mesmas do servidor) |
| `dados/` | Listas de segurança: palavras-passe mais comuns e domínios de email descartáveis |
| `.htaccess` | Configuração do Apache: página 404, bloqueia o acesso a `.sql`, `.md` e a `config.php`/`lib.php`, esconde a lista de ficheiros |

### Páginas

| Área | Página | Passo |
|---|---|---|
| Início | `index.php` | 4 |
| Contas | `registar.php`, `confirmar_email.php`, `login.php`, `google.php`, `logout.php`, `recuperar.php`, `repor.php` | 5–8 |
| Perfil | `perfil.php`, `editar_perfil.php` | 9–10 |
| Projetos | `projetos.php`, `projeto.php`, `projeto_novo.php`, `projeto_editar.php`, `candidaturas.php` | 11–19 |
| Comunidade | `comunidade.php`, `chat.php`, `chat_api.php` | 20 |
| Notificações | `notificacoes.php` | 21–22 |
| Administração | `admin.php`, `admin_titulo.php` | 23, 29–33 |
| Catálogo | `catalogo.php`, `titulo.php`, `pesquisa.php` | 24–28, 34–37 |
| Listas | `listas.php` + `acoes.php` | 38–44 |
| Ações pequenas | `acoes.php` (seguir, listas, denúncias) | 9, 39–44 |
| Outras | `404.php` (erro), `teste.php` (diagnóstico), `atualizar.php` (atualizar a base de dados), `imagem.php` (fotos e banners), `termos.php`, `privacidade.php` | – |

### Base de dados e documentação

| Ficheiro | Para que serve |
|---|---|
| `base_dados.sql` | Cria a base de dados e as 25 tabelas (passo 2) |
| `dados.sql` | Dados de exemplo: 80 utilizadores, 57 títulos, avaliações, projetos… (passo 3) |
| `instalar_online.sql` | Os dois scripts juntos, para alojamentos online |
| `atualizar_bd.sql` | Atualiza uma base de dados de uma versão anterior |
| `modelo_er.png` / `.svg` | Modelo entidade-relação (passo 1) |
| `LEIA-ME.md` | Instalação, contas de teste e tabela dos 44 passos |
| `specs/` | Especificação de cada parte do site (9 documentos) |

---

## 4. A base de dados (`base_dados.sql`)

25 tabelas, organizadas por área:

| Área | Tabela | O que guarda |
|---|---|---|
| **Contas** | `utilizadores` | @nome, `nome_exibicao`, email, `email_verificado`, `email_pendente`, `password_hash` (vazio nas contas só do Google), `google_id`, bio, localização, cor do avatar, `foto` + `foto_versao`, `tema_banner`, `banner` + `banner_versao`, `mostrar_listas`, `mostrar_seguidores`, `papel`, `bloqueado`, `notif_email`, `ultimo_login` |
| | `verificacao_email` | links de confirmação do email (só o hash do token, validade, usado) |
| | `sessoes_lembradas` | "Manter sessão iniciada": seletor, hash do validador, dispositivo, validade |
| | `utilizador_generos` | géneros favoritos de cada pessoa (até 3) |
| | `recuperacoes` | pedidos de recuperação da palavra-passe (token em hash SHA-256, validade) |
| | `seguidores` | quem segue quem (`seguidor_id`, `seguido_id`) |
| **Catálogo** | `titulos` | filmes e séries: nome, `tipo` (filme/serie), ano, duração, idade, sinopse, realizador, cartaz, fundo, `tmdb_id`, `em_curso` |
| | `generos` | Drama, Comédia, … |
| | `titulo_generos` | ligação N:N título ↔ género |
| | `plataformas` | Netflix, Disney+, … (nome, cor, url) |
| | `titulo_plataformas` | ligação N:N título ↔ plataforma ("Onde ver") |
| | `temporadas` | temporadas das séries (número, ano, episódios) |
| **Avaliações e listas** | `avaliacoes` | nota 1–5, review, `spoiler`, `editado_em`. **Uma por utilizador e título** (`UNIQUE`) |
| | `listas` | `tipo` = `favorito`, `ver` ou `visto` |
| **Projetos** | `projetos`, `projeto_equipa`, `projeto_vagas`, `candidaturas`, `projeto_avaliacoes` | ver `MANUAL-FASE-3.md` |
| **Comunidade** | `publicacoes` | publicações do feed (podem estar ligadas a um projeto) |
| | `comentarios` | comentários e respostas (`pai_id` = comentário a que responde) |
| | `mensagens` | chat: `para_id = NULL` é a sala geral; com valor é mensagem privada |
| | `notificacoes` | `tipo`, texto, link, `lida` |
| | `notif_silenciadas` | tipos de notificação que cada pessoa desligou |
| | `denuncias` | denúncias de publicações, comentários, reviews e mensagens |

**Conceitos para explicar na defesa:**
- **Chave primária composta** (ex.: `seguidores`, `listas`, `titulo_generos`): impede linhas repetidas.
- **Relações N:N** com tabela intermédia (`titulo_generos`, `titulo_plataformas`).
- **`FOREIGN KEY ... ON DELETE CASCADE`**: ao apagar um utilizador, título ou projeto, as linhas ligadas desaparecem sozinhas.
- **`ON DELETE SET NULL`** em `projeto_equipa.utilizador_id`: se o utilizador apagar a conta, o projeto mantém-se.
- **`ENUM`** (valores fixos), **`CHECK (nota BETWEEN 1 AND 5)`** e **`UNIQUE`**.
- **Índices** no fim do ficheiro (`CREATE INDEX`) para tornar as pesquisas mais rápidas.
- **Autorrelação**: `comentarios.pai_id` aponta para a própria tabela `comentarios` (respostas).

---

## 5. Fase 2 – Contas e utilizadores

As funções das contas estão todas no **`contas.php`** (incluído pelo `lib.php`), organizado em 5 partes: sessão, palavras-passe, emails, imagens e pedidos à internet. Ver o índice na secção 10.

### Registo – `registar.php` (passo 5)
- Campos: **Nome** (opcional, ex.: "Duarte Tavares"), **@nome** (3–20 letras, números, `_` ou `.`), email, palavra-passe (2 vezes) e a caixa **"Li e aceito os termos"** (obrigatória).
- **Email** verificado por `erro_email()`: formato, **emails descartáveis** recusados (lista em `dados/dominios-descartaveis.txt`) e, se houver internet, confirma que o domínio recebe emails (DNS).
- **Palavra-passe** verificada por `erro_palavra_passe()`: 10+ caracteres, maiúscula, minúscula, número, símbolo, sem `1234`/`abcd`/`aaaa`, sem o nome ou o email, fora das **10 000 mais comuns** (`dados/palavras-passe-comuns.txt`) e das **fugas de dados** (Have I Been Pwned).
- No browser, o `regras-palavra-passe.js` mostra a lista de requisitos a ficar verde (✓) e a **barra de força** enquanto se escreve; o `regras-email.js` sugere "Querias dizer …@gmail.com?".
- Anti-spam: campo-armadilha e no máximo 20 contas novas em 10 minutos no site todo.
- A conta é criada com **`email_verificado = 0`** e **não entra logo**: vai para `confirmar_email.php`.
- Também há o botão **"Criar conta com o Google"** (`google.php`).

### Confirmar o email – `confirmar_email.php`
1. `enviar_confirmacao()` (`contas.php`) cria um token aleatório de 32 bytes, guarda **só o hash SHA-256** na tabela `verificacao_email` (válido 24 horas) e envia o link por email. Com `MODO_DEV`, o link aparece no ecrã (caixa tracejada por baixo do topo).
2. A página mostra "Quase pronto! Enviámos um link para d•••••@gmail.com" (`esconder_email()`) e o botão **Reenviar** (no máximo 5 por hora, 60 segundos entre envios: `limite_envios()`).
3. O link abre uma página com o botão **"Confirmar email"**: a confirmação é feita por **POST**, para os antivírus que abrem os links sozinhos não gastarem o token.
4. Ao confirmar: `email_verificado = 1`, o link deixa de servir e a pessoa **entra logo** (`iniciar_sessao()`).
- A mesma página confirma a **mudança de email** feita nas Definições (o email novo fica em `email_pendente` até ser confirmado).
- Contas que nunca confirmaram o email em 7 dias são apagadas (`limpar_contas_por_confirmar()`), para libertar o email e o @nome.

### Login – `login.php` (passo 6)
- Aceita **email ou nome de utilizador**; confirma a palavra-passe com **`password_verify()`**.
- Contas bloqueadas não entram; contas com o **email por confirmar** vão para `confirmar_email.php`.
- Contas criadas **só com o Google** não têm palavra-passe: a mensagem diz para usar o botão do Google.
- **Proteção contra força bruta**: 5 tentativas erradas → espera de 5 minutos.
- **"Manter sessão iniciada"** (ver abaixo) e botão **"Continuar com Google"**.
- `iniciar_sessao()` (`contas.php`) faz **`session_regenerate_id(true)`** (evita roubo de sessão), guarda o `uid` e o último login.

### "Manter sessão iniciada" – `contas.php`
- `lembrar_sessao()` cria um cookie `tavdex_lembrar` com duas partes, **`seletor:validador`**, válido 30 dias. Na tabela `sessoes_lembradas` fica o seletor e **só o hash** do validador.
- `entrar_com_cookie()` (chamada por `eu()` quando não há sessão) confirma o token e entra. O token é **trocado a cada uso**; se alguém usar um cookie antigo (copiado), todas as sessões lembradas dessa conta terminam.
- Termina no logout (só neste browser), ao repor a palavra-passe (todas) e nas Definições → Sessões.

### Login com o Google – `google.php`
OAuth 2.0 *authorization code* com **PKCE**, feito só com pedidos HTTP (cURL):
1. Gera um `state` aleatório (contra pedidos forjados) e um `code_verifier`; manda a pessoa para a página do Google com o `code_challenge` (SHA-256 do verifier).
2. O Google volta ao `google.php` com um `code`; o servidor confirma o `state` e troca o código pelo token enviando o **segredo** e o `code_verifier`.
3. Pede os dados da conta (id, email, nome, foto) e trata 3 casos: **conta já ligada** → entra; **já existe uma conta com o mesmo email** → liga as duas; **não existe** → cria a conta (com o primeiro @nome livre e a foto do Google).
- Nas Definições pode-se **ligar** e **desligar** o Google (só se a conta tiver palavra-passe).
- Configuração em `config.php` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) – ver o LEIA-ME.

### Logout – `logout.php` (passo 7)
- Só termina a sessão por **POST com token CSRF** (o botão está no menu do `cabecalho.php`, linha 50). Assim, um link de outro site não te pode tirar a sessão.
- `terminar_sessao()` apaga o token "Manter sessão iniciada" deste browser, `$_SESSION`, o cookie e cria uma sessão nova.

### Recuperar palavra-passe – `recuperar.php` + `repor.php` (passo 8)
1. `recuperar.php`: gera um token aleatório (`random_bytes(32)`), guarda **só o hash SHA-256** em `recuperacoes`, válido **1 hora**, e envia o link por email (com `MODO_DEV` aparece no ecrã). A mensagem é sempre igual, exista ou não a conta.
2. `repor.php?token=...`: confirma o token, aplica as **regras novas** da palavra-passe, marca o email como confirmado (quem abriu o link tem acesso a ele) e termina as sessões "Manter sessão iniciada".

### Perfil – `perfil.php?u=nome` (passo 9)
- **Cabeçalho com banner** feito por `cabecalho_perfil()` (`lib.php`, linha 339): banner, **foto** (ou a inicial na cor do avatar), **nome de exibição**, @nome, "Membro desde", localização, biografia, **géneros favoritos** e os 5 números com ícones.
- **O banner** tem 5 cenários de cinema desenhados em **SVG animado** pelo `banner-perfil.js` (Colina das estrelas, Sessão de pipocas, Claquete antiga, Rolo de película, Cinema à noite), com o letreiro **TAVDEX na cor do avatar** (variável CSS `--h`). Se o dono carregar uma **imagem própria**, ela tapa o cenário.
- **Selos** "Admin" e **"Segue-te"** (a pessoa segue quem está a ver) e botões **Seguir / Mensagem / Partilhar** (copia o endereço).
- Separadores: Favoritos, Para ver, Vistos, Avaliações, Projetos, Recomendados (só o dono), **Seguidores** e **A seguir**.
- **Privacidade**: se o dono escondeu as listas ou os seguidores, os outros veem "@nome escolheu não mostrar…"; o dono vê "🔒 Só tu vês isto".
- **Compatibilidade de gostos** e **Géneros preferidos** à direita; cartão de **boas-vindas** quando o perfil está vazio.
- As imagens vêm do **`imagem.php?u=ID&t=foto|banner&v=VERSAO`**, que as lê da base de dados. O `v` muda sempre que a imagem muda, por isso o browser pode guardá-la em cache sem mostrar uma antiga.

### Definições – `editar_perfil.php` (passo 10)
Dois separadores (cada formulário envia um `op` e o `switch` decide):

**Perfil** (`op=perfil`), com a **pré-visualização ao vivo** à direita ("Assim é que os outros veem o teu perfil"):
- Foto, cor do avatar, **cenário do banner** (5 miniaturas animadas) ou **imagem própria** do banner, nome, @nome, localização, biografia, **géneros favoritos (até 3)**, privacidade e notificações por email.
- As imagens são **recortadas e reduzidas no browser** (`recortarImagem()` em `main.js`: foto 512×512, banner 1500×500) e o servidor volta a gravá-las com o **GD** (`ficheiro_imagem()` + `recortar_imagem()` em `contas.php`).
- **Aviso "Tens alterações por guardar"** (`main.js`): ao sair por um link, ao trocar de separador ou ao fechar o separador do browser.

**Conta e segurança**:
- **Proteção da conta**: email confirmado, palavra-passe, Google, último login.
- **Email** (`op=email`): o novo fica em `email_pendente` e só vale depois de confirmado; `op=cancelar_email` cancela.
- **Palavra-passe** (`op=password`): pede a atual (as contas só do Google podem **definir** uma), regras ao vivo, e pode terminar a sessão nos outros dispositivos.
- **Contas ligadas**: ligar/desligar o Google. **Sessões**: terminar nos outros dispositivos.
- **Apagar conta** (`op=apagar`): pede a palavra-passe (ou, sem ela, escrever o @nome). O `ON DELETE CASCADE` apaga tudo o que era do utilizador.

### Termos e privacidade – `termos.php`, `privacidade.php`
Ligados no rodapé e no registo (e pedidos pela Google para o login).

### Atualizar a base de dados – `atualizar.php`
Para quem já tinha a base de dados: acrescenta as colunas e tabelas novas **sem apagar dados**, saltando os passos que já estão feitos. Só abre com `MODO_DEV` ou para administradores. As mesmas instruções estão em `atualizar_contas.sql`.

---

## 6. Fase 3 – Projetos da comunidade

Explicada em pormenor em **`MANUAL-FASE-3.md`**. Resumo: `projetos.php` (lista), `projeto_novo.php` (criar), `projeto_editar.php` (editar dados, equipa, vagas e apagar), `projeto.php` (página, candidatar, retirar, avaliar), `candidaturas.php` (ver, aceitar e rejeitar).

---

## 7. Fase 4 – Comunidade e administração

### Feed – `comunidade.php` (passo 20)
- **Publicar** (`case 'publicar'`, linha 11): texto + ligação opcional a um projeto teu. Anti-spam: armadilha, **3 publicações em 5 min**, no máximo **2 links**.
- **Comentar e responder** (`case 'comentar'`, linha 28): `pai_id` vazio = comentário; com valor = resposta a outro comentário. Notifica o autor. Anti-spam: 10 comentários em 5 min.
- **Apagar** (`apagar_pub`, `apagar_com`): o autor apaga o seu; o admin apaga tudo.
- **Feed "Todos" ou "A seguir"** (só de quem segues), com **paginação** de 10 (`paginado()`, linha 72).
- Barra lateral: atividade recente (avaliações novas) e pessoas em destaque (mais seguidores).

### Chat – `chat.php` + `chat_api.php` + `main.js`
É a única parte do site que usa **AJAX** (JavaScript que fala com o servidor sem recarregar a página).

- `chat.php` desenha a página: sala **Geral** (`?com=0`) e conversas privadas (`?com=ID`), com a lista das conversas à esquerda.
- `chat_api.php` só devolve **JSON**:
  - `GET chat_api.php?com=ID` → últimas 100 mensagens da conversa;
  - `POST op=enviar | editar | apagar` → altera e devolve `{"ok": true}` ou `{"erro": "..."}`.
- `main.js` (a partir da linha 78) pergunta ao `chat_api.php` **a cada 4 segundos** se há mensagens novas e desenha-as. Usa **`textContent`** em vez de `innerHTML` para impedir que alguém injete HTML numa mensagem.
- Anti-spam (`chat_api.php`, linhas 28–32): 8 mensagens em 20 s, não repetir a mesma mensagem em 1 min, máx. 2 links.
- Mensagem privada → notificação para a outra pessoa (só uma enquanto não for lida).

### Notificações – `notificacoes.php` (passos 21 e 22)
- São criadas pela função **`notificar()`** em `lib.php` (linha 606), chamada em vários sítios: novo seguidor, comentário, candidatura, mensagem, projeto, sistema.
  - Não te notifica a ti próprio, respeita os tipos silenciados e, se `notif_email = 1` e `MODO_DEV = false`, envia também por email.
- A página permite: abrir (marca como lida e segue o link), marcar todas como lidas, limpar as lidas, apagar uma, filtro "por ler", paginação.
- **Silenciar** (passo 22, `case 'preferencias'` linha 33 e `silenciar_tudo` linha 42): grava os tipos desligados em `notif_silenciadas`.
- O **número no sino** é calculado no `cabecalho.php` (linha 6).

### Denúncias
- Qualquer utilizador denuncia uma publicação, comentário, review ou mensagem → `acoes.php`, `case 'denunciar'` (linha 46). Máx. 10 por hora.
- O admin trata-as no separador **Denúncias** de `admin.php` (`case 'denuncia'`, linha 58): **ignorar**, **apagar o conteúdo** (o autor é notificado) ou **bloquear o autor**.

### Administração – `admin.php` (passo 23)
Só para admins (`exigir_admin()`, linha 7). Separadores (`?s=...`):

| Separador | Linha | O que tem |
|---|---|---|
| `resumo` | 117 | Números do site e gráfico de registos dos últimos 6 meses |
| `utilizadores` | 143 | Pesquisar, **bloquear/desbloquear**, tornar admin, apagar |
| `titulos` | 164 | Lista dos filmes e séries (passo 31), editar, apagar (passo 33), "Procurar imagens no TMDB" para todos |
| `series` | 180 | Séries e temporadas (passo 29) |
| `projetos` | 192 | Todos os projetos, editar, remover |
| `denuncias` | 204 | Denúncias pendentes |

As ações estão no `switch` do início (linhas 15–75): `bloquear`, `papel`, `apagar_utilizador`, `apagar_titulo`, `tmdb_todos`, `apagar_projeto`, `denuncia`.

---

## 8. Fase 5 – Catálogo de filmes e séries

### Página inicial – `index.php` (passo 4)
Organizada como uma plataforma de streaming:
- **Destaque** no topo: os 5 títulos com melhor média (mín. 3 avaliações), que mudam sozinhos a cada 8 s (`main.js`, linha 40).
- **Filas**: A minha lista, **Recomendado para ti** (`recomendacoes()`), Top 10, Populares, Novidades, 3 géneros e projetos recentes.

### Catálogo – `catalogo.php` (passos 24, 26, 27, 28)
- Filtros lidos do endereço (linhas 5–13): `tipo`, `q` (pesquisa), `genero`, `ano`, `nota`, `plat` (plataforma), `ordem`, `p` (página).
- O `WHERE` é construído aos bocados (linhas 19–30), **sempre com `?`** (nunca se cola texto do utilizador no SQL).
- Ordenação com `match` (linha 32): nome, recentes, antigos, melhor nota, mais avaliados.
- **15 por página**, com `LIMIT` e `OFFSET` (linha 43) e os botões feitos por `paginacao()`.
- Usa a consulta base **`SQL_TITULOS`** (`lib.php`, linha 556), que já traz a média, o número de avaliações e o primeiro género de cada título.

### Pesquisa geral – `pesquisa.php` (passo 26)
A barra do topo (`cabecalho.php`, linha 31) procura ao mesmo tempo **filmes/séries, projetos e pessoas**.

### Página de um título – `titulo.php` (passo 25)
- Cabeçalho com fundo, cartaz, ano, duração/temporadas, idade, géneros, realizador, sinopse e **Onde ver** (plataformas).
- Botões **Favorito / Para ver / Visto** (formulários para `acoes.php`).
- Gráfico de barras com quantas avaliações há de cada nota (linha 86).
- **Títulos parecidos**: os que partilham mais géneros (linha 90).
- Séries: lista das temporadas.

### Gerir filmes e séries – `admin_titulo.php` (passos 29, 30, 32)
- Sem `?id` → **inserir**; com `?id=5` → **alterar**.
- Campos que mudam com o tipo (filme tem duração; série tem "em curso" e temporadas), tratado no `main.js` (linha 62).
- **Upload de imagens** (cartaz e fundo): `validar_imagem()` confirma com `getimagesize()` que é mesmo JPG/PNG/WEBP até 3 MB; `guardar_imagem()` grava com um **nome gerado pelo site** (nunca o nome original).
- Géneros (pode criar um novo) e plataformas.
- `op=tmdb` → vai buscar o cartaz e o fundo reais ao **TMDB**. `op=temporada` / `rem_temporada` → gerir temporadas (passo 29).
- Remover títulos: `admin.php`, `case 'apagar_titulo'` (passo 33).

### TMDB (imagens reais, opcional)
Funções em `lib.php` (linhas 466–546): `tmdb_pedido()` faz o pedido à API, `tmdb_imagens()` procura o título, `tmdb_atualizar()` guarda as imagens e `tmdb_plataformas()` preenche o "Onde ver" com as plataformas reais em Portugal. Só funciona com `TMDB_CHAVE` preenchida em `config.php`; sem chave, `cartaz()` desenha um cartaz com a cor do título.

---

## 9. Fase 6 – Avaliações e listas

### Avaliar e reviews – `titulo.php`
| Passo | Onde | O que faz |
|---|---|---|
| 34 Classificar | `case 'avaliar'` (linha 31) | Nota 1–5 com as estrelas de `campo_estrelas()` (só HTML e CSS) |
| 35 Review | mesma op | Texto opcional + caixa "tem spoilers" (o texto aparece tapado até clicares). Máx. 2 links |
| 36 Editar | `titulo.php?id=…&editar=1` | Se já avaliaste, faz `UPDATE` e grava `editado_em` |
| 37 Apagar | `case 'apagar'` (linha 55) | O autor apaga a sua; o admin apaga qualquer uma |

Ao avaliar pela primeira vez, o título **sai de "Para ver" e entra em "Vistos"** (linhas 45–48).
As reviews podem ser ordenadas por **recentes** ou **melhores** (linha 78).

### Listas – `listas.php` + `acoes.php`
- `listas.php?l=favorito | ver | visto` mostra a lista (passos 38, 42, 43).
- Todos os botões de adicionar e remover enviam `op=lista` para **`acoes.php`** (linha 27), com `tipo` e `modo`. Se já existe → `DELETE`; se não → `INSERT` (passos 39–42, 44).
- Marcar como **visto** tira o título de "Para ver" (linha 40).
- Depois, `voltar()` regressa à página onde estavas.

### Recomendações – `recomendacoes()` em `lib.php` (linha 633)
Algoritmo simples, bom para explicar:
1. Dá **pontos aos géneros** de que gostas: cada avaliação soma `nota − 2,5` aos géneros desse título (5★ = +2,5; 1★ = −1,5); cada favorito soma +2.
2. Para cada título que **ainda não viste nem avaliaste**, soma os pontos dos seus géneros + `média × 0,8`.
3. Ordena por pontos e devolve os melhores.

---

## 10. `lib.php` – índice das funções

Abre o `lib.php` e carrega em `Ctrl+Shift+O` para veres esta lista no VS Code.

| Secção | Função | O que faz |
|---|---|---|
| **Base de dados** | `bd()` | Cria a ligação **PDO** ao MySQL (uma só vez) |
| | `sql($consulta, $param)` | Executa uma **consulta preparada** |
| | `linhas()` / `linha()` / `valor()` | Devolve todas as linhas / a primeira / um só valor |
| | `agora()` | Data e hora atuais |
| **Sessão** | `eu()`, `e_admin()`, `exigir_login()`, `exigir_admin()` | Ver secção 2.4 |
| **Segurança** | `e($texto)` | `htmlspecialchars` → evita **XSS** |
| | `token_csrf()`, `campo_csrf()`, `verificar_csrf()` | Proteção **CSRF** |
| **Navegação** | `ir($url)` | Redireciona e termina |
| | `aviso()`, `mostrar_avisos()` | Mensagens verde/vermelha |
| | `campo($nome)` | Lê um campo do POST sem espaços |
| | `voltar()` | Volta à página anterior (só do próprio site) |
| **Apresentação** | `tempo()` | "há 5 min", "há 2 dias" |
| | `avatar()`, `link_perfil()`, `estrelas()` | Avatar (foto ou inicial na cor), link para o perfil (mostra o nome de exibição), estrelas |
| | `nome_visivel()`, `extras_utilizador()` | Nome de exibição (ou @nome); lê uma só vez por página os nomes e as fotos de todos |
| | `url_foto()`, `url_banner()` | Endereço da foto e da imagem do banner (`imagem.php`) |
| | `cabecalho_perfil()`, `icone_perfil()` | Cartão do perfil com o banner, foto, nome e números |
| | `TEMAS_BANNER`, `tema_valido()`, `cor_valida()` | Os 5 cenários do banner e validação do cenário e da cor |
| | `cor_de($texto)` | Cor calculada a partir de um texto (cartazes sem imagem) |
| | `cartaz()`, `fundo()`, `url_imagem()` | Imagem do título ou cartaz desenhado |
| | `cartao_titulo()`, `cartao_fila()`, `cartao_projeto()`, `top10()` | HTML dos cartões |
| | `badge_estado()` | Etiqueta colorida de estado |
| | `generos_titulo()`, `plataformas_titulo()`, `etiqueta_plataforma()` | Géneros e "Onde ver" de um título |
| | `paginacao()` / `paginado()` | Botões de páginas / consulta já paginada |
| **Consultas base** | `SQL_TITULOS`, `SQL_PROJETOS` | Títulos com média; projetos com n.º de membros |
| **TMDB** | `tmdb_pedido()`, `tmdb_imagens()`, `tmdb_atualizar()`, `tmdb_plataformas()` | Imagens e plataformas reais |
| **Notificações** | `notificar()`, `enviar_email()` | Cria notificações (e email) |
| **Gostos** | `recomendacoes()`, `compatibilidade()`, `campo_estrelas()` | Ver secções 5 e 9 |
| **Anti-spam** | `demasiado()` | Limite de ações por tempo (só aceita tabelas de uma lista fixa) |
| | `n_links()` | Conta links num texto |
| | `campo_armadilha()`, `caiu_na_armadilha()` | Campo escondido contra robôs |

### `contas.php` – índice das funções das contas

| Parte | Função | O que faz |
|---|---|---|
| **1. Sessão** | `iniciar_sessao($u, $manter)` | Entra na conta (`session_regenerate_id`, último login, "Manter sessão iniciada") |
| | `lembrar_sessao()`, `entrar_com_cookie()` | Cria o cookie `seletor:validador` / entra com ele quando não há sessão |
| | `terminar_sessoes_lembradas()`, `apagar_cookie_lembrar()` | Termina as sessões guardadas (todas ou as outras) / apaga o cookie |
| | `dispositivo()` | "Windows · Chrome" |
| **2. Palavras-passe** | `erro_palavra_passe($p, $dados)` | Devolve a primeira regra que falha (ou `null`) |
| | `palavra_passe_comum()`, `apareceu_em_fugas()` | Lista das mais comuns / Have I Been Pwned (só o início do hash SHA-1) |
| | `tem_sequencia()`, `partes_pessoais()`, `simplificar()` | Ajudas das regras |
| | `lista_requisitos()` | HTML da lista de requisitos e da barra de força |
| **3. Emails** | `erro_email()` | Formato, emails descartáveis e DNS |
| | `enviar_confirmacao()`, `limite_envios()` | Link de confirmação (hash, 24 h) / 5 por hora e 60 s entre envios |
| | `esconder_email()`, `limpar_contas_por_confirmar()` | "d•••••@gmail.com" / apaga contas por confirmar há 7 dias |
| **4. Imagens** | `ficheiro_imagem()`, `recortar_imagem()` | Confirma o ficheiro enviado / recorta ao centro e grava em JPEG (GD) |
| **5. Internet** | `pedido_http()` | Pedido com cURL (Google e Have I Been Pwned) |
| | `google_configurado()`, `botao_google()`, `logo_google()` | Botão "Continuar com Google" |

---

## 11. Front-end: `style.css` e `main.js`

### `style.css`
- **Variáveis** no início (`--bg`, `--surface`, `--line`, …). O **modo claro** (linha 39) só troca os valores das variáveis quando `<html data-tema="claro">`.
- Organizado por secções com comentários: botões, caixas, avisos, formulários, tabs, estrelas, tabelas, paginação, cartazes, projetos, comunidade, chat, notificações, início, detalhe, perfil, catálogo, admin, login, 404.
- **Responsivo** a partir da linha 524 (`@media`) para tablet e telemóvel.
- Respeita quem prefere **menos movimento** (`prefers-reduced-motion`, linha 519).

### `main.js`
Não usa bibliotecas. Quase tudo funciona com **delegação de eventos** (`document.addEventListener('click', ...)`), por isso funciona em qualquer página.

| Linha | O que faz |
|---|---|
| 7 | Abre e fecha o menu do utilizador |
| 20 | Separadores (`data-tab` / `data-pane`), também pelo `#` do endereço |
| 34 | Caixa "Tens a certeza?" nos formulários com `data-confirm` |
| 40 | Destaque da página inicial a mudar a cada 8 s |
| 62 | Formulário de títulos: mostra só os campos do tipo escolhido |
| 70 | Contador de caracteres |
| 78 | **Chat** (`fetch` ao `chat_api.php`, atualiza a cada 4 s, editar e apagar) |
| 169 | Modo escuro/claro, guardado no `localStorage` |
| 180 | Botões que abrem um separador (ex.: "★ Avaliar") |
| 195 | Palavra-passe: botão Ver / Ocultar |
| 205 | Palavra-passe nova: requisitos ao vivo e barra de força (`regras-palavra-passe.js`) |
| 243 | Email: "Querias dizer …@gmail.com?" (`regras-email.js`) |
| 261 | "Manter sessão iniciada" também no botão do Google |
| 269 | Botão "Reenviar email" com contagem decrescente |
| 280 | Partilhar: copia o endereço do perfil |
| 294 | Recortar e reduzir a foto e o banner no browser antes de enviar |
| 333 | Definições: pré-visualização ao vivo, géneros (até 3) e aviso "Tens alterações por guardar" |

O tema é aplicado logo no `<head>` do `cabecalho.php` (linha 16), antes de a página aparecer, para não "piscar".

---

## 12. Segurança – resumo para a defesa

| Ameaça | Como o TavDex se protege | Onde |
|---|---|---|
| **SQL injection** | Todas as consultas usam `?` (prepared statements PDO) | `sql()` em `lib.php` |
| **XSS** | Tudo o que vem do utilizador passa por `e()`; no chat usa `textContent` | `lib.php`, `main.js` |
| **CSRF** | Token aleatório em todos os formulários POST | `campo_csrf()` / `verificar_csrf()` |
| **Palavras-passe** | `password_hash()` / `password_verify()` | `registar.php`, `login.php` |
| **Palavras-passe fracas** | Regras (10+, maiúscula, número, símbolo…), lista das comuns e fugas de dados | `erro_palavra_passe()` em `contas.php` |
| **Contas falsas** | Email confirmado por link (hash, 24 h, POST); emails descartáveis recusados | `confirmar_email.php`, `contas.php` |
| **Cookie roubado** | "Manter sessão iniciada" com `seletor:validador`, só o hash na BD, trocado a cada uso | `contas.php` |
| **Login com o Google** | `state` contra pedidos forjados + PKCE; o segredo fica no servidor | `google.php` |
| **Força bruta** | 5 falhas = 5 min de espera | `login.php` |
| **Roubo de sessão** | `session_regenerate_id()`, cookie `httponly` e `samesite` | `login.php`, `lib.php` linha 22 |
| **Recuperação** | Token aleatório, guardado em hash, válido 1 h e só uma vez | `recuperar.php`, `repor.php` |
| **Permissões** | `exigir_login()`, `exigir_admin()`, confirmar o dono antes de editar/apagar | várias páginas |
| **Uploads** | Confirma que é imagem real, limite de 3 MB, nome gerado pelo site | `admin_titulo.php` |
| **Spam** | `demasiado()`, `n_links()`, campo-armadilha | `lib.php` |
| **Redirecionamentos** | `voltar()` e `?voltar=` só aceitam endereços do próprio site | `lib.php`, `login.php` |
| **Ficheiros sensíveis** | `.htaccess` bloqueia `.sql`, `.md`, `config.php`, `lib.php` | `.htaccess` |

---

## 13. Como estudar o código (plano sugerido)

1. **`config.php`** (5 min) – percebe as constantes.
2. **`lib.php`** (1 h) – lê as secções *Base de dados*, *Sessão*, *Segurança* e *Navegação*. Depois disto, o resto do site é fácil.
3. **`cabecalho.php` e `rodape.php`** – o "molde" de todas as páginas.
4. **`login.php` e `registar.php`** – páginas curtas que mostram o modelo da secção 2.2 todo.
5. **`acoes.php`** – vários `case` pequenos; bom para perceber o `switch` + `op`.
6. **`catalogo.php`** – filtros, `WHERE` dinâmico, ordenação e paginação.
7. **`titulo.php`** – a página mais completa (avaliações, reviews, listas).
8. **Projetos** – com o `MANUAL-FASE-3.md` ao lado.
9. **`comunidade.php`**, depois **`chat.php` + `chat_api.php` + `main.js`** (AJAX).
10. **`admin.php`** e **`admin_titulo.php`**.
11. **`base_dados.sql`** com o `modelo_er.png` aberto ao lado.

**Truque para estudar:** abre o site no browser e o VS Code ao lado. Faz uma ação no site (ex.: seguir alguém), vê no endereço/formulário qual é a página e a `op` (ex.: `acoes.php`, `op=seguir`) e procura `case 'seguir'` com `Ctrl+Shift+F`.

### Perguntas que te podem fazer na defesa
- *Porque usaste PDO com `?` em vez de juntar o texto no SQL?* → SQL injection.
- *Como guardas as palavras-passe?* → `password_hash` (bcrypt), nunca em texto.
- *O que é o token CSRF?* → Prova que o formulário veio do teu site.
- *Como funciona o chat sem recarregar a página?* → `fetch` a cada 4 s ao `chat_api.php`, que devolve JSON.
- *Como funcionam as recomendações?* → Pontos por género (secção 9).
- *O que acontece quando apagas um projeto/utilizador?* → `ON DELETE CASCADE`.
- *Porque redirecionas depois de um POST?* → Padrão PRG, evita reenviar com F5.

---

## 14. Testar

- Instalação e diagnóstico: `http://localhost/tavdex/teste.php` (verifica PHP, base de dados, pastas e TMDB).
- **Admin**: `duarte@tavdex.pt` / `Admin#2026`
- **Utilizador**: `rafa@mail.pt` / `tavdex123` (todos os utilizadores de exemplo usam `tavdex123`)
