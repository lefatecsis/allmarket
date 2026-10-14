/**
 * ALLMARKET — Bootstrap da Aplicação
 * Ponto de entrada principal. Inicializa o roteador e registra handlers de páginas.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── Eventos globais da Navbar ─────────────────────────────

  // Botão de logout
  document.getElementById('btn-logout')?.addEventListener('click', () => AuthService.logout());

  // Tabs da NavBottom
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => Router.navigate(tab.dataset.route));
  });

  // ── Handlers de páginas ───────────────────────────────────

  Router.onEnter('login', () => {
    // Aguarda o GSI SDK carregar (script é async)
    if (typeof google !== 'undefined') {
      AuthService.initGoogleSignIn();
    } else {
      window.addEventListener('load', AuthService.initGoogleSignIn, { once: true });
      // Callback global exigido pelo SDK do Google
      window.handleGoogleCredential = AuthService.handleGoogleCredential;
    }
  });

  Router.onEnter('notas',      () => PageNotas.init());
  Router.onEnter('analise',    () => PageAnalise.init());
  Router.onEnter('comparador', () => PageComparador.init());
  Router.onEnter('listas',     () => PageListas.init());

  // ── Inicia o roteador ─────────────────────────────────────
  Router.init();

  // ── Responsividade: sem comportamento extra necessário ───
  // O botão de processar nota agora vive na navbar e é controlado pelo Router.
});

// Callback global para o Google GSI (deve estar no escopo global)
function handleGoogleCredential(response) {
  AuthService.handleGoogleCredential(response);
}
