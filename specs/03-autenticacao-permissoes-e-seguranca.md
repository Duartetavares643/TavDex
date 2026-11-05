# Autenticação, permissões e segurança

## Objetivo
As páginas do TavDex têm regras de segurança para garantir que apenas utilizadores corretos acedem a certos conteúdos. Esta documentação descreve o sistema de autenticação e os mecanismos de proteção implementados.

## Sessão e autenticação
O sistema usa sessões PHP para manter o estado do utilizador. A informação da sessão inclui o identificador do utilizador (uid).

Funções principais:
- eu(): devolve o utilizador autenticado;
- exigir_login(): bloqueia acesso a páginas sem sessão;
- e_admin(): verifica se o utilizador tem perfil administrativo;
- exigir_admin(): limita acesso às áreas de gestão.

Se a sessão estiver inválida, bloqueada ou apagada, o sistema limpa a sessão e redireciona para login.

## Níveis de acesso
O sistema distingue dois papéis principais:
- utilizador comum;
- administrador.

Papel de administrador:
- pode gerir denúncias;
- pode visualizar e decidir candidaturas, se for dono do projeto ou administrador;
- pode controlar a área administrativa do site.

## Proteção anti-CSRF
Todos os formulários POST devem incluir um token CSRF gerado pela sessão.

Mecanismos:
- token_csrf(): gera ou reutiliza um token;
- campo_csrf(): inclui o token num campo escondido;
- verificar_csrf(): valida o token antes de executar qualquer ação.

Sem este token, o pedido é rejeitado com erro de 400.

## Escaping e prevenção de XSS
As funções e() e htmlspecialchars(...) são usadas para escapar conteúdos antes de serem impressos no HTML, reduzindo risco de injeção de scripts.

## Controlo de envio e abuso
O sistema inclui mecanismos de proteção contra abuso, nomeadamente:
- limite de projetos novos por hora;
- limite de denúncias por utilizador num período;
- validação de inputs obrigatórios;
- bloqueio de contas caso necessário.

## Política de navegação e mensagens
O sistema usa redirecionamentos com `Location` e mensagens flash, por exemplo:
- aviso('Mensagem');
- mostrar_avisos();

Estas mensagens ajudam a feedback do utilizador e reduzem a fricção da experiência.

## Regras de negócio relevantes
- Só utilizadores autenticados podem criar projetos, avaliar conteúdos ou enviar mensagens;
- Só o dono do projeto ou o administrador pode consultar candidaturas;
- O sistema evita que um utilizador faça ações em objetos que não existem;
- A sessão não é persistida em JavaScript; usa cookies com `httponly` e `samesite`.

## Resultado esperado
O TavDex oferece um sistema seguro, com autenticação válida, controlo de permissões e proteção contra ataques comuns da web.
