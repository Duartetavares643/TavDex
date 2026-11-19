# Alterações antigas da base de dados

**Para instalar o TavDex não precisas destes ficheiros:** usa só o `database/tavdex_site.sql`.

Estes são os scripts com que a base de dados foi crescendo ao longo do projeto (Fase 1 até às contas mais seguras e ao banner com imagem). O `tavdex_site.sql` já tem tudo isto junto.

Só servem para **pôr em dia uma base de dados antiga sem perder os dados** que lá estão. Nesse caso corre, pela ordem, os que ainda faltam:

| Script | O que muda |
|---|---|
| `01_criar_bd.sql` | cria a base de dados `TavDex` (Fase 1) |
| `02_inserir_dados.sql` | dados de exemplo |
| `extras.sql` | sessões por dispositivo, comunidade, elenco, episódios, vista `vw_titulos_avaliacao` (Fases 2 a 6) |
| `03_contas.sql` | nome de exibição, foto, email confirmado |
| `04_banner_perfil.sql` | coluna `tema_banner` |
| `05_banner_cinema.sql` | cenários de cinema do banner |
| `06_seguranca_contas.sql` | confirmação do email, @nomes antigos, géneros favoritos, privacidade, "Manter sessão iniciada" |
| `07_banners_novos.sql` | os 5 cenários atuais do banner |
| `08_banner_imagem.sql` | imagem própria no banner |

Estes scripts usam a base de dados `TavDex` (o nome antigo). O site usa a que estiver em `BD_NOME` no `.env`.
