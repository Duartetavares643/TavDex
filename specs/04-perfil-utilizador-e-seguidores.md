# Perfil do utilizador e seguidores

## Objetivo
Cada utilizador tem um perfil pessoal no TavDex, onde mostra a sua identidade, os seus gostos e a sua atividade. A comunidade é reforçada pela possibilidade de seguir outros utilizadores.

## Dados do perfil
O perfil inclui:
- nome e @nome de utilizador;
- foto (ou a inicial, na cor do avatar escolhida);
- banner: um de 5 cenários de cinema desenhados (animados) ou uma imagem própria;
- biografia e localização;
- até 3 géneros favoritos;
- data em que entrou no TavDex;
- papel (os administradores têm a etiqueta "Admin").

## Edição do perfil (Definições → Perfil)
Na página de Definições o utilizador pode:
- carregar uma foto e recortá-la (arrastar e zoom);
- carregar uma imagem para o banner e recortá-la, ou escolher um dos cenários;
- escolher a cor do avatar;
- mudar o nome, o @nome, a localização e a biografia;
- escolher até 3 géneros favoritos (também ajudam as recomendações);
- escolher a privacidade: mostrar ou esconder as listas e os seguidores;
- ligar ou desligar as notificações por email.

Uma pré-visualização mostra ao vivo como os outros vão ver o perfil. Se tentar sair com alterações por guardar, aparece um aviso.

Regras de validação:
- O nome só aceita letras, espaços, hífen e apóstrofo;
- O @nome tem 3 a 30 caracteres (letras, números, `_` e `.`), só pode mudar uma vez a cada 30 dias e o antigo continua a levar ao perfil durante 30 dias;
- As imagens têm de ser JPG, PNG ou WebP até 5 MB. O servidor confirma pelo conteúdo que são imagens e reduz o tamanho (foto 256×256, banner 1500×500).

## Conta e segurança (Definições → Conta e segurança)
- Resumo da proteção da conta (email confirmado, força da palavra-passe, Google ligado, sessões);
- Mudar o email: o novo só passa a valer depois de confirmado pelo link, e o antigo recebe um aviso;
- Alterar a palavra-passe (com a atual) ou definir uma, nas contas criadas com o Google;
- Ligar ou desligar a conta Google;
- Ver e terminar as sessões ativas noutros dispositivos;
- Ver a atividade recente da conta;
- Apagar a conta (pede a palavra-passe e o @nome escrito).

## Seguidores
- Seguir e deixar de seguir outro utilizador;
- Quem é seguido recebe uma notificação;
- O perfil mostra a etiqueta "Segue-te" quando a pessoa nos segue;
- A relação fica na tabela `seguidores`, com chave primária composta (seguidor, seguido).

## Perfil público
O perfil público (`/perfil/<@nome>`) mostra:
- banner, avatar, nome, @nome, localização e biografia;
- números: seguidores, a seguir, avaliações, vistos e projetos;
- separadores: Resumo (média das estrelas, distribuição de 1 a 5 e géneros mais avaliados), Favoritos, Avaliações, Seguidores, A seguir, A ver, Vistos e Projetos;
- botões Seguir, Mensagem e Partilhar.

A privacidade é respeitada pela própria API: quem não tem permissão não recebe as listas escondidas. As listas de seguidores mostram 20 de cada vez ("Ver mais").

## Ficheiros associados
- `routes/utilizadores/` — `perfil-publico.js` (perfil e seguir), `definicoes.js` (Definições, email, palavra-passe, apagar conta) e `fotos-e-sessoes.js` (foto, banner e sessões);
- `routes/fotos.js` — validação e redução das imagens;
- `public/js/paginas/perfil.js` e `definicoes.js` (com `definicoes/separador-perfil.js`, `separador-seguranca.js` e `recortar-imagem.js`) — as páginas;
- `public/js/comum/cabecalho-perfil.js` — o cartão do perfil (banner, avatar, nome e números);
- `public/js/banner/` — os cenários do banner (SVG animado): um ficheiro por cenário e o `motor.js`.

## Casos de uso
- O utilizador atualiza o perfil e escolhe um banner;
- O utilizador muda a palavra-passe;
- O utilizador segue outro membro da comunidade;
- O utilizador esconde as suas listas dos outros;
- O utilizador apaga a conta depois de confirmar.

## Resultado esperado
Cada utilizador tem um perfil pessoal completo, com controlo sobre a sua identidade, a sua privacidade e as suas interações dentro da plataforma.
