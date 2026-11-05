# TavDex – PAP 2026/2027

Site dinâmico e responsivo para descobrir, organizar e avaliar filmes e séries, com comunidade e projetos cinematográficos.

**Tecnologias:** HTML, CSS e JavaScript (páginas) · Node.js + Express (servidor) · MySQL 8 (base de dados, com mysql2).

## Instalação
1. Instalar o **Node.js** (versão 20 ou mais recente) e o **MySQL 8** (ou o MySQL do XAMPP).
2. No MySQL Workbench, executar por esta ordem:
   - `database/01_criar_bd.sql` (cria a base de dados `TavDex`)
   - `database/02_inserir_dados.sql` (dados de exemplo)
3. Copiar `.env.example` para `.env` e preencher a password do MySQL e o `SEGREDO_SESSAO`.
4. Na pasta do projeto:
   ```
   npm install
   npm start
   ```
5. Abrir http://localhost:3000. Deve aparecer "Tudo a funcionar".

## Contas de teste
| Conta | Email | Palavra-passe |
|---|---|---|
| Administrador | duarte@tavdex.pt | Admin#2026 |
| Utilizador | lara@mail.pt | tavdex123 |

Os outros utilizadores de exemplo usam `nome@mail.pt` e a palavra-passe `tavdex123`.

## Estrutura
```
server.js        servidor Express (sessões, CSRF, rotas)
db.js            ligação ao MySQL (linhas, linha, executar)
.env             segredos (não vai para o GitHub)
routes/          API, um ficheiro por parte do site
public/          páginas HTML, css/, js/, img/
database/        scripts SQL e modelo ER
specs/           documentação funcional
antigo_php/      versão anterior em PHP (só como referência)
```

## Fases
1. Base de dados e servidor ✔
2. Utilizadores (registo, login, Google, recuperação, perfil, definições)
3. Projetos (CRUD, candidaturas, avaliações)
4. Comunidade e administração (chat, notificações, denúncias, painel)
5. Catálogo (pesquisa, filtros, temporadas, CRUD de títulos)
6. Avaliações e listas (estrelas, reviews, favoritos, recomendações)
