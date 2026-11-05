# Perfil do utilizador e seguidores

## Objetivo
Cada utilizador tem um perfil pessoal dentro do TavDex, onde mostra a sua identidade, preferências, localização e atividade. A comunidade também é reforçada pela possibilidade de seguir outros utilizadores.

## Dados do perfil
O perfil inclui:
- nome de utilizador;
- email;
- biografia;
- localização;
- cor do avatar;
- preferências de email;
- papel e estado da conta.

Os utilizadores podem editar os seus dados e alterar a password, bem como apagar a conta, quando aplicável.

## Funcionalidades de edição
A página editar_perfil.php permite:
- alterar nome, email e bio;
- definir localização;
- escolher a cor do avatar;
- habilitar ou desabilitar notificações por email;
- alterar a password;
- apagar a conta após confirmação.

Foram definidas regras de validação, como:
- username válido com 3 a 20 caracteres;
- email válido;
- password com letras e números e tamanho mínimo;
- confirmação de password para alterar ou apagar conta.

## Seguidores
A funcionalidade de seguidores permite:
- seguir outro utilizador;
- deixar de seguir;
- receber notificação quando começarem a seguir.

A relação é armazenada na tabela seguidores, com chave primária composta por seguidor e seguido.

## Perfil público
O perfil público mostra:
- avatar e nome do utilizador;
- bio e localização;
- informação sobre atividade e listas;
- botão para seguir ou deixar de seguir;
- ligação para chat privado, quando relevante.

## Notificações relacionadas
Ao seguir um utilizador ou receber uma nova interação, o sistema pode criar notificações para o utilizador alvo. Isso reforça a componente social do projecto.

## Casos de uso
- O utilizador faz atualização do perfil;
- O utilizador mudar a palavra-passe;
- O utilizador procura seguir um utilizador da comunidade;
- O utilizador remove a sua conta após validação da password;
- O utilizador visualiza o perfil de outra pessoa e interage diretamente.

## Resultado esperado
Cada utilizador tem um perfil pessoal completo, com gestão própria da sua identidade e interações sociais dentro da plataforma.
