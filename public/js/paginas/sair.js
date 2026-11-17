// =====================================================================
//  /sair – página com o botão "Terminar sessão"
//  Abrir este endereço (por exemplo a partir de um link ou de uma imagem noutro
//  site) NUNCA termina a sessão: só o botão, que faz POST com o token CSRF.
//  Sem sessão iniciada vai para o início, sem erro.
// =====================================================================
(async () => {
  const u = await sessao;
  if (!u) return location.replace('/');
  mostrar(`<div class="content"><div class="left narrow" style="max-width:520px">
    <div class="box form confirmar-email">
      <img src="/img/logo.png" alt="" class="modal-logo">
      <h1 class="ph">Terminar sessão</h1>
      <p>Tens sessão iniciada como <b>@${esc(u.nome)}</b>. Queres sair do TavDex neste dispositivo?</p>
      <button class="btn primary" type="button" id="sair-agora">Terminar sessão</button>
      <button class="btn ghost" type="button" data-sair-todos>Terminar sessão em todos os dispositivos</button>
      <a class="lk" href="/">Cancelar e voltar ao início</a>
    </div></div></div>`);
  document.getElementById('sair-agora').addEventListener('click', () => terminarSessao(false));
})();
