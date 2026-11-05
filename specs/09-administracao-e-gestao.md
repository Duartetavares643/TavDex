# Administração e gestão do sistema

## Objetivo
A área administrativa do TavDex permite gerir a plataforma, controlar interações, decidir sobre candidaturas e tratar denúncias. Esta funcionalidade é essencial para manter o sistema funcional, seguro e bem organizado.

## Papel administrativo
O utilizador com perfil de administrador tem acesso a ações de gestão que não estão disponiveis para utilizadores comuns.

Funções principais:
- consultar área administrativa;
- gerir denúncias;
- verificar projetos e candidaturas quando necessário;
- controlar acesso às secções restritas.

## Gestão de candidaturas
Se o dono do projeto não puder acompanhar o processo ou se houver necessidade de gestão central, um administrador pode intervir. O sistema valida quem pode ver e decidir sobre candidaturas.

## Gestão de denúncias
As denúncias podem ser tratadas para:
- validar a gravidade do conteúdo;
- bloquear ou remover ações problemáticas;
- manter um ambiente respeitador e seguro.

## Segurança e controlo
A gestão administrativa inclui:
- controlo de sessão;
- acesso restrito por perfil;
- validação de ações sensíveis;
- mensagens de erro e de confirmação;
- rejeição de pedidos inválidos.

## Regras relevantes
- Um utilizador comum não pode aceder a páginas administrativas;
- A página de administração exige autenticação e autorização;
- O exemplo de código do projeto usa a função exigir_admin();
- a interface mostra mensagens claras quando o utilizador não tem acesso.

## Casos de uso
- O administrador valida uma denúncia de mensagem ofensiva;
- O administrador acompanha uma candidatura em projeto de outra pessoa;
- O utilizador sem privilégio tenta entrar na área admin e recebe acesso restrito;
- O administrador faz gestão de rotinas e manutenção da plataforma.

## Resultado esperado
A área administrativa garante que o TavDex permanece organizado, moderado e funcional, preservando a qualidade da experiência para todos os utilizadores.
