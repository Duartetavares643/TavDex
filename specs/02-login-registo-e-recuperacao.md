# Login, registo e recuperação de conta

## Objetivo
Esta funcionalidade permite que os utilizadores acedam ao TavDex com segurança, criem a sua conta e recuperem a palavra-passe quando necessário.

## Fluxo de registo
A funcionalidade de registo permite criar uma conta com:
- nome de utilizador;
- email;
- palavra-passe;
- biometria mínima do perfil (bio, localização e cor de avatar, opcionalmente).

Regras de negócio:
- O nome de utilizador deve ter um formato válido;
- O email deve ser único e válido;
- A palavra-passe deve cumprir critérios de segurança;
- A conta é registada com papel padrão de utilizador;
- O sistema deve impedir duplicações de email e username.

## Fluxo de login
O login valida as credenciais do utilizador e inicia a sessão no sistema. Se o utilizador estiver bloqueado ou a conta não existir, a resposta é tratada como erro.

A sessão é mantida através de:
- armazenamento do identificador do utilizador em $_SESSION;
- validação por função exigir_login();
- proteção por CSRF em formulários POST;
- controlo de acesso em páginas que exigem autenticação.

## Recuperação de palavra-passe
O utilizador pode solicitar reset da password com base no email.

Processo:
1. O sistema verifica se o email existe;
2. Gera um token seguro;
3. Guarda o token em hash na base de dados;
4. Envia o link de recuperação ao email ou disponibiliza o link em modo de desenvolvimento;
5. O utilizador define uma nova palavra-passe;
6. O token expira após um período definido (1 hora, no projeto).

## Regras de segurança
- O token é guardado em hash SHA-256;
- O link tem validade temporária;
- A mesma mensagem é usada para qualquer email, para não revelar se a conta existe;
- O utilizador é redirecionado para a página de login após as operações principais;
- As operações de alteração e reset são protegidas por token CSRF.

## Páginas associadas
- login.php
- registar.php
- recuperar.php
- repor.php
- lib.php (funções exige_login, token_csrf, verificar_csrf)

## Cenários de uso
- O utilizador entra no sistema pela primeira vez;
- O utilizador esquece a palavra-passe;
- O utilizador tenta aceder a uma página sem sessão;
- O utilizador tenta autenticar-se com credenciais inválidas;
- O utilizador altera a password após o login.

## Resultado esperado
O utilizador consegue criar uma conta, iniciar sessão, recuperar o acesso e navegar no sistema de forma segura e controlada.
