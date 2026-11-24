<?php
// Política de privacidade (link no rodapé, no registo e na configuração do login com o Google)
require 'lib.php';
$titulo = 'Política de privacidade';
require 'cabecalho.php';
?>
<div class="content"><div class="left narrow">
  <h1 class="ph">Política de privacidade</h1>
  <div class="box texto-legal">
    <p>O TavDex é um projeto escolar (PAP de Técnico de Informática – Sistemas). Esta página explica que dados guardamos e porquê.</p>
    <h3>Que dados guardamos</h3>
    <p>Nome, @nome de utilizador, email, palavra-passe (só em forma cifrada, com <code>password_hash</code>), foto, banner e biografia
      (se os escolheres), as tuas avaliações, listas, projetos, publicações e mensagens.</p>
    <p>Para a segurança da conta guardamos também a data do último login e, se escolheres "Manter sessão iniciada",
      o dispositivo de cada sessão (ex.: "Windows · Chrome").</p>
    <h3>Login com o Google</h3>
    <p>Se entrares com o Google, recebemos apenas o identificador da conta, o email, o nome e a foto. Não temos acesso
      à tua palavra-passe do Google nem a outros dados da tua conta Google.</p>
    <h3>Para que usamos os dados</h3>
    <p>Só para o funcionamento do TavDex: entrar na conta, mostrar o teu perfil, confirmar o teu email, enviar emails de
      recuperação da palavra-passe e notificações (se as ligares). Não vendemos nem partilhamos dados com terceiros.</p>
    <h3>Privacidade do perfil</h3>
    <p>Nas Definições podes esconder dos outros as tuas listas (favoritos, para ver e vistos) e quem segues e te segue.</p>
    <h3>Os teus direitos</h3>
    <p>Podes alterar os teus dados em Definições e apagar a conta a qualquer momento (Definições → Conta e segurança →
      Apagar conta). Ao apagar a conta, todos os teus dados são apagados.</p>
    <h3>Cookies</h3>
    <p>Usamos o cookie da sessão, necessário para entrar na conta, e o cookie de "Manter sessão iniciada", só se o escolheres.
      O tema escuro/claro fica guardado no teu browser.</p>
  </div>
</div></div>
<?php require 'rodape.php'; ?>
