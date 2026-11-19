# Administração e gestão do sistema

## Objetivo
A área de administração do TavDex permite gerir a plataforma, moderar a comunidade e manter o catálogo. É essencial para manter o sistema funcional, seguro e organizado.

## Papel de administrador
O utilizador com o papel de administrador tem acesso ao **painel de administração** (`admin.html`), que os utilizadores comuns não veem.

## Estatísticas
O painel mostra:
- totais de utilizadores, títulos, avaliações, projetos, publicações e mensagens;
- denúncias pendentes e contas bloqueadas;
- novos registos nos últimos 6 meses (gráfico de barras);
- os títulos mais avaliados.

## Gestão de utilizadores
- Pesquisa de contas pelo @nome ou email (25 por página);
- Bloquear ou desbloquear uma conta: uma conta bloqueada perde logo todas as sessões abertas e não consegue entrar;
- Dar ou tirar o papel de administrador;
- Um administrador não pode alterar a sua própria conta neste painel;
- O último administrador do site não pode apagar a sua conta (o TavDex precisa sempre de pelo menos um).

## Gestão de denúncias
As denúncias aparecem com o conteúdo denunciado, o autor e o motivo, separadas por estado (pendentes, resolvidas, ignoradas). O administrador pode:
- marcar a denúncia como resolvida ou ignorada;
- apagar o conteúdo denunciado (todas as denúncias sobre esse conteúdo ficam resolvidas);
- bloquear a conta responsável.

## Gestão do catálogo
O administrador mantém o catálogo:
- criar, editar e apagar filmes e séries;
- criar e apagar géneros;
- criar pessoas e juntá-las ao elenco e à equipa de um título;
- criar, editar e apagar plataformas de streaming e indicar onde ver cada título;
- criar temporadas e episódios das séries.

## Gestão de projetos e candidaturas
O administrador pode editar ou apagar qualquer projeto e ver e decidir as suas candidaturas, se o dono não o puder fazer.

## Segurança e controlo
- Todas as rotas da API de administração exigem sessão de administrador (`exigirAdmin`);
- A página `admin.html` só abre com sessão iniciada;
- Os dados recebidos são sempre validados no servidor;
- Os pedidos sem permissão recebem 401 (sem sessão) ou 403 (sem autorização), com uma mensagem clara.

## Ficheiros associados
- `routes/admin.js` — estatísticas, utilizadores e denúncias;
- `routes/titulos.js` — gestão do catálogo (rotas só para administradores);
- `routes/middleware.js` — `exigirAdmin`;
- `public/js/paginas/admin.js` — a página do painel.

## Casos de uso
- O administrador valida a denúncia de uma mensagem ofensiva e apaga-a;
- O administrador bloqueia uma conta que faz spam;
- O administrador acrescenta um filme novo ao catálogo;
- Um utilizador sem permissão tenta abrir a área de administração e recebe acesso negado.

## Resultado esperado
A área de administração garante que o TavDex permanece organizado, moderado e funcional, preservando a qualidade da experiência para todos os utilizadores.
