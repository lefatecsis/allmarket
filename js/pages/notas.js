/**
 * ALLMARKET — Página: Histórico de Notas Fiscais
 * Espelha o notas_mfe (home + nota-detalhes) do projeto Angular.
 */

const PageNotas = (() => {
  let _notas = [];
  let _filtradas = [];
  let _pagina = 0;
  let _notaAberta = null;

  // ── Inicialização ────────────────────────────────────────

  function init() {
    _bindSearch();
    _bindProcessar();
    _load();
  }

  async function _load() {
    const email = AuthService.getEmail();
    if (!email) return;
    try {
      _notas = await ApiService.getHistorico(email);
      _filtradas = [..._notas];
      _pagina = 0;
      _render();

      // Verifica se há uma nota para abrir automaticamente
      const chaveFocus = localStorage.getItem(Config.STORAGE.NOTA_FOCUS);
      if (chaveFocus) {
        localStorage.removeItem(Config.STORAGE.NOTA_FOCUS);
        const nota = _notas.find(n => n.chave === chaveFocus);
        if (nota) _abrirDetalhes(nota);
      }
    } catch (err) {
      UI.showSnack('Erro ao carregar notas: ' + err.message);
    }
  }

  // ── Filtragem ────────────────────────────────────────────

  function _bindSearch() {
    const input = document.getElementById('notas-search');
    if (!input || input.dataset.bound) return;
    input.dataset.bound = 'true';
    input.addEventListener('input', () => {
      const termo = input.value.trim().toLowerCase();
      if (termo.length < 1) {
        _filtradas = [..._notas];
      } else {
        _filtradas = _notas.filter(n => {
          const loja = (n.estabelecimento?.nome_fantasia || n.estabelecimento?.nome || '').toLowerCase();
          return loja.includes(termo);
        });
      }
      _pagina = 0;
      _render();
    });
  }

  // ── Processar Nota ───────────────────────────────────────

  function _bindProcessar() {
    const form = document.getElementById('processar-form');
    const input = document.getElementById('processar-url');
    if (!form || !input || form.dataset.bound) return;
    form.dataset.bound = 'true';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = input.value.trim();
      if (!url.startsWith('http')) {
        UI.showSnack('Por favor, insira um link válido da nota fiscal (URL).');
        return;
      }
      const email = AuthService.getEmail();
      try {
        const nota = await ApiService.processarNota(url, email);
        input.value = '';
        UI.showSnack('Nota processada com sucesso!');
        if (nota && nota.chave) {
          localStorage.setItem(Config.STORAGE.NOTA_FOCUS, nota.chave);
        }
        await _load();
      } catch (err) {
        if (err.status === 409) {
          UI.showSnack('Esta nota já está no seu histórico.');
          const nota = _notas.find(n => n.chave === err.chave);
          if (nota) _abrirDetalhes(nota);
        } else {
          UI.showSnack('Erro: ' + err.message);
        }
      }
    });
  }

  // ── Renderização ─────────────────────────────────────────

  function _render() {
    const grid = document.getElementById('notas-grid');
    const btnMais = document.getElementById('btn-mais-notas');
    if (!grid) return;

    const perPage = window.innerWidth < 768
      ? Config.NOTAS_POR_PAGINA_MOBILE
      : Config.NOTAS_POR_PAGINA_DESKTOP;

    const total = _filtradas.length;
    const exibidas = Math.min((_pagina + 1) * perPage, total);
    const slice = _filtradas.slice(0, exibidas);

    if (total === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <span class="material-icons">receipt_long</span>
          <p>Nenhuma nota encontrada</p>
          <span>Cole o link de uma nota fiscal acima para começar.</span>
        </div>`;
      if (btnMais) btnMais.classList.add('hidden');
      return;
    }

    grid.innerHTML = slice.map(nota => _cardHTML(nota)).join('');

    // Eventos de clique nos cards
    grid.querySelectorAll('.nota-card').forEach(card => {
      card.addEventListener('click', () => {
        const chave = card.dataset.chave;
        const nota = _notas.find(n => n.chave === chave);
        if (nota) _abrirDetalhes(nota, card);
      });
    });

    // Botão "VER MAIS"
    if (btnMais) {
      if (exibidas < total) {
        btnMais.classList.remove('hidden');
        btnMais.onclick = () => { _pagina++; _render(); };
      } else {
        btnMais.classList.add('hidden');
      }
    }
  }

  function _cardHTML(nota) {
    const loja = nota.estabelecimento?.nome_fantasia || nota.estabelecimento?.nome || 'Loja desconhecida';
    const cnpj = UI.formatCNPJ(nota.estabelecimento?.cnpj || '');
    const data = UI.formatDate(nota.data_emissao);
    const valor = UI.formatCurrency(nota.valor_total);
    const qtdItens = (nota.itens || []).length;
    const ativo = _notaAberta?.chave === nota.chave ? 'active' : '';

    return `
      <div class="nota-card ${ativo} animate-in" data-chave="${UI.escHtml(nota.chave)}">
        <div class="card-header-accent"></div>
        <div class="nota-card-body">
          <div class="nota-loja">${UI.escHtml(loja)}</div>
          <div class="nota-cnpj">${UI.escHtml(cnpj)}</div>
          <div class="nota-meta">
            <span class="nota-data">${UI.escHtml(data)}</span>
            <span class="nota-valor">${UI.escHtml(valor)}</span>
          </div>
          <div class="nota-itens-count">
            <span class="material-icons">shopping_cart</span>
            ${qtdItens} ${qtdItens === 1 ? 'item' : 'itens'}
          </div>
        </div>
      </div>`;
  }

  // ── Detalhes ─────────────────────────────────────────────

  function _abrirDetalhes(nota, cardEl) {
    _notaAberta = nota;

    // Atualiza estado visual dos cards
    document.querySelectorAll('.nota-card').forEach(c => c.classList.remove('active'));
    if (cardEl) cardEl.classList.add('active');

    const container = document.getElementById('nota-detalhes');
    if (!container) return;

    container.classList.remove('hidden');
    container.innerHTML = _detalhesHTML(nota);

    // Botão fechar
    container.querySelector('#btn-fechar-detalhes')?.addEventListener('click', () => {
      container.classList.add('hidden');
      document.querySelectorAll('.nota-card').forEach(c => c.classList.remove('active'));
      _notaAberta = null;
    });

    // Botão excluir
    container.querySelector('#btn-excluir-nota')?.addEventListener('click', () => _confirmarExclusao(nota));

    UI.scrollTo(container);
  }

  function _detalhesHTML(nota) {
    const loja = nota.estabelecimento?.nome_fantasia || nota.estabelecimento?.nome || 'Loja desconhecida';
    const endereco = nota.estabelecimento?.endereco || '';
    const cnpj = UI.formatCNPJ(nota.estabelecimento?.cnpj || '');
    const data = UI.formatDate(nota.data_emissao);
    const numero = nota.numero ? `Nº ${nota.numero}` : '';
    const serie = nota.serie ? `Série ${nota.serie}` : '';
    const valor = UI.formatCurrency(nota.valor_total);

    const itensAgrupados = _agruparPorCategoria(nota.itens || []);

    const itensHTML = itensAgrupados.map(({ categoria, itens }) => `
      <div class="categoria-group">
        <div class="categoria-title">
          <span class="material-icons">${UI.iconForCategoria(categoria)}</span>
          ${UI.escHtml(categoria)}
        </div>
        ${itens.map(item => `
          <div class="item-row">
            <span class="item-nome">${UI.escHtml(item.nome)}</span>
            <span class="item-qtd">${item.quantidade} ${UI.escHtml(item.unidade || 'un')}</span>
            <span class="item-preco">${UI.formatCurrency(item.preco_total || item.valor_total)}</span>
          </div>
        `).join('')}
      </div>
    `).join('');

    return `
      <div class="card-header-accent"></div>
      <div class="detalhes-header">
        <div class="detalhes-loja">${UI.escHtml(loja)}</div>
        ${endereco ? `<div class="detalhes-endereco">${UI.escHtml(endereco)}</div>` : ''}
        ${cnpj ? `<div class="detalhes-cnpj">CNPJ: ${UI.escHtml(cnpj)}</div>` : ''}
        <div class="detalhes-meta">
          ${data ? `<div class="detalhes-meta-item">
            <span class="detalhes-meta-label">Data</span>
            <span class="detalhes-meta-val">${UI.escHtml(data)}</span>
          </div>` : ''}
          ${numero ? `<div class="detalhes-meta-item">
            <span class="detalhes-meta-label">Número</span>
            <span class="detalhes-meta-val">${UI.escHtml(numero)}</span>
          </div>` : ''}
          ${serie ? `<div class="detalhes-meta-item">
            <span class="detalhes-meta-label">Série</span>
            <span class="detalhes-meta-val">${UI.escHtml(serie)}</span>
          </div>` : ''}
          <div class="detalhes-meta-item">
            <span class="detalhes-meta-label">Total</span>
            <span class="detalhes-meta-val valor-total">${UI.escHtml(valor)}</span>
          </div>
        </div>
      </div>
      ${nota.chave ? `<div class="detalhes-chave">Chave: ${UI.escHtml(nota.chave)}</div>` : ''}
      <div class="detalhes-itens">
        ${itensHTML || '<p class="text-muted">Sem itens registrados.</p>'}
      </div>
      <div class="detalhes-actions">
        <button class="btn btn-outline btn-sm" id="btn-fechar-detalhes">
          <span class="material-icons" style="font-size:16px">close</span> Fechar
        </button>
        <button class="btn btn-danger btn-sm" id="btn-excluir-nota">
          <span class="material-icons" style="font-size:16px">delete_outline</span> Excluir
        </button>
      </div>`;
  }

  function _agruparPorCategoria(itens) {
    const map = {};
    itens.forEach(item => {
      const cat = item.categoria || 'OUTROS';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });
    const ordered = Object.keys(Config.CATEGORIA_ICONS);
    const result = [];
    ordered.forEach(cat => {
      if (map[cat]) result.push({ categoria: cat, itens: map[cat] });
    });
    // Categorias não mapeadas
    Object.keys(map).forEach(cat => {
      if (!Config.CATEGORIA_ICONS[cat]) result.push({ categoria: cat, itens: map[cat] });
    });
    return result;
  }

  async function _confirmarExclusao(nota) {
    const loja = nota.estabelecimento?.nome_fantasia || nota.estabelecimento?.nome || 'esta nota';
    const ok = await UI.confirm({
      title: 'Excluir nota',
      message: `Deseja remover a nota de "${loja}"? Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    try {
      await ApiService.excluirNota(nota.chave);
      UI.showSnack('Nota removida.');
      document.getElementById('nota-detalhes')?.classList.add('hidden');
      _notaAberta = null;
      await _load();
    } catch (err) {
      UI.showSnack('Erro ao excluir: ' + err.message);
    }
  }

  function reset() {
    _notas = [];
    _filtradas = [];
    _pagina = 0;
    _notaAberta = null;
    const grid = document.getElementById('notas-grid');
    if (grid) grid.innerHTML = '';
    const detalhes = document.getElementById('nota-detalhes');
    if (detalhes) {
      detalhes.innerHTML = '';
      detalhes.classList.add('hidden');
    }
    const search = document.getElementById('notas-search');
    if (search) search.value = '';
    const btnMais = document.getElementById('btn-mais-notas');
    if (btnMais) btnMais.classList.add('hidden');
  }

  return { init, reset };
})();
