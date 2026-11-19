# Login, registo e recuperação de conta

## Objetivo
Esta funcionalidade permite que os utilizadores criem a sua conta, entrem no TavDex com segurança e recuperem a palavra-passe quando a esquecem.

## Fluxo de registo
O registo pede:
- nome (ex.: "Duarte Tavares");
- @nome de utilizador;
- email;
- palavra-passe e confirmação;
- aceitação das regras da comunidade.

Também é possível criar conta com o botão **"Registar com Google"**.

Regras de negócio:
- O **nome** só aceita letras (com acentos), espaços, hífen e apóstrofo: sem números, símbolos ou caracteres invisíveis;
- O **@nome** tem 3 a 30 caracteres (letras, números, `_` e `.`), é único e não pode ser um nome reservado (`admin`, `tavdex`, `suporte`, …) nem o @nome antigo de outra pessoa;
- O **email** tem de ter um formato válido, não pode ser de um serviço de emails temporários e o domínio tem de existir e receber emails;
- A **palavra-passe** tem de ter pelo menos 10 caracteres, maiúsculas, minúsculas, números e símbolos. Não pode conter o nome, o @nome ou o email, nem ser uma das palavras-passe mais comuns ou ter aparecido em fugas de dados;
- A conta é criada com o papel de utilizador e **por confirmar**: só entra depois de abrir o link enviado para o email (válido 24 horas).

Ajudas no formulário:
- Enquanto se escreve, cada campo errado fica a vermelho com a mensagem por baixo;
- O @nome mostra "Disponível" ou "Já está a ser usado";
- O email sugere correções de erros de escrita ("Querias dizer …@gmail.com?");
- A palavra-passe mostra a lista de requisitos e uma barra de força.

Proteção contra robôs:
- Campo-armadilha invisível;
- Tempo mínimo para preencher o formulário;
- No máximo 15 contas novas por IP em 10 minutos.

Depois de criar a conta, o utilizador vai para a página de login com o aviso "Conta criada!" e um botão para reenviar o email de confirmação.

## Fluxo de login
O login aceita o @nome ou o email e a palavra-passe, ou o botão **"Continuar com Google"**. A opção **"Manter sessão iniciada"** escolhe a duração da sessão.

- Credenciais erradas dão sempre a mesma mensagem, para não revelar se a conta existe;
- Depois de 5 tentativas falhadas numa conta (ou 20 a partir do mesmo IP) em 15 minutos, o login fica bloqueado durante 15 minutos (com uma ligação para recuperar a palavra-passe);
- Uma conta com o email por confirmar não entra: aparece o botão para reenviar o link;
- Uma conta bloqueada pela administração não entra;
- Depois do login, o utilizador volta à página onde estava.

## Recuperação de palavra-passe
O utilizador pede a recuperação com o **email ou o @nome**.

Processo:
1. O sistema responde sempre com a mesma mensagem, exista ou não a conta;
2. Se a conta existir, gera um token aleatório e guarda só o seu hash (SHA-256);
3. Envia para o email um link para definir uma nova palavra-passe (o email mostra o @nome);
4. O link é válido durante 30 minutos e só serve uma vez;
5. O utilizador define a nova palavra-passe (com as mesmas regras do registo);
6. As sessões abertas noutros dispositivos são terminadas e é enviado o email "A tua palavra-passe foi alterada".

Limites: no máximo 3 pedidos por hora por conta e 10 por hora por IP.

## Regras de segurança
- Os tokens (recuperação e confirmação do email) são guardados apenas em hash;
- Os links têm validade curta e são de uso único;
- A página do link tira o token da barra de endereço e não o envia a outros sites (`no-referrer`);
- Todas as ações que mudam dados exigem o token CSRF;
- As mensagens nunca revelam se um email ou @nome tem conta (exceto no registo, com limite de pedidos).

## Ficheiros associados
- `routes/auth.js` — registo, login, logout, recuperação;
- `routes/confirmacao-email.js` — confirmação do email por link;
- `routes/google.js` — login com o Google;
- `routes/palavras-passe.js` e `public/js/regras-palavra-passe.js` — regras das palavras-passe;
- `public/js/regras-email.js` — regras do email;
- `public/js/regras-nomes.js` — regras do nome e do @nome (as mesmas no browser e no servidor);
- `public/js/comum/campos.js` — campos com os erros a vermelho enquanto se escreve;
- `public/js/paginas/registar.js`, `login.js`, `recuperar.js`, `repor.js`, `confirmar-email.js` — as páginas.

## Cenários de uso
- O utilizador cria conta e confirma o email;
- O utilizador entra com o Google;
- O utilizador esquece a palavra-passe e recebe o link no email;
- O utilizador tenta abrir uma página privada sem sessão e é levado ao login;
- O utilizador tenta entrar com credenciais erradas.

## Resultado esperado
O utilizador consegue criar uma conta verdadeira, entrar, recuperar o acesso e navegar no sistema de forma segura e controlada.
