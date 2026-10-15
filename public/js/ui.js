/**
 * ALLMARKET — Utilitários de UI
 * Funções de apoio para manipulação de DOM, formatação e feedback visual.
 */

const UI = (() => {

  // ── Loading / Scanner ────────────────────────────────────

  let _loadingCount = 0;

  function showLoading() {
    _loadingCount++;
    const el = document.getElementById('loading-overlay');
    if (el) el.classList.remove('hidden');
  }

  function hideLoading() {
    _loadingCount = Math.max(0, _loadingCount - 1);
    if (_loadingCount === 0) {
      const el = document.getElementById('loading-overlay');
      if (el) el.classList.add('hidden');
    }
  }

  // ── Snackbar (Toast) ─────────────────────────────────────

  let _snackTimer = null;

  function showSnack(message, duration = 3000) {
    const el = document.getElementById('snackbar');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    if (_snackTimer) clearTimeout(_snackTimer);
    _snackTimer = setTimeout(() => el.classList.remove('show'), duration);
  }

  // ── Modal de Confirmação ─────────────────────────────────

  /**
   * Exibe um dialog de confirmação e retorna uma Promise<boolean>.
   * @param {{ title: string, message: string, confirmLabel?: string, cancelLabel?: string }} opts
   */
  function confirm(opts) {
    return new Promise(resolve => {
      const existing = document.getElementById('confirm-modal');
      if (existing) existing.remove();

      const backdrop = document.createElement('div');
      backdrop.id = 'confirm-modal';
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML = `
        <div class="modal-box" role="dialog" aria-modal="true">
          <h3>${escHtml(opts.title || 'Confirmar')}</h3>
          <p>${escHtml(opts.message || '')}</p>
          <div class="modal-actions">
            <button class="btn btn-outline btn-sm" id="modal-cancel">
              ${escHtml(opts.cancelLabel || 'Cancelar')}
            </button>
            <button class="btn btn-danger btn-sm" id="modal-confirm">
              ${escHtml(opts.confirmLabel || 'Confirmar')}
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(backdrop);

      const close = (val) => {
        backdrop.remove();
        resolve(val);
      };

      backdrop.querySelector('#modal-confirm').addEventListener('click', () => close(true));
      backdrop.querySelector('#modal-cancel').addEventListener('click', () => close(false));
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(false); });
    });
  }

  // ── Formatação ───────────────────────────────────────────

  /** Formata número para moeda BRL */
  function formatCurrency(value) {
    if (value == null) return 'R$ 0,00';
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  /** Formata data ISO / "DD/MM/YYYY HH:mm:ss" de forma legível */
  function formatDate(dateStr) {
    if (!dateStr) return '';
    // Já está no formato dd/mm/yyyy hh:mm:ss
    if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) return dateStr.slice(0, 10);
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch (_) {
      return dateStr;
    }
  }

  /** Formata CNPJ: 00.000.000/0000-00 */
  function formatCNPJ(cnpj) {
    if (!cnpj) return '';
    const d = cnpj.replace(/\D/g, '');
    if (d.length !== 14) return cnpj;
    return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
  }

  /** Escapa HTML para evitar XSS */
  function escHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Retorna ícone da categoria */
  function iconForCategoria(categoria) {
    return Config.CATEGORIA_ICONS[categoria] || Config.CATEGORIA_ICONS['OUTROS'];
  }

  // ── DOM Helpers ──────────────────────────────────────────

  /** Cria elemento com classes e atributos de forma conveniente */
  function el(tag, opts = {}) {
    const elem = document.createElement(tag);
    if (opts.className) elem.className = opts.className;
    if (opts.html) elem.innerHTML = opts.html;
    if (opts.text) elem.textContent = opts.text;
    if (opts.attrs) Object.entries(opts.attrs).forEach(([k,v]) => elem.setAttribute(k,v));
    if (opts.on) Object.entries(opts.on).forEach(([ev,fn]) => elem.addEventListener(ev,fn));
    return elem;
  }

  /** Limpa o conteúdo de um elemento */
  function clear(elem) {
    if (typeof elem === 'string') elem = document.getElementById(elem);
    if (elem) elem.innerHTML = '';
  }

  /** Faz scroll suave até um elemento */
  function scrollTo(elemOrId) {
    const elem = typeof elemOrId === 'string' ? document.getElementById(elemOrId) : elemOrId;
    if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return {
    showLoading,
    hideLoading,
    showSnack,
    confirm,
    formatCurrency,
    formatDate,
    formatCNPJ,
    escHtml,
    iconForCategoria,
    el,
    clear,
    scrollTo,
  };
})();

// Plugar o LoadingService ao UI
const LoadingService = {
  show: UI.showLoading,
  hide: UI.hideLoading,
};
