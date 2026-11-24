<?php
// Passo 5 – Página de registo
//  · nome, @nome, email e palavra-passe com as regras de segurança (contas.php);
//  · a conta só fica ativa depois de confirmar o email pelo link (confirmar_email.php);
//  · também se pode criar a conta com o Google (google.php).
require 'lib.php';
if (eu()) ir('index.php');

$erros = [];
$nome = $email = $nome_exibicao = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verificar_csrf();
    $nome_exibicao = mb_substr(preg_replace('/\s+/', ' ', campo('nome_exibicao')), 0, 50);
    $nome = campo('nome');
    $email = mb_strtolower(campo('email'));
    $pass = $_POST['password'] ?? '';
    $pass2 = $_POST['password2'] ?? '';

    // Validações
    if ($nome_exibicao !== '' && !preg_match('/^[\p{L}][\p{L} \'.-]{1,49}$/u', $nome_exibicao)) $erros[] = 'O nome só pode ter letras e espaços (2 a 50 caracteres).';
    if (!preg_match('/^[A-Za-z0-9_.]{3,20}$/', $nome)) $erros[] = 'O nome de utilizador deve ter 3 a 20 caracteres (letras, números, _ ou .).';
    if ($erro = erro_email($email)) $erros[] = $erro;
    if (!$erros && valor('SELECT COUNT(*) FROM utilizadores WHERE nome = ?', [$nome])) $erros[] = 'Esse nome de utilizador já existe.';
    if (!$erros && valor('SELECT COUNT(*) FROM utilizadores WHERE email = ? OR email_pendente = ?', [$email, $email])) $erros[] = 'Já existe uma conta com esse email.';
    if (!$erros && ($erro = erro_palavra_passe($pass, ['nome' => $nome, 'nome_exibicao' => $nome_exibicao, 'email' => $email]))) $erros[] = $erro;
    if (!$erros && $pass !== $pass2) $erros[] = 'As palavras-passe não coincidem.';
    if (!isset($_POST['termos'])) $erros[] = 'Para criar a conta tens de aceitar os termos e as regras da comunidade.';
    // Anti-spam: armadilha para robôs e, no site inteiro, no máximo 20 contas novas em 10 minutos
    if (caiu_na_armadilha()) $erros[] = 'Não foi possível criar a conta.';
    elseif (!$erros && (int)valor('SELECT COUNT(*) FROM utilizadores WHERE criado_em >= ?', [date('Y-m-d H:i:s', time() - 600)]) >= 20) $erros[] = 'Há muitos registos neste momento. Tenta outra vez daqui a alguns minutos.';

    if (!$erros) {
        limpar_contas_por_confirmar();
        sql('INSERT INTO utilizadores (nome, nome_exibicao, email, password_hash, cor, criado_em) VALUES (?, ?, ?, ?, ?, ?)',
            [$nome, $nome_exibicao ?: null, $email, password_hash($pass, PASSWORD_DEFAULT), random_int(0, 359), agora()]);
        $novo = linha('SELECT * FROM utilizadores WHERE id = ?', [bd()->lastInsertId()]);
        // A conta só entra depois de confirmar o email
        $_SESSION['por_confirmar'] = (int)$novo['id'];
        enviar_confirmacao($novo, $email, 'registo');
        ir('confirmar_email.php');
    }
}

$titulo = 'Criar conta';
$com_regras = true;   // regras da palavra-passe e do email ao vivo (rodape.php)
require 'cabecalho.php';
?>
<div class="content"><div class="left"><div class="authx">
  <div class="brand"><img src="logo.png" alt="TavDex"><h2>Descobre. Organiza. Avalia.</h2><p>Junta-te à comunidade.</p></div>
  <form method="post" class="fm" novalidate>
    <h1>Criar conta</h1>
    <?php foreach ($erros as $er): ?><p class="msg"><?= e($er) ?></p><?php endforeach; ?>
    <?= botao_google('Criar conta com o Google') ?>
    <div class="sep-ou">ou</div>
    <?= campo_csrf() ?><?= campo_armadilha() ?>
    <input name="nome_exibicao" value="<?= e($nome_exibicao) ?>" placeholder="Nome (ex.: Duarte Tavares)" maxlength="50" autocomplete="name" data-pessoal="nome_exibicao">
    <input name="nome" value="<?= e($nome) ?>" placeholder="Nome de utilizador (@nome)" required maxlength="20" autocomplete="username" data-pessoal="nome">
    <input type="email" name="email" value="<?= e($email) ?>" placeholder="Email" required autocomplete="email" data-email data-pessoal="email">
    <small class="nota-campo" data-sugestao-email></small>
    <div class="campo-pw"><input type="password" name="password" placeholder="Palavra-passe" required minlength="10" autocomplete="new-password" data-pw-nova><button type="button" class="ver-pw" data-ver-pw>Ver</button></div>
    <?= lista_requisitos() ?>
    <div class="campo-pw"><input type="password" name="password2" placeholder="Repetir palavra-passe" required autocomplete="new-password" data-pw-repetir><button type="button" class="ver-pw" data-ver-pw>Ver</button></div>
    <small class="nota-campo" data-pw-iguais></small>
    <label class="chk"><input type="checkbox" name="termos" required> Li e aceito os <a class="lk" href="termos.php" target="_blank">termos e regras da comunidade</a> e a <a class="lk" href="privacidade.php" target="_blank">política de privacidade</a>.</label>
    <button class="btn primary">Registar</button>
    <small>Já tens conta? <a href="login.php" class="lk">Entrar</a></small>
  </form>
</div></div></div>
<?php require 'rodape.php'; ?>
