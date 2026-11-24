<?php
// Campos do formulário de projeto, usados ao criar (passo 11) e ao editar (passo 12).
// Precisa de $dados (valores atuais) e de $erros.
$tipos = ['Filme', 'Série', 'Curta-metragem', 'Documentário', 'Videoclipe'];
$estados = ['Ideia', 'Recrutamento', 'Pré-produção', 'Em produção', 'Concluído'];

/** Valida os campos do formulário e devolve os valores limpos. */
function validar_projeto(array &$erros): array
{
    global $tipos, $estados;
    $d = [
        'titulo' => mb_substr(campo('titulo'), 0, 100),
        'sinopse' => mb_substr(campo('sinopse'), 0, 2000),
        'tipo' => campo('tipo'),
        'genero' => mb_substr(campo('genero'), 0, 60),
        'estado' => campo('estado'),
    ];
    if (mb_strlen($d['titulo']) < 2) $erros[] = 'Indica o título do projeto.';
    if (mb_strlen($d['sinopse']) < 10) $erros[] = 'Escreve uma sinopse com pelo menos 10 caracteres.';
    if (!in_array($d['tipo'], $tipos, true)) $erros[] = 'Escolhe o tipo de projeto.';
    if (!in_array($d['estado'], $estados, true)) $erros[] = 'Escolhe o estado do projeto.';
    return $d;
}

function campos_projeto(array $dados): void
{
    global $tipos, $estados; ?>
    <label>Título<input name="titulo" value="<?= e($dados['titulo'] ?? '') ?>" required maxlength="100"></label>
    <label>Sinopse<textarea name="sinopse" required maxlength="2000" rows="4"><?= e($dados['sinopse'] ?? '') ?></textarea></label>
    <div class="row2">
      <label>Tipo<select name="tipo"><?php foreach ($tipos as $t): ?><option <?= ($dados['tipo'] ?? '') === $t ? 'selected' : '' ?>><?= $t ?></option><?php endforeach; ?></select></label>
      <label>Estado<select name="estado"><?php foreach ($estados as $s): ?><option <?= ($dados['estado'] ?? 'Ideia') === $s ? 'selected' : '' ?>><?= $s ?></option><?php endforeach; ?></select></label>
    </div>
    <label>Género(s)<input name="genero" value="<?= e($dados['genero'] ?? '') ?>" maxlength="60" placeholder="Ex.: Drama · Mistério"></label>
<?php }
