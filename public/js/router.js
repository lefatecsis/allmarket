/**
 * ALLMARKET — Roteador SPA
 * Gerencia a navegação entre páginas sem recarregar o browser.
 * Espelha o app.routes.ts do Angular com os guards authGuard/notAuthGuard.
 *
 * Rotas disponíveis:
 *  login     → tela de login
 *  home      → tela inicial (boas-vindas)
 *  notas     → histórico de notas fiscais
 *  analise   → análise e gráficos
 *  comparador → comparador de preços
 *  listas    → lista de compras
 */

const Router = (() => {
  // Mapa de rotas → IDs de páginas no DOM
  const ROUTES = {
    login:      'page-login',
    home:       'page-home',
    notas:      'page-notas',
    analise:    'page-analise',
    comparador: 'page-comparador',
    listas:     'page-listas',
  };

  // Rotas que não exigem autenticação
  const PUBLIC_ROUTES = new Set(['login']);

  // Rotas que exigem estar SEM autenticação (notAuthGuard)
  const UNAUTH_ROUTES = new Set(['login']);

  let _current = null;

  // ── Lifecycle de página ─────────────────────────────────

  const _handlers = {};

  /** Registra um callback chamado quando uma rota é ativada. */
  function onEnter(route, fn) {
    _handlers[route] = fn;
  }

  // ── Navegação ───────────────────────────────────────────

  function navigate(route) {
    // Guards
    if (!PUBLIC_ROUTES.has(route) && !AuthService.isLoggedIn()) {
      route = 'login';
    }
    if (UNAUTH_ROUTES.has(route) && AuthService.isLoggedIn()) {
      route = 'notas';
    }

    if (!ROUTES[route]) {
      console.warn(`Rota desconhecida: "${route}". Redirecionando para home.`);
      route = 'home';
    }

    // Oculta todas as páginas
    Object.values(ROUTES).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });

    // Mostra a página alvo
    const target = document.getElementById(ROUTES[route]);
    if (target) {
      target.classList.remove('hidden');
      target.scrollTop = 0;
    }

    _current = route;
    _updateNavState(route);
    history.pushState({ route }, '', `#${route}`);

    // Chama o handler da rota (se houver)
    if (_handlers[route]) {
      _handlers[route]();
    }
  }

  function current() {
    return _current;
  }

  // ── Atualiza estado da Navbar ───────────────────────────

  function _updateNavState(route) {
    const isAuth = AuthService.isLoggedIn();
    const appContainer = document.getElementById('app');

    // Navbar só aparece em rotas autenticadas
    const navElements = ['nav-top', 'nav-bottom'];
    navElements.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (!isAuth) {
        el.classList.add('hidden');
      } else {
        el.classList.remove('hidden');
      }
    });

    // #nav-processar agora é sempre oculto (form vive no modal)
    const navProcessar = document.getElementById('nav-processar');
    if (navProcessar) navProcessar.style.display = 'none';

    // Classe no app-container para ajuste de padding-top
    if (appContainer) {
      appContainer.className = '';
      if (!isAuth) {
        appContainer.classList.add('app-container');
      } else if (route === 'home') {
        appContainer.classList.add('app-container', 'layout-only-top');
      } else {
        appContainer.classList.add('app-container', 'layout-with-nav');
      }
    }

    // Atualiza tab ativo na NavBottom
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.route === route);
    });

    // Botão "+" central: só visível na rota listas
    const btnAddItem = document.getElementById('nav-btn-add-item');
    if (btnAddItem) {
      if (route === 'listas') {
        btnAddItem.classList.remove('hidden');
      } else {
        btnAddItem.classList.add('hidden');
        _closeAddItemModal();
      }
    }

    // Botão "colar nota" central: só visível na rota notas
    const btnProcessar = document.getElementById('nav-btn-processar');
    if (btnProcessar) {
      if (route === 'notas') {
        btnProcessar.classList.remove('hidden');
      } else {
        btnProcessar.classList.add('hidden');
        _closeProcessarModal();
      }
    }

    // Atualiza nome do usuário na NavTop
    const userNameEl = document.getElementById('nav-user-name');
    if (userNameEl && isAuth) {
      const user = AuthService.getUser();
      userNameEl.textContent = user ? (user.given_name || user.name || '') : '';
    }
  }

  // ── Modal "Processar Nota" ──────────────────────────────

  function _closeProcessarModal() {
    const modal    = document.getElementById('modal-processar');
    const backdrop = document.getElementById('modal-processar-backdrop');
    if (modal)    modal.classList.add('hidden');
    if (backdrop) backdrop.classList.add('hidden');
  }

  function _initProcessarModal() {
    const btn      = document.getElementById('nav-btn-processar');
    const modal    = document.getElementById('modal-processar');
    const backdrop = document.getElementById('modal-processar-backdrop');
    const input    = document.getElementById('processar-url');

    if (!btn || !modal || !backdrop) return;

    btn.addEventListener('click', () => {
      const isOpen = !modal.classList.contains('hidden');
      if (isOpen) {
        _closeProcessarModal();
      } else {
        modal.classList.remove('hidden');
        backdrop.classList.remove('hidden');
        if (input) { input.value = ''; input.focus(); }
      }
    });

    backdrop.addEventListener('click', _closeProcessarModal);

    // Fecha ao submeter o form
    const form = document.getElementById('processar-form');
    if (form) {
      form.addEventListener('submit', () => {
        setTimeout(_closeProcessarModal, 80);
      });
    }
  }

  // ── Modal "Adicionar Item" ──────────────────────────────

  function _closeAddItemModal() {
    const modal    = document.getElementById('modal-add-item');
    const backdrop = document.getElementById('modal-add-item-backdrop');
    if (modal)    modal.classList.add('hidden');
    if (backdrop) backdrop.classList.add('hidden');
  }

  function _initAddItemModal() {
    const btn      = document.getElementById('nav-btn-add-item');
    const modal    = document.getElementById('modal-add-item');
    const backdrop = document.getElementById('modal-add-item-backdrop');
    const input    = document.getElementById('lista-add-input');

    if (!btn || !modal || !backdrop) return;

    // Renderiza grid de categorias
    _renderCategoriaGrid();

    btn.addEventListener('click', () => {
      const isOpen = !modal.classList.contains('hidden');
      if (isOpen) {
        _closeAddItemModal();
      } else {
        modal.classList.remove('hidden');
        backdrop.classList.remove('hidden');
        _resetCategoriaGrid();
        if (input) { input.value = ''; input.focus(); }
      }
    });

    backdrop.addEventListener('click', _closeAddItemModal);

    // Fecha ao submeter o form
    const form = document.getElementById('lista-add-form');
    if (form) {
      form.addEventListener('submit', () => {
        setTimeout(_closeAddItemModal, 80);
      });
    }
  }

  function _renderCategoriaGrid() {
    const grid = document.getElementById('modal-categoria-grid');
    if (!grid || !Config?.CATEGORIA_ICONS) return;

    grid.innerHTML = Object.entries(Config.CATEGORIA_ICONS).map(([cat, icon]) => `
      <button type="button" class="modal-cat-btn" data-cat="${cat}" aria-pressed="false">
        <span class="material-icons">${icon}</span>
        <span>${cat}</span>
      </button>`).join('');

    grid.querySelectorAll('.modal-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const isSelected = btn.classList.contains('selected');
        grid.querySelectorAll('.modal-cat-btn').forEach(b => {
          b.classList.remove('selected');
          b.setAttribute('aria-pressed', 'false');
        });
        if (!isSelected) {
          btn.classList.add('selected');
          btn.setAttribute('aria-pressed', 'true');
        }
      });
    });
  }

  function _resetCategoriaGrid() {
    const grid = document.getElementById('modal-categoria-grid');
    if (!grid) return;
    grid.querySelectorAll('.modal-cat-btn').forEach(b => {
      b.classList.remove('selected');
      b.setAttribute('aria-pressed', 'false');
    });
  }

  /** Retorna a categoria selecionada no modal, ou string vazia. */
  function getSelectedCategoria() {
    const sel = document.querySelector('#modal-categoria-grid .modal-cat-btn.selected');
    return sel ? sel.dataset.cat : '';
  }

  // ── Inicialização ───────────────────────────────────────

  function init() {
    _initProcessarModal();
    _initAddItemModal();

    // Suporte ao botão Voltar do browser
    window.addEventListener('popstate', (e) => {
      const route = (e.state && e.state.route) || 'login';
      navigate(route);
    });

    // Rota inicial a partir do hash
    const hash = window.location.hash.replace('#', '') || '';
    const initial = ROUTES[hash] ? hash : (AuthService.isLoggedIn() ? 'home' : 'login');
    navigate(initial);
  }

  return { navigate, current, onEnter, init, getSelectedCategoria };
})();
