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

  let _scanStream = null; // MediaStream ativo do scanner

  function _closeProcessarModal() {
    const modal    = document.getElementById('modal-processar');
    const backdrop = document.getElementById('modal-processar-backdrop');
    if (modal)    modal.classList.add('hidden');
    if (backdrop) backdrop.classList.add('hidden');
    _pararScanner();
  }

  function _abrirProcessarModal() {
    const modal   = document.getElementById('modal-processar');
    const backdrop = document.getElementById('modal-processar-backdrop');
    const input   = document.getElementById('processar-url');
    if (!modal || !backdrop) return;
    modal.classList.remove('hidden');
    backdrop.classList.remove('hidden');
    _pararScanner(); // garante que o scanner esteja fechado ao abrir
    if (input) { input.value = ''; setTimeout(() => input.focus(), 80); }
  }

  function _pararScanner() {
    const scanArea = document.getElementById('processar-scanner-area');
    const video    = document.getElementById('processar-video');
    if (_scanStream) {
      _scanStream.getTracks().forEach(t => t.stop());
      _scanStream = null;
    }
    if (video) video.srcObject = null;
    if (scanArea) scanArea.classList.add('hidden');
  }

  async function _iniciarScanner() {
    const scanArea = document.getElementById('processar-scanner-area');
    const video    = document.getElementById('processar-video');
    const input    = document.getElementById('processar-url');
    if (!scanArea || !video) return;

    // Solicita permissão e abre câmera traseira preferencial
    try {
      _scanStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
    } catch (err) {
      UI.showSnack('Sem acesso à câmera: ' + (err.message || err));
      return;
    }

    video.srcObject = _scanStream;
    scanArea.classList.remove('hidden');

    // Tenta usar BarcodeDetector nativo (Chrome/Android moderno)
    if ('BarcodeDetector' in window) {
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      let ativo = true;

      const scanFrame = async () => {
        if (!ativo || !_scanStream) return;
        try {
          const codes = await detector.detect(video);
          if (codes.length > 0) {
            const valor = codes[0].rawValue;
            ativo = false;
            _pararScanner();
            if (input) { input.value = valor; input.dispatchEvent(new Event('input')); }
            UI.showSnack('QR Code lido com sucesso!');
            return;
          }
        } catch (_) {}
        requestAnimationFrame(scanFrame);
      };
      video.addEventListener('loadeddata', () => requestAnimationFrame(scanFrame), { once: true });

    } else {
      // Fallback: carrega jsQR dinamicamente
      if (!window.jsQR) {
        try {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          });
        } catch (_) {
          UI.showSnack('Não foi possível carregar o leitor de QR Code.');
          _pararScanner();
          return;
        }
      }

      const canvas = document.createElement('canvas');
      const ctx    = canvas.getContext('2d');
      let ativo    = true;

      const scanFrame = () => {
        if (!ativo || !_scanStream) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width  = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          if (code) {
            ativo = false;
            _pararScanner();
            if (input) { input.value = code.data; input.dispatchEvent(new Event('input')); }
            UI.showSnack('QR Code lido com sucesso!');
            return;
          }
        }
        requestAnimationFrame(scanFrame);
      };
      requestAnimationFrame(scanFrame);
    }
  }

  function _initProcessarModal() {
    const btn      = document.getElementById('nav-btn-processar');
    const modal    = document.getElementById('modal-processar');
    const backdrop = document.getElementById('modal-processar-backdrop');
    const input    = document.getElementById('processar-url');

    if (!btn || !modal || !backdrop) return;

    // Abre/fecha ao clicar no botão da navbar
    btn.addEventListener('click', () => {
      const isOpen = !modal.classList.contains('hidden');
      if (isOpen) { _closeProcessarModal(); } else { _abrirProcessarModal(); }
    });

    // Botão X dentro do modal
    const btnClose = document.getElementById('modal-processar-close');
    if (btnClose) btnClose.addEventListener('click', _closeProcessarModal);

    // Backdrop fecha o modal
    backdrop.addEventListener('click', _closeProcessarModal);

    // Botão "Colar link" — lê o clipboard e preenche o input
    const btnColar = document.getElementById('btn-colar-link');
    if (btnColar) {
      btnColar.addEventListener('click', async () => {
        try {
          const texto = await navigator.clipboard.readText();
          if (texto && input) {
            input.value = texto.trim();
            input.dispatchEvent(new Event('input'));
            UI.showSnack('Link colado!');
          }
        } catch (_) {
          // Clipboard API bloqueada — foca o input para o usuário colar manualmente
          if (input) { input.focus(); input.select(); }
          UI.showSnack('Toque no campo e cole o link manualmente (Ctrl+V / colar).');
        }
      });
    }

    // Botão "Ler QR Code" — abre câmera
    const btnCamera = document.getElementById('btn-abrir-camera');
    if (btnCamera) {
      btnCamera.addEventListener('click', () => _iniciarScanner());
    }

    // Botão "Cancelar" dentro do scanner
    const btnCancelarScan = document.getElementById('processar-cancelar-scan');
    if (btnCancelarScan) {
      btnCancelarScan.addEventListener('click', _pararScanner);
    }

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
