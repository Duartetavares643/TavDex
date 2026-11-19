// =====================================================================
//  Definições (Passo 10) – só o próprio utilizador
//  Pede os dados, desenha os dois separadores e liga-os. Cada separador está
//  no seu ficheiro, em js/paginas/definicoes/:
//    separador-perfil.js     foto, banner, nome, @nome, biografia, géneros, privacidade
//    separador-seguranca.js  email, palavra-passe, Google, sessões, atividade, apagar conta
//    recortar-imagem.js      janela para recortar a foto e a imagem do banner
//  Dados: GET /api/utilizadores/eu/definicoes
// =====================================================================
(async () => {
  const u = await sessao;
  if (!u) return irLogin();
  let d;
  try {
    d = await api('/api/utilizadores/eu/definicoes');
  } catch (e) {
    return mostrarErro(e.message);
  }

  mostrar(`<div class="content"><div class="left narrow">
    <h1 class="ph">Definições</h1>
    <div class="tabsbox">
      <div class="tabs"><button data-tab="perfil" class="on">Perfil</button><button data-tab="seguranca">Conta e segurança</button></div>

      ${htmlSeparadorPerfil(d)}

      ${htmlSeparadorSeguranca(d)}
    </div></div></div>`);

  // Abre o separador pedido: ?tab=seguranca (ou o antigo #conta)
  if (location.hash === '#conta') history.replaceState(null, '', '?tab=seguranca');
  abrirSeparadorDoEndereco();

  ligarSeparadorPerfil(d);
  ligarSeparadorSeguranca(d);
})();
