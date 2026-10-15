/**
 * ALLMARKET — Página: Comparador de Preços
 * Espelha o comparador_mfe do projeto Angular.
 * Achata os itens de todas as notas e permite busca por nome.
 */

const PageComparador = (() => {
  let _todos = [];   // todos os itens achatados
  let _termo = '';

  // ── Inicialização ────────────────────────────────────────

  async function init() {
    _bindSearch();
    const email = AuthService.getEmail();
    if (!email) return;
    try {
      const notas = await ApiService.getHistorico(email);
      _todos = _achatarItens(notas || []);
      _render();
    } catch (err) {
      UI.showSnack('Erro ao carregar comparador: ' + err.message);
    }
  }

  // ── Achatamento ──────────────────────────────────────────

  function _achatarItens(notas) {
    const resultado = [];
    notas.forEach(nota => {
      const loja = nota.estabelecimento?.nome_fantasia ||
                   nota.estabelecimento?.nome ||
                   'Desconhecido';
      const data = UI.formatDate(nota.data_emissao);
      (nota.itens || []).forEach(item => {
        resultado.push({
          nome:  item.nome || '',
          loja,
          preco: item.preco_unitario || 0,
          precoTotal: item.preco_total || 0,
          data,
        });
      });
    });
    // Ordena pelo menor preço unitário
    resultado.sort((a, b) => a.preco - b.preco);
    return resultado;
  }

  // ── Busca ────────────────────────────────────────────────

  function _bindSearch() {
    const input = document.getElementById('comparador-search');
    if (!input || input.dataset.bound) return;
    input.dataset.bound = 'true';
    input.addEventListener('input', () => {
      _termo = input.value.trim().toLowerCase();
      _render();
    });
  }

  function _filtrar() {
    if (_termo.length < 2) return [];
    return _todos.filter(i => i.nome.toLowerCase().includes(_termo));
  }

  // ── Renderização ─────────────────────────────────────────

  function _render() {
    const grid = document.getElementById('comparador-grid');
    if (!grid) return;

    if (_todos.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <span class="material-icons">manage_search</span>
          <p>Sem itens para comparar</p>
          <span>Adicione notas fiscais para comparar preços dos produtos.</span>
        </div>`;
      return;
    }

    if (_termo.length < 2) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <span class="material-icons">search</span>
          <p>Digite ao menos 2 caracteres</p>
          <span>Busque por um produto para comparar os preços nas suas compras.</span>
        </div>`;
      return;
    }

    const resultados = _filtrar();

    if (resultados.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <span class="material-icons">find_in_page</span>
          <p>Nenhum produto encontrado</p>
          <span>Tente outro termo de busca.</span>
        </div>`;
      return;
    }

    grid.innerHTML = resultados.map(item => `
      <div class="comparador-item-card animate-in">
        <div class="cmp-nome">${UI.escHtml(item.nome)}</div>
        <div class="cmp-loja">${UI.escHtml(item.loja)}</div>
        <div class="cmp-preco">${UI.formatCurrency(item.preco)}<span style="font-size:11px;font-weight:400;color:var(--color-text-muted)"> / un</span></div>
        <div class="cmp-data">${UI.escHtml(item.data)}</div>
      </div>
    `).join('');
  }

  function reset() {
    _todos = [];
    _termo = '';
    const grid = document.getElementById('comparador-grid');
    if (grid) grid.innerHTML = '';
    const input = document.getElementById('comparador-search');
    if (input) input.value = '';
  }

  return { init, reset };
})();
