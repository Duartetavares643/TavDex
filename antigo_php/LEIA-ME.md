# TavDex – PAP 2026/2027

Site dinâmico e responsivo para descobrir, organizar e avaliar filmes e séries, com comunidade e projetos cinematográficos.
Feito em **HTML, CSS, JavaScript, PHP 8 e MySQL 8**, sem frameworks.

---

## 1. Instalar no computador (XAMPP)

1. Instalar o **XAMPP** (com PHP 8.1 ou superior) e ligar o **Apache** e o **MySQL** no painel do XAMPP.
2. Copiar a pasta `tavdex-php` para `C:\xampp\htdocs\`.
3. Criar a base de dados (no **MySQL Workbench** ou em `http://localhost/phpmyadmin`):
   1. Executar **`base_dados.sql`** (cria a base de dados `TavDex` e as tabelas).
   2. Executar **`dados.sql`** (insere os dados de exemplo).
4. Confirmar que está tudo bem: **http://localhost/tavdex-php/teste.php** (página de teste: verifica o PHP, a base de dados, as pastas e o TMDB, e diz como resolver cada problema).
5. Abrir o site: **http://localhost/tavdex-php/**

Para pôr o site online (alojamento com a base de dados já criada), importar antes **`instalar_online.sql`**, que junta os dois scripts sem as linhas `CREATE DATABASE` e `USE`.

Se o MySQL tiver password ou outro utilizador, alterar em `config.php`.

**Já tinhas a base de dados de uma versão anterior?** Executa **`atualizar_bd.sql`** (acrescenta as colunas das imagens e as tabelas do "Onde ver") ou importa de novo `base_dados.sql` + `dados.sql` (apaga os dados antigos).

**Não queres instalar o XAMPP?** Também funciona com o servidor que vem com o PHP: `php -S localhost:8000` dentro da pasta (ver o guia "TavDex sem XAMPP").

### Dados de exemplo
80 utilizadores, 57 filmes e séries, 13 géneros, 8 plataformas de streaming, ~950 classificações, ~430 reviews, 10 projetos e publicações com comentários. As plataformas do "Onde ver" são exemplos; com a chave do TMDB o botão "Procurar imagens no TMDB" preenche as plataformas reais em Portugal (dados JustWatch).

### Contas de teste

| Conta | Email | Palavra-passe |
|---|---|---|
| Administrador | duarte@tavdex.pt | Admin#2026 |
| Utilizador (ex.: Rafa) | rafa@mail.pt | tavdex123 |

Os 79 utilizadores de exemplo usam o nome em minúsculas e sem pontos + `@mail.pt`, com a palavra-passe `tavdex123` (ex.: `lara@mail.pt`, `joaop@mail.pt`).

### Recuperação da palavra-passe
O XAMPP não tem servidor de email. Com `MODO_DEV = true` (em `config.php`) o link de recuperação aparece no ecrã.
No servidor final, mudar para `false` e configurar o envio de email do PHP.

---

## 2. Passos do anteprojeto e onde estão

| Passo | Descrição | Ficheiro(s) |
|---|---|---|
| **Fase 1 – Base de dados** |||
| 1 | Modelo entidade-relação | `modelo_er.png`, `modelo_er.svg` |
| 2 | Script SQL de criação | `base_dados.sql` |
| 3 | Script SQL de inserção de dados | `dados.sql` |
| **Fase 2 – Utilizadores e autenticação** |||
| 4 | Página inicial | `index.php` |
| 5 | Registo | `registar.php` |
| 6 | Login | `login.php` |
| 7 | Logout | `logout.php` |
| 8 | Recuperação de login | `recuperar.php`, `repor.php` |
| 9 | Perfil dos utilizadores | `perfil.php` |
| 10 | Edição do perfil | `editar_perfil.php` |
| **Fase 3 – Projetos da comunidade** |||
| 11 | Inserir novo projeto | `projeto_novo.php` (+ `projeto_form.php`) |
| 12 | Editar projeto (dados, equipa, vagas) | `projeto_editar.php` |
| 13 | Apagar projeto | `projeto_editar.php` (op `apagar`) e `admin.php` |
| 14 | Página individual do projeto | `projeto.php` |
| 15 | Candidatura a um projeto | `projeto.php` (op `candidatar`) |
| 16 | Retirar candidatura | `projeto.php` (op `retirar`) |
| 17 | Ver candidaturas | `candidaturas.php` |
| 18 | Aprovar / rejeitar candidato | `candidaturas.php` |
| 19 | Avaliar e fazer reviews de um projeto | `projeto.php` (op `avaliar`) |
| **Fase 4 – Comunidade e administração** |||
| 20 | Chat da comunidade | `chat.php`, `chat_api.php`, `main.js` |
| 21 | Notificações | `notificacoes.php`, função `notificar()` em `lib.php` |
| 22 | Silenciar notificações | `notificacoes.php` (tabela `notif_silenciadas`) |
| 23 | Página de administração | `admin.php` |
| **Fase 5 – Catálogo de filmes e séries** |||
| 24 | Catálogo | `catalogo.php` |
| 25 | Páginas individuais dos filmes e séries | `titulo.php` |
| 26 | Pesquisa | `catalogo.php` (campo de pesquisa) e `pesquisa.php` (barra do topo) |
| 27 | Filtros | `catalogo.php` (tipo, género, ano, avaliação) |
| 28 | Ordenação | `catalogo.php` (nome, recentes, antigos, nota, popularidade) |
| 29 | Gestão de séries (temporadas) | `admin_titulo.php` e `admin.php?s=series` |
| 30 | Inserir filmes e séries | `admin_titulo.php` |
| 31 | Listagem de filmes e séries | `admin.php?s=titulos` |
| 32 | Alterar filmes e séries | `admin_titulo.php?id=…` |
| 33 | Remover filmes e séries | `admin.php` (op `apagar_titulo`) |
| **Fase 6 – Avaliações e listas** |||
| 34 | Classificações (1 a 5 estrelas) | `titulo.php` |
| 35 | Reviews (com aviso de spoilers) | `titulo.php` |
| 36 | Editar reviews | `titulo.php?editar=1` |
| 37 | Apagar reviews | `titulo.php` (op `apagar`) |
| 38 | Lista de favoritos | `listas.php?l=favorito` |
| 39 | Adicionar favoritos | `acoes.php` (ação `lista`), botão na página do título |
| 40 | Adicionar à lista de vistos | `acoes.php` (ação `lista`) |
| 41 | Remover favoritos | `acoes.php` (modo `remover`), botão em `listas.php` |
| 42 / 44 | Remover da lista de vistos | `acoes.php` (modo `remover`), botão em `listas.php` |
| 43 | Lista de vistos | `listas.php?l=visto` |

Extras pedidos na descrição do anteprojeto: **recomendações personalizadas** (`recomendacoes()` em `lib.php`, no início e no perfil), **seguidores** (`acoes.php`), **feed com comentários e respostas** (`comunidade.php`) e **denúncias** (`acoes.php` + `admin.php`).

Funcionalidades acrescentadas:

| Funcionalidade | Onde |
|---|---|
| Onde ver (plataformas de streaming) | `titulo.php`, filtro em `catalogo.php`, escolha em `admin_titulo.php`, `tmdb_plataformas()` em `lib.php` |
| Compatibilidade de gostos (% entre dois utilizadores) | `perfil.php`, `compatibilidade()` em `lib.php` |
| Imagens do TMDB (cartaz e fundo) | `admin_titulo.php`, `admin.php`, `tmdb_atualizar()` em `lib.php` |
| Paginação | `paginado()` e `paginacao()` em `lib.php`; catálogo, comunidade, notificações e admin |
| Anti-spam | `demasiado()`, `n_links()`, `campo_armadilha()` em `lib.php`; registo, comunidade, chat, projetos, candidaturas, denúncias |
| Modo claro / escuro | `cabecalho.php`, `main.js`, `style.css` |
| Página de teste | `teste.php` |

---

## 3. Organização dos ficheiros

Está tudo numa única pasta:

- **Páginas**: `index.php`, `catalogo.php`, `titulo.php`, `projetos.php`, `projeto.php`, `comunidade.php`, `chat.php`, `perfil.php`, `listas.php`, `notificacoes.php`, `admin.php`, …
- **Partilhados**: `config.php` (configuração), `lib.php` (funções), `cabecalho.php` e `rodape.php` (topo e fundo de todas as páginas)
- **Ações**: `acoes.php` (seguir, listas, denúncias), `chat_api.php` (chat em JSON), `logout.php`
- **Aspeto**: `style.css`, `main.js`, `logo.png`
- **Base de dados**: `base_dados.sql` (22 tabelas), `dados.sql`, `instalar_online.sql`, `atualizar_bd.sql`, `modelo_er.png`
- Os cartazes e fundos carregados no painel de administração ficam guardados como `cartaz-<id>-<data>.jpg` e `fundo-<id>-<data>.jpg`.

---

## 4. Segurança

- Palavras-passe guardadas com `password_hash()` (bcrypt) e verificadas com `password_verify()`.
- Todas as consultas usam **consultas preparadas** (PDO) → proteção contra *SQL injection*.
- Todo o texto mostrado passa por `e()` (`htmlspecialchars`) → proteção contra *XSS*.
- Todos os formulários têm **token CSRF**.
- `session_regenerate_id()` no login e cookie de sessão `HttpOnly`.
- Limite de 5 tentativas de login falhadas (espera de 5 minutos).
- Tokens de recuperação aleatórios, guardados em hash e válidos 1 hora.
- Cartazes: só JPG/PNG/WEBP até 3 MB, verificados com `getimagesize()` e gravados com nome gerado pelo site.
- Permissões: só o dono (ou um administrador) edita/apaga projetos, reviews, publicações e mensagens; o painel é só para administradores; contas bloqueadas perdem a sessão.
- Anti-spam: campo escondido que só os robôs preenchem, limites por tempo (ex.: 3 publicações em 5 minutos, 8 mensagens em 20 segundos, 20 registos em 10 minutos no site todo), mensagens repetidas recusadas e no máximo 2 links por texto (exceto administradores).
- `.htaccess` impede o acesso direto aos ficheiros `.sql` e aos ficheiros internos.

---

## 5. Git e GitHub

```
git init
git add .
git commit -m "TavDex – versão inicial"
git branch -M main
git remote add origin https://github.com/<utilizador>/tavdex.git
git push -u origin main
```

Fazer um commit no fim de cada passo (ex.: `git commit -m "Passo 15 – candidaturas"`) ajuda a mostrar a evolução no relatório.
