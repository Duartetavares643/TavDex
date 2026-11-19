// =====================================================================
//  Definições – janela para recortar a foto (círculo) e a imagem do banner (3:1)
//  recortarImagem(ficheiro, "foto" | "banner") devolve o JPEG recortado (Blob) ou null.
// =====================================================================
// Recortar uma imagem antes de enviar: a imagem num <canvas> com a zona de recorte.
//  · foto   → círculo, devolve um JPEG quadrado (512×512)
//  · banner → retângulo 3:1, devolve um JPEG 1500×500
// Arrastar (rato ou dedo) move a imagem; a barra (ou a roda do rato, ou + e −) faz zoom;
// as setas do teclado também movem. O servidor continua a validar o conteúdo e a
// reduzir a imagem com o sharp.
// -------------------------------------------------------------------
const RECORTES = {
  foto: {
    titulo: 'Recortar a foto', texto: 'Arrasta a foto para a acertar no círculo e usa o zoom.', usar: 'Usar esta foto',
    tela: [320, 320], zona: [140, 140], circulo: true, saida: [512, 512], classe: '',
  },
  banner: {
    titulo: 'Recortar o banner', texto: 'Arrasta a imagem para escolher a parte que aparece no banner e usa o zoom.', usar: 'Usar esta imagem',
    tela: [360, 200], zona: [170, 170 / 3], circulo: false, saida: [1500, 500], classe: 'banner',
  },
};
// Abre a janela de recorte; devolve o Blob JPEG recortado, ou null se cancelar
function recortarImagem(ficheiro, tipo = 'foto') {
  const cfg = RECORTES[tipo];
  return new Promise(resolve => {
    const url = URL.createObjectURL(ficheiro);
    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(url);
      aviso('Não foi possível abrir essa imagem.', 'erro');
      resolve(null);
    };
    img.onload = () => {
      let resultado = null;
      const janela = abrirJanela(`<div class="modal-in">
          <h2>${cfg.titulo}</h2>
          <p class="modal-txt">${cfg.texto}</p>
          <canvas class="recorte-tela ${cfg.classe ? 'recorte-tela--' + cfg.classe : ''}" width="${cfg.tela[0]}" height="${cfg.tela[1]}" tabindex="0"
            aria-label="Imagem a recortar. Usa as setas para mover e as teclas + e − para o zoom."></canvas>
          <label class="recorte-zoom">Zoom <input type="range" min="1" max="4" step="0.01" value="1"></label>
          <div class="modal-btns">
            <button type="button" class="btn primary" data-usar>${cfg.usar}</button>
            <button type="button" class="btn ghost" data-cancelar>Cancelar</button>
          </div>
        </div>`, {
        classe: 'modal-aviso modal-recorte' + (cfg.classe ? ' modal-recorte--' + cfg.classe : ''),
        aoFechar: () => { URL.revokeObjectURL(url); resolve(resultado); },
      });

      const tela = janela.querySelector('canvas');
      const ctx = tela.getContext('2d');
      const zoomCampo = janela.querySelector('[type=range]');
      const [TL, TA] = cfg.tela;            // tamanho do canvas
      const [RX, RY] = cfg.zona;            // metade da largura e da altura da zona de recorte
      const base = Math.max(2 * RX / img.width, 2 * RY / img.height);   // com zoom 1 a imagem cobre a zona
      let zoom = 1;
      let cx = 0;                           // deslocamento do centro da imagem (px do canvas)
      let cy = 0;

      // A imagem nunca pode deixar a zona de recorte com partes vazias
      function limitar() {
        const meiaL = img.width * base * zoom / 2;
        const meiaA = img.height * base * zoom / 2;
        cx = Math.max(-(meiaL - RX), Math.min(meiaL - RX, cx));
        cy = Math.max(-(meiaA - RY), Math.min(meiaA - RY, cy));
      }
      // Desenha a forma da zona de recorte (círculo ou retângulo) no caminho atual
      function zona() {
        if (cfg.circulo) ctx.arc(TL / 2, TA / 2, RX, 0, Math.PI * 2);
        else ctx.rect(TL / 2 - RX, TA / 2 - RY, 2 * RX, 2 * RY);
      }
      function desenhar() {
        limitar();
        const l = img.width * base * zoom;
        const a = img.height * base * zoom;
        ctx.clearRect(0, 0, TL, TA);
        ctx.drawImage(img, TL / 2 + cx - l / 2, TA / 2 + cy - a / 2, l, a);
        // Escurece tudo menos a zona (regra "evenodd": a zona fica como um buraco)
        ctx.fillStyle = 'rgba(8, 7, 11, .6)';
        ctx.beginPath();
        ctx.rect(0, 0, TL, TA);
        zona();
        ctx.fill('evenodd');
        ctx.strokeStyle = 'rgba(255, 255, 255, .85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        zona();
        ctx.stroke();
      }
      function mudarZoom(novo) {
        zoom = Math.max(1, Math.min(4, novo));
        zoomCampo.value = zoom;
        desenhar();
      }

      // Arrastar com o rato ou com o dedo (pointer events servem para os dois)
      let arrasto = null;
      tela.addEventListener('pointerdown', e => {
        tela.setPointerCapture(e.pointerId);
        arrasto = { x: e.clientX, y: e.clientY };
      });
      tela.addEventListener('pointermove', e => {
        if (!arrasto) return;
        const escala = TL / tela.getBoundingClientRect().width;   // o canvas pode estar mais pequeno no ecrã
        cx += (e.clientX - arrasto.x) * escala;
        cy += (e.clientY - arrasto.y) * escala;
        arrasto = { x: e.clientX, y: e.clientY };
        desenhar();
      });
      const largar = () => { arrasto = null; };
      tela.addEventListener('pointerup', largar);
      tela.addEventListener('pointercancel', largar);
      tela.addEventListener('wheel', e => { e.preventDefault(); mudarZoom(zoom - e.deltaY * 0.002); }, { passive: false });
      tela.addEventListener('keydown', e => {
        const passos = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] };
        if (passos[e.key]) { e.preventDefault(); cx += passos[e.key][0]; cy += passos[e.key][1]; desenhar(); }
        if (e.key === '+' || e.key === '=') { e.preventDefault(); mudarZoom(zoom + 0.1); }
        if (e.key === '-') { e.preventDefault(); mudarZoom(zoom - 0.1); }
      });
      zoomCampo.addEventListener('input', () => mudarZoom(Number(zoomCampo.value)));

      janela.querySelector('[data-cancelar]').addEventListener('click', () => janela.close());
      janela.querySelector('[data-usar]').addEventListener('click', () => {
        // Recorta a zona (o quadrado do círculo, ou o retângulo), na resolução original da imagem
        const escala = base * zoom;
        const l = img.width * escala;
        const a = img.height * escala;
        const sx = (l / 2 - cx - RX) / escala;
        const sy = (a / 2 - cy - RY) / escala;
        const [SL, SA] = cfg.saida;
        const saida = document.createElement('canvas');
        saida.width = SL;
        saida.height = SA;
        saida.getContext('2d').drawImage(img, sx, sy, 2 * RX / escala, 2 * RY / escala, 0, 0, SL, SA);
        saida.toBlob(blob => {
          resultado = blob;
          janela.close();
        }, 'image/jpeg', 0.92);
      });
      desenhar();
      tela.focus();
    };
    img.src = url;
  });
}
