// Aplica o tema guardado (escuro/claro) ANTES de a página ser desenhada,
// para não haver um "piscar" de cores. Fica no <head> de todas as páginas.
try {
  if (localStorage.getItem('tema') === 'claro') document.documentElement.dataset.tema = 'claro';
} catch (e) { /* sem localStorage: fica o tema escuro */ }
