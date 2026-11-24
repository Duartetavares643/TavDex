# Manual da Fase 3 – Projetos da comunidade

Este manual explica como funcionam os **projetos cinematográficos** do TavDex (passos 11 a 19 do anteprojeto) e **onde está cada coisa no código**.

> Dica para o VS Code: carrega em `Ctrl+P` e escreve o nome do ficheiro para o abrir. Depois carrega em `Ctrl+G` e escreve o número da linha para lá ir.

---

## 1. Resumo rápido

| Passo | O que faz | Ficheiro | Linha |
|---|---|---|---|
| 11 | Criar projeto | `projeto_novo.php` (+ `projeto_form.php`) | 9–28 |
| 12 | Editar projeto (dados, equipa e vagas) | `projeto_editar.php` | 21–70 |
| 13 | Apagar projeto | `projeto_editar.php` (op `apagar`) e `admin.php` (op `apagar_projeto`) | 73 / 49 |
| 14 | Página do projeto | `projeto.php` | 1–159 |
| 15 | Candidatar-se a uma vaga | `projeto.php` (op `candidatar`) | 28 |
| 16 | Retirar candidatura | `projeto.php` (op `retirar`) | 42 |
| 17 | Ver candidaturas | `candidaturas.php` | 40–74 |
| 18 | Aceitar / rejeitar candidato | `candidaturas.php` | 14–37 |
| 19 | Avaliar e fazer review | `projeto.php` (op `avaliar`) | 48 |
| – | Lista de projetos (pesquisa e filtros) | `projetos.php` | 1–38 |

---

## 2. A base de dados (`base_dados.sql`, linhas 148–206)

A fase 3 usa **5 tabelas**:

| Tabela | Para que serve | Colunas importantes |
|---|---|---|
| `projetos` | O projeto em si | `dono_id`, `titulo`, `sinopse`, `tipo`, `genero`, `estado`, `criado_em` |
| `projeto_equipa` | Membros da equipa | `projeto_id`, `funcao`, `utilizador_id` (pode ser `NULL`), `nome` |
| `projeto_vagas` | Funções que o projeto procura | `projeto_id`, `funcao`, `descricao`, `aberta` (1 = aberta, 0 = fechada) |
| `candidaturas` | Pedidos para entrar numa vaga | `vaga_id`, `utilizador_id`, `mensagem`, `estado` (`pendente` / `aceite` / `rejeitada`) |
| `projeto_avaliacoes` | Estrelas e reviews | `projeto_id`, `utilizador_id`, `nota` (1 a 5), `review` |

Pormenores que vale a pena explicar na apresentação:

- **`tipo` e `estado` são `ENUM`**: só aceitam os valores da lista (`Filme`, `Série`, `Curta-metragem`, `Documentário`, `Videoclipe` e `Ideia`, `Recrutamento`, `Pré-produção`, `Em produção`, `Concluído`).
- **`ON DELETE CASCADE`**: quando se apaga um projeto, a base de dados apaga sozinha a equipa, as vagas, as candidaturas e as avaliações. Por isso o passo 13 só precisa de um `DELETE FROM projetos`.
- **`UNIQUE (vaga_id, utilizador_id)`** em `candidaturas`: impede a mesma pessoa de se candidatar duas vezes à mesma vaga.
- **`UNIQUE (projeto_id, utilizador_id)`** em `projeto_avaliacoes`: cada pessoa só tem uma avaliação por projeto (se avaliar outra vez, a avaliação é atualizada).
- **Um membro da equipa pode não ter conta**: se `utilizador_id` for `NULL`, usa-se a coluna `nome` (aparece como "convidado").

Os dados de exemplo estão em `dados.sql` (a partir da linha 3387): 10 projetos, com equipa, vagas e candidaturas.

---

## 3. Passo a passo

### Passo 11 – Criar projeto (`projeto_novo.php`)

1. **Linha 5** – `exigir_login()`: quem não tem sessão iniciada é mandado para o login.
2. **Linha 11** – `validar_projeto()` (está em `projeto_form.php`, linha 8) verifica:
   - título com pelo menos 2 caracteres;
   - sinopse com pelo menos 10 caracteres;
   - tipo e estado dentro das listas permitidas.
3. **Linha 15** – anti-spam: `demasiado('projetos', 'dono_id', ..., 3, 3600)` → no máximo **3 projetos por hora**.
4. **Linha 17** – `INSERT INTO projetos`.
5. **Linha 21** – o criador entra logo na equipa (`INSERT INTO projeto_equipa`) com a função que escolheu.
6. **Linha 22–24** – as vagas escritas separadas por vírgulas (ex.: "Ator, Editor") viram linhas em `projeto_vagas` (máximo 10).
7. **Linha 26** – vai para a página do projeto novo.

O **formulário** (título, sinopse, tipo, estado, género) está na função `campos_projeto()` em `projeto_form.php` (linha 25). É o mesmo formulário para criar e para editar, por isso está num ficheiro à parte.

### Passo 12 – Editar projeto (`projeto_editar.php`)

- **Linhas 9–14** – só o **dono** ou um **administrador** podem entrar. Os outros são mandados para `projetos.php`.
- A página tem vários formulários. Cada um envia um campo escondido `op`, e o `switch` da **linha 20** decide o que fazer:

| `op` | Linha | O que faz |
|---|---|---|
| `dados` | 21 | Atualiza título, sinopse, tipo, género e estado (`UPDATE projetos`) |
| `add_membro` | 31 | Adiciona um membro. Se o nome for de um utilizador do TavDex, liga ao perfil e envia-lhe uma notificação; se não, guarda só o nome |
| `rem_membro` | 47 | Remove um membro (o dono não tem botão de remover) |
| `add_vaga` | 52 | Cria uma vaga nova |
| `vaga_estado` | 63 | Abre/fecha uma vaga (`aberta = 1 - aberta` troca 0↔1) |
| `rem_vaga` | 67 | Apaga a vaga (e as candidaturas a ela, por cascata) |
| `apagar` | 73 | Passo 13 |

### Passo 13 – Apagar projeto

- **`projeto_editar.php`, linha 73** – o dono (ou um admin) apaga. Se foi um admin, o dono recebe uma notificação.
- **`admin.php`, linha 49** (op `apagar_projeto`) – o administrador também pode apagar a partir do separador **Projetos** da página de administração (`admin.php?s=projetos`, linha 192).
- O formulário tem `data-confirm="..."`: o `main.js` mostra uma caixa "Tens a certeza?" antes de enviar.

### Passo 14 – Página do projeto (`projeto.php`)

- **Linha 9** – vai buscar o projeto e o nome do dono (`JOIN utilizadores`). Se não existir → erro 404 (linhas 10–17).
- **Linhas 19–20** – `$dono` (és o dono?) e `$pode_gerir` (és o dono ou admin?). Isto decide que botões aparecem.
- **Linhas 75–83** – vai buscar a equipa, as vagas abertas, as tuas candidaturas, as avaliações e calcula a média.
- **HTML (linha 89 em diante)**:
  - cabeçalho com tipo, estado, género, média de estrelas e sinopse;
  - botões **Editar projeto** e **Candidaturas (X novas)** só para quem pode gerir;
  - **Equipa** (linha 108);
  - **Vagas abertas** com o formulário de candidatura (linha 116);
  - **As minhas candidaturas** (linha 130);
  - **Avaliações** à direita (linha 139).

### Passo 15 – Candidatar-se (`projeto.php`, op `candidatar`, linha 28)

Verificações, por esta ordem:
1. A vaga existe, é deste projeto e está **aberta**. O dono **não** se pode candidatar ao próprio projeto.
2. Anti-spam: no máximo **10 candidaturas por hora** (`demasiado`).
3. Ainda não te candidataste a esta vaga.

Depois faz `INSERT INTO candidaturas` (estado `pendente`) e envia uma **notificação ao dono** com link para `candidaturas.php`.

### Passo 16 – Retirar candidatura (`projeto.php`, op `retirar`, linha 42)

```sql
DELETE FROM candidaturas WHERE id = ? AND utilizador_id = ? AND estado = 'pendente'
```
O `utilizador_id = ?` garante que só apagas as **tuas** candidaturas, e o `estado = 'pendente'` impede retirar uma candidatura que já foi aceite ou rejeitada.

### Passo 17 – Ver candidaturas (`candidaturas.php`)

- **Linhas 7–11** – só o dono ou um admin.
- **Linhas 40–44** – lista as candidaturas com o nome, a bio e a mensagem do candidato.
- **Separadores** Pendentes / Aceites / Rejeitadas / Todas (linha 54), com o número de cada (`GROUP BY c.estado`, linha 45).

### Passo 18 – Aceitar / rejeitar (`candidaturas.php`, linhas 14–37)

Os dois botões estão no mesmo formulário e enviam `decisao=aceitar` ou `decisao=rejeitar`.

**Aceitar** (linha 19):
1. A candidatura passa a `aceite`;
2. O candidato entra na **equipa** com a função da vaga;
3. A **vaga fecha** (`aberta = 0`);
4. O candidato recebe uma notificação "foi aceite! 🎬";
5. As **outras candidaturas pendentes** à mesma vaga passam a `rejeitada` e essas pessoas são avisadas de que a vaga já foi preenchida.

**Rejeitar** (linha 31): a candidatura passa a `rejeitada` e o candidato recebe uma notificação.

### Passo 19 – Avaliar e fazer review (`projeto.php`, op `avaliar`, linha 48)

- Nota obrigatória de **1 a 5**; review opcional (máx. 1000 caracteres).
- O dono **não** pode avaliar o próprio projeto.
- Se já avaliaste → `UPDATE` (editar a avaliação); se não → `INSERT` + notificação ao dono.
- **Apagar avaliação** (op `apagar_avaliacao`, linha 63): o autor apaga a sua; um admin pode apagar qualquer uma.
- As estrelas do formulário vêm da função `campo_estrelas()` em `lib.php`.

### Lista de projetos (`projetos.php`)

- Pesquisa por título/sinopse (`LIKE`), filtro por **estado**, por **tipo** e "**Com vagas abertas**" (usa `EXISTS`).
- Monta o `WHERE` aos bocados (linhas 10–15) e junta-o à consulta base `SQL_PROJETOS` (definida em `lib.php`, linha 562, que também conta os membros).
- Cada cartão é desenhado pela função `cartao_projeto()` (`lib.php`, linha 447).
- O link **Projetos** do menu está em `cabecalho.php` (linha 7).

---

## 4. Funções de `lib.php` usadas na fase 3

| Função | Linha | Para que serve |
|---|---|---|
| `e_admin()` | 110 | Diz se quem está ligado é administrador |
| `exigir_login()` | 116 | Obriga a ter sessão iniciada |
| `campo_csrf()` / `verificar_csrf()` | 158 / 164 | Proteção contra pedidos falsos: todos os formulários levam um token escondido que é verificado no POST |
| `ir()` / `aviso()` | 176 / 183 | Redirecionar e mostrar a mensagem verde/vermelha no topo |
| `cartao_projeto()` | 447 | Cartão de um projeto na lista |
| `badge_estado()` | 548 | Etiqueta colorida do estado (Ideia, Recrutamento, pendente, aceite…) |
| `SQL_PROJETOS` | 562 | Consulta base dos projetos com o número de membros |
| `notificar()` | 606 | Cria uma notificação (não notifica a própria pessoa nem quem silenciou esse tipo) |
| `demasiado()` | 716 | Anti-spam: conta quantos registos a pessoa criou num intervalo de tempo |

Outras funções usadas: `sql()`, `linha()`, `linhas()`, `valor()` (consultas à base de dados com `?`, ou seja, prepared statements contra SQL injection), `campo()` (lê um campo do POST já sem espaços) e `e()` (escapa o HTML contra XSS).

---

## 5. Segurança (bom para a defesa da PAP)

- **Login obrigatório** para criar, candidatar, avaliar e gerir (`exigir_login()`).
- **Permissões**: só o dono ou um admin editam, apagam e veem as candidaturas.
- **CSRF**: todos os formulários POST têm token (`campo_csrf()` + `verificar_csrf()`).
- **SQL injection**: todas as consultas usam `?` (prepared statements).
- **XSS**: tudo o que vem do utilizador é mostrado com `e()`.
- **Anti-spam**: 3 projetos/hora e 10 candidaturas/hora.
- **Regras na base de dados**: `UNIQUE` (sem candidaturas ou avaliações repetidas), `CHECK (nota BETWEEN 1 AND 5)` e `ON DELETE CASCADE`.

---

## 6. Como testar

1. Abre `http://localhost/tavdex/projetos.php`.
2. Entra com **duarte@tavdex.pt / Admin#2026**. És o dono de *The Last Frontier* (projeto 1): experimenta **Editar projeto**, adicionar uma vaga e ver as candidaturas.
3. Noutro browser (ou numa janela anónima), entra com **rafa@mail.pt / tavdex123**, abre o mesmo projeto e **candidata-te** à vaga.
4. Volta à conta do Duarte → **Candidaturas** → **Aceitar**. O Rafa aparece na equipa, a vaga fecha e ele recebe uma notificação.
5. Com o Rafa, **avalia** o projeto com estrelas e uma review.
6. Cria um projeto novo em **+ Criar projeto** e depois apaga-o em **Editar projeto → Apagar projeto**.
