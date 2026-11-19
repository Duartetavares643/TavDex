// =====================================================================
//  Campos do formulário de projeto, usados ao criar e ao editar.
//  (As mesmas listas existem no servidor, que valida tudo outra vez.)
// =====================================================================
const TIPOS_PROJETO = ['Filme', 'Série', 'Curta-metragem', 'Documentário', 'Videoclipe'];
const ESTADOS_PROJETO = ['Ideia', 'Recrutamento', 'Pré-produção', 'Em produção', 'Concluído'];

// HTML dos campos (vazios ao criar; com os valores de "p" ao editar)
function camposProjeto(p = {}) {
  const opcoes = (lista, atual) => lista.map(x => `<option ${x === atual ? 'selected' : ''}>${esc(x)}</option>`).join('');
  return `
    <label>Título<input name="titulo" value="${esc(p.titulo || '')}" required minlength="2" maxlength="100"></label>
    <label>Sinopse<textarea name="sinopse" required minlength="10" maxlength="2000" rows="5">${esc(p.sinopse || '')}</textarea></label>
    <div class="row2">
      <label>Tipo<select name="tipo">${opcoes(TIPOS_PROJETO, p.tipo)}</select></label>
      <label>Estado<select name="estado">${opcoes(ESTADOS_PROJETO, p.estado || 'Ideia')}</select></label>
      <label>Género<input name="genero" value="${esc(p.genero || '')}" maxlength="60" placeholder="ex.: Drama"></label>
    </div>`;
}
