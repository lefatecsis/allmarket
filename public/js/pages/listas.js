/**
 * ALLMARKET — Página: Lista de Compras
 * Espelha o listas_mfe do projeto Angular.
 * Funcionalidades: CRUD de itens, sugestões por notas, compartilhamento de conta,
 * salvar/carregar listas, persistência no Firestore.
 */

const PageListas = (() => {
  // ── Estado ───────────────────────────────────────────────
  let _itens   = [];
  let _listaId = null;
  let _vinculados = [];
  let _listasHistorico = [];
  let _notasHistorico  = [];
  let _painelAberto = null;

  // ── Inicialização ────────────────────────────────────────

  async function init() {
    _bindAddItem();
    _bindSelecionar();
    _bindTabs();
    await Promise.all([_carregarLista(), _carregarVinculos(), _carregarSugestoes()]);
    _renderTudo();
  }

  // ── Carregamento ─────────────────────────────────────────

  async function _carregarLista() {
    const email = AuthService.getEmail();
    try {
      const listas = await ApiService.getListas(email);
      const ativa = (listas || []).find(l => l.ativa);
      if (ativa) {
        _listaId = ativa.id;
        _itens = (ativa.itens || []).map(i => ({ ...i }));
        _listasHistorico = (listas || []).filter(l => !l.ativa);
      } else {
        const raw = localStorage.getItem(Config.STORAGE.LISTA_LOCAL);
        _itens = raw ? JSON.parse(raw) : [];
        _listasHistorico = (listas || []);
      }
    } catch (_) {
      const raw = localStorage.getItem(Config.STORAGE.LISTA_LOCAL);
      _itens = raw ? JSON.parse(raw) : [];
    }
  }

  async function _carregarVinculos() {
    const email = AuthService.getEmail();
    try {
      const emails = await ApiService.getVinculos(email);
      _vinculados = (emails || []).filter(e => e !== email);
    } catch (_) {
      _vinculados = [];
    }
  }

  async function _carregarSugestoes() {
    const email = AuthService.getEmail();
    try {
      _notasHistorico = await ApiService.getHistorico(email) || [];
    } catch (_) {
      _notasHistorico = [];
    }
  }

  // ── Persistência ─────────────────────────────────────────

  async function _persistir() {
    localStorage.setItem(Config.STORAGE.LISTA_LOCAL, JSON.stringify(_itens));
    const email = AuthService.getEmail();
    try {
      const lista = {
        id: _listaId || undefined,
        usuario_email: email,
        nome: 'Lista Ativa',
        itens: _itens,
        ativa: true,
        data_criacao: new Date().toISOString(),
        compartilhada_com: _vinculados,
      };
      const salva = await ApiService.salvarLista(lista);
      if (salva && salva.id) _listaId = salva.id;
    } catch (_) {}
  }

  // ── Bind: abas do painel ─────────────────────────────────

  function _bindTabs() {
    const tabs = document.querySelectorAll('#listas-tab-panel .listas-tab');
    if (!tabs.length || document.querySelector('#listas-tab-panel .listas-tab[data-bound]')) return;

    tabs.forEach(tab => {
      tab.dataset.bound = 'true';
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        const isActive = tab.classList.contains('active');

        // Fecha tudo
        tabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.listas-tab-body').forEach(b => b.classList.add('hidden'));

        // Se não estava ativa, abre
        if (!isActive) {
          tab.classList.add('active');
          const body = document.getElementById(`tab-body-${target}`);
          if (body) body.classList.remove('hidden');
        }
      });
    });
  }

  // ── Bind: form adicionar ──────────────────────────────────

  function _bindAddItem() {
    const form = document.getElementById('lista-add-form');
    const input = document.getElementById('lista-add-input');
    if (!form || !input || form.dataset.bound) return;
    form.dataset.bound = 'true';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = input.value.trim();
      if (!nome) return;
      // Pega a categoria selecionada no modal (exposta pelo Router)
      const categoria = (typeof Router !== 'undefined' && Router.getSelectedCategoria)
        ? Router.getSelectedCategoria()
        : '';
      _addItem(nome, categoria);
      input.value = '';
      input.focus();
    });
  }

  // ── Bind: selecionar tudo + limpar tudo ──────────────────
  // (controles agora vivem dentro do _renderItens — bind feito inline)
  function _bindSelecionar() {}

  // ── CRUD de Itens ────────────────────────────────────────

  function _addItem(nome, categoria) {
    const existe = _itens.some(i => i.nome.toLowerCase() === nome.toLowerCase());
    if (existe) { UI.showSnack(`"${nome}" já está na lista.`); return; }
    _itens.push({ nome, comprado: false, categoria: categoria || '' });
    _persistir();
    _renderItens();
  }

  function _toggleItem(nome) {
    const item = _itens.find(i => i.nome === nome);
    if (item) item.comprado = !item.comprado;
    _persistir();
    _renderItens();
  }

  async function _removerItem(nome) {
    const ok = await UI.confirm({
      title: 'Remover item',
      message: `Remover "${nome}" da lista?`,
      confirmLabel: 'Remover',
    });
    if (!ok) return;
    _itens = _itens.filter(i => i.nome !== nome);
    _persistir();
    _renderItens();
  }

  // ── Sugestões ────────────────────────────────────────────

  function _getSugestoesNotas() {
    const recentes = _notasHistorico.slice(0, 3);
    const nomes = new Set();
    const resultado = [];
    recentes.forEach(nota => {
      const loja = nota.estabelecimento?.nome_fantasia || nota.estabelecimento?.nome || '';
      (nota.itens || []).forEach(item => {
        if (!nomes.has(item.nome)) {
          nomes.add(item.nome);
          resultado.push({ nome: item.nome, categoria: item.categoria, loja });
        }
      });
    });
    return resultado.slice(0, 20);
  }

  async function _salvarComoNova(nome) {
    if (!nome) return;
    const email = AuthService.getEmail();
    try {
      await ApiService.salvarLista({
        usuario_email: email,
        nome,
        itens: _itens,
        ativa: false,
        data_criacao: new Date().toISOString(),
        compartilhada_com: [],
      });
      UI.showSnack(`Lista "${nome}" salva!`);
      await _carregarLista();
      _renderPainelListas();
    } catch (err) {
      UI.showSnack('Erro ao salvar lista: ' + err.message);
    }
  }

  async function _deletarLista(id, nome) {
    const ok = await UI.confirm({
      title: 'Excluir lista',
      message: `Excluir a lista "${nome}"?`,
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    try {
      await ApiService.deletarLista(id);
      UI.showSnack('Lista excluída.');
      await _carregarLista();
      _renderPainelListas();
    } catch (err) {
      UI.showSnack('Erro: ' + err.message);
    }
  }

  function _carregarListaSalva(lista) {
    _itens = (lista.itens || []).map(i => ({ ...i }));
    _persistir();
    _renderItens();
    UI.showSnack(`Lista "${lista.nome}" carregada!`);
  }

  // ── Compartilhamento ─────────────────────────────────────

  async function _vincularEmail(emailVinc) {
    const email = AuthService.getEmail();
    if (!emailVinc || emailVinc === email) { UI.showSnack('E-mail inválido.'); return; }
    try {
      await ApiService.vincularEmail(email, emailVinc);
      UI.showSnack(`Conta ${emailVinc} vinculada!`);
      await _carregarVinculos();
      _renderVinculados();
    } catch (err) {
      UI.showSnack('Erro ao vincular: ' + err.message);
    }
  }

  async function _desvincularEmail(emailVinc) {
    const ok = await UI.confirm({
      title: 'Desvincular conta',
      message: `Desvincular ${emailVinc}?`,
      confirmLabel: 'Desvincular',
    });
    if (!ok) return;
    const email = AuthService.getEmail();
    try {
      await ApiService.desvincularEmail(email, emailVinc);
      _vinculados = _vinculados.filter(e => e !== emailVinc);
      UI.showSnack('Conta desvinculada.');
      _renderVinculados();
    } catch (err) {
      UI.showSnack('Erro: ' + err.message);
    }
  }

  // ── Painel de Seleção Inline ─────────────────────────────

  // ── Painel de Seleção (dentro do acordeon) ───────────────

  function _abrirPainelNota(idx) {
    const nota = _notasHistorico[idx];
    if (!nota) return;
    const itens = (nota.itens || []).map(i => ({ nome: i.nome, categoria: i.categoria || 'OUTROS' }));
    const loja  = nota.estabelecimento?.nome_fantasia || nota.estabelecimento?.nome || '';
    _renderPainelSelecao(itens, loja);
    // Marca chip ativo
    document.querySelectorAll('#sugestoes-scroll .chip').forEach(c => c.classList.remove('chip-ativo'));
    const chip = document.querySelector(`#sugestoes-scroll [data-tipo="nota"][data-idx="${idx}"]`);
    if (chip) chip.classList.add('chip-ativo');
  }

  function _abrirPainelListaSalva(idx) {
    const lista = _listasHistorico[idx];
    if (!lista) return;
    const itens = (lista.itens || []).map(i => ({ nome: i.nome, categoria: i.categoria || 'OUTROS' }));
    _renderPainelSelecao(itens, lista.nome);
    document.querySelectorAll('#sugestoes-scroll .chip').forEach(c => c.classList.remove('chip-ativo'));
    const chip = document.querySelector(`#sugestoes-scroll [data-tipo="lista"][data-idx="${idx}"]`);
    if (chip) chip.classList.add('chip-ativo');
  }

  function _fecharPainel() {
    _painelAberto = null;
    const el = document.getElementById('painel-selecao-acc');
    if (el) el.innerHTML = '';
    document.querySelectorAll('#sugestoes-scroll .chip').forEach(c => c.classList.remove('chip-ativo'));
  }

  function _renderPainelSelecao(itens, titulo) {
    const container = document.getElementById('painel-selecao-acc');
    if (!container) return;

    // Agrupa por categoria
    const grupos = {};
    itens.forEach(item => {
      const cat = (item.categoria || 'OUTROS').toUpperCase();
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(item);
    });
    const cats = Object.keys(grupos).sort((a, b) => {
      if (a === 'OUTROS') return 1;
      if (b === 'OUTROS') return -1;
      return a.localeCompare(b);
    });

    // Divide categorias em duas colunas
    const col1 = cats.filter((_, i) => i % 2 === 0);
    const col2 = cats.filter((_, i) => i % 2 === 1);

    const renderCat = (cat) => `
      <div class="painel-categoria-bloco">
        <div class="painel-cat-titulo">
          <span class="material-icons">${UI.iconForCategoria(cat)}</span>
          ${UI.escHtml(cat)}
        </div>
        ${grupos[cat].map(item => `
          <label class="chip chip-outline painel-item-chip"
            data-nome="${UI.escHtml(item.nome)}"
            data-cat="${UI.escHtml(item.categoria || '')}">
            <input type="checkbox" class="painel-item-chk" aria-label="${UI.escHtml(item.nome)}">
            <span class="material-icons painel-item-icon">add_circle_outline</span>
            ${UI.escHtml(item.nome)}
          </label>`).join('')}
      </div>`;

    container.innerHTML = `
      <div class="painel-selecao-acc">
        <div class="painel-selecao-header">
          <label class="painel-selecionar-tudo-label">
            <input type="checkbox" id="chk-sugestoes-tudo" aria-label="Selecionar tudo">
            <span>Selecionar tudo</span>
          </label>
          <button class="painel-fechar-btn" id="btn-fechar-painel" aria-label="Fechar">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="row g-2 mt-1">
          <div class="col-6">${col1.map(renderCat).join('')}</div>
          <div class="col-6">${col2.map(renderCat).join('')}</div>
        </div>
        <div class="painel-selecao-footer hidden" id="painel-selecao-footer">
          <button class="btn btn-primary btn-sm w-100" id="btn-adicionar-selecionados">
            <span class="material-icons" style="font-size:16px">playlist_add</span>
            Adicionar selecionados
          </button>
        </div>
      </div>`;

    // Fechar
    container.querySelector('#btn-fechar-painel')?.addEventListener('click', _fecharPainel);

    const chips = container.querySelectorAll('.painel-item-chip');

    // Selecionar tudo — mostra/oculta o botão e marca todos
    const chkTudo = container.querySelector('#chk-sugestoes-tudo');
    chkTudo?.addEventListener('change', () => {
      chips.forEach(chip => {
        if (chip.classList.contains('chip-adicionado')) return;
        const chk = chip.querySelector('.painel-item-chk');
        if (chk) chk.checked = chkTudo.checked;
      });
      // Botão aparece só quando "selecionar tudo" está marcado
      const footer = container.querySelector('#painel-selecao-footer');
      if (footer) footer.classList.toggle('hidden', !chkTudo.checked);
    });

    // Cada checkbox — adiciona direto ao clicar (sem botão)
    chips.forEach(chip => {
      const chk = chip.querySelector('.painel-item-chk');
      chk?.addEventListener('change', () => {
        if (!chk.checked) return;
        if (chip.classList.contains('chip-adicionado')) return;
        _addItem(chip.dataset.nome, chip.dataset.cat);
        chip.classList.add('chip-adicionado');
        const icon = chip.querySelector('.painel-item-icon');
        if (icon) icon.textContent = 'check_circle';
        chip.style.pointerEvents = 'none';
        chk.disabled = true;
        // Recalcula estado do "selecionar tudo"
        _atualizarEstadoChkTudo(container);
      });
    });

    // Adicionar selecionados
    container.querySelector('#btn-adicionar-selecionados')?.addEventListener('click', () => {
      let adicionados = 0;
      chips.forEach(chip => {
        if (chip.classList.contains('chip-adicionado')) return;
        const chk = chip.querySelector('.painel-item-chk');
        if (!chk?.checked) return;
        _addItem(chip.dataset.nome, chip.dataset.cat);
        chip.classList.add('chip-adicionado');
        const icon = chip.querySelector('.painel-item-icon');
        if (icon) icon.textContent = 'check_circle';
        chip.style.pointerEvents = 'none';
        chk.disabled = true;
        adicionados++;
      });
      if (adicionados > 0) {
        if (chkTudo) { chkTudo.checked = false; chkTudo.indeterminate = false; }
        const footer = container.querySelector('#painel-selecao-footer');
        if (footer) footer.classList.add('hidden');
        UI.showSnack(`${adicionados} ${adicionados === 1 ? 'item adicionado' : 'itens adicionados'}!`);
      }
    });
  }

  function _atualizarEstadoChkTudo(container) {
    const chkTudo  = container.querySelector('#chk-sugestoes-tudo');
    const footer   = container.querySelector('#painel-selecao-footer');
    const todos    = [...container.querySelectorAll('.painel-item-chk:not(:disabled)')];
    const marcados = todos.filter(c => c.checked);

    if (chkTudo) {
      chkTudo.checked       = todos.length > 0 && marcados.length === todos.length;
      chkTudo.indeterminate = marcados.length > 0 && marcados.length < todos.length;
    }

    if (footer) {
      footer.classList.toggle('hidden', marcados.length === 0);
    }
  }

  // ── Render ───────────────────────────────────────────────

  function _renderTudo() {
    _renderVinculados();
    _renderSugestoes();
    _renderItens();
    _renderPainelListas();
    _renderPainelShare();
  }

  function _renderVinculados() {
    const el = document.getElementById('listas-vinculados');
    if (!el) return;
    if (_vinculados.length === 0) { el.innerHTML = ''; return; }
    el.innerHTML = _vinculados.map(email => `
      <div class="chip chip-green">
        <span class="material-icons">person</span>
        ${UI.escHtml(email)}
        <button class="chip-remove" data-email="${UI.escHtml(email)}"
          style="background:none;border:none;cursor:pointer;display:flex;align-items:center;color:inherit">
          <span class="material-icons">close</span>
        </button>
      </div>`).join('');
    el.querySelectorAll('.chip-remove').forEach(btn => {
      btn.addEventListener('click', () => _desvincularEmail(btn.dataset.email));
    });
  }

  function _renderSugestoes() {
    const el = document.getElementById('sugestoes-scroll');
    if (!el) return;

    // Estabelecimentos únicos das últimas notas
    const lojas = [];
    const lojasVistas = new Set();
    _notasHistorico.forEach((nota, idx) => {
      const nome = nota.estabelecimento?.nome_fantasia || nota.estabelecimento?.nome || '';
      if (nome && !lojasVistas.has(nome)) {
        lojasVistas.add(nome);
        lojas.push({ nome, idx });
      }
    });

    // Listas salvas pelo usuário
    const chipsListas = _listasHistorico.map((lista, idx) => `
      <div class="chip chip-green" data-tipo="lista" data-idx="${idx}">
        <span class="material-icons">checklist</span>${UI.escHtml(lista.nome)}
      </div>`).join('');

    const chipsLojas = lojas.map(({ nome, idx }) => `
      <div class="chip" data-tipo="nota" data-idx="${idx}">
        <span class="material-icons">storefront</span>${UI.escHtml(nome)}
      </div>`).join('');

    el.innerHTML = chipsListas + chipsLojas;

    if (!el.innerHTML.trim()) {
      el.innerHTML = '<span style="font-size:12px;color:var(--color-text-muted)">Nenhuma sugestão disponível ainda.</span>';
      return;
    }

    el.querySelectorAll('[data-tipo="nota"]').forEach(chip => {
      chip.addEventListener('click', () => _abrirPainelNota(parseInt(chip.dataset.idx, 10)));
    });
    el.querySelectorAll('[data-tipo="lista"]').forEach(chip => {
      chip.addEventListener('click', () => _abrirPainelListaSalva(parseInt(chip.dataset.idx, 10)));
    });
  }

  function _renderItens() {
    const section = document.getElementById('lista-itens-section');
    if (!section) return;

    const total     = _itens.length;
    const comprados = _itens.filter(i => i.comprado).length;

    // Atualiza contador
    const headerEl = document.getElementById('listas-header-count');
    if (headerEl) headerEl.textContent = `${total - comprados}/${total}`;

    if (total === 0) {
      section.innerHTML = `
        <div class="empty-state">
          <span class="material-icons">checklist</span>
          <p>Lista vazia</p>
          <span>Adicione itens pelo campo acima ou use as sugestões.</span>
        </div>`;
      return;
    }

    const agrupados = _agruparItensPorCategoria(_itens);

    section.innerHTML = agrupados.map(({ categoria, itens }) => `
      <div class="lista-categoria-group">
        <div class="lista-categoria-title">
          <span class="material-icons">${UI.iconForCategoria(categoria)}</span>
          ${UI.escHtml(categoria || 'OUTROS')}
        </div>
        ${itens.map(item => `
          <div class="lista-item-row ${item.comprado ? 'comprado' : ''}" data-nome="${UI.escHtml(item.nome)}">
            <input type="checkbox" class="lista-item-checkbox" ${item.comprado ? 'checked' : ''}
              data-nome="${UI.escHtml(item.nome)}" aria-label="${UI.escHtml(item.nome)}">
            <span class="lista-item-nome">${UI.escHtml(item.nome)}</span>
            <button class="btn-remove-item" data-nome="${UI.escHtml(item.nome)}" aria-label="Remover ${UI.escHtml(item.nome)}">
              <span class="material-icons">delete_outline</span>
            </button>
          </div>`).join('')}
      </div>`).join('') + `
      <div class="lista-limpar-wrapper">
        <button id="btn-limpar-lista" class="btn-limpar-lista" aria-label="Excluir todos os itens">
          <span class="material-icons">delete_sweep</span>
          Excluir tudo
        </button>
      </div>`;

    section.querySelectorAll('.lista-item-checkbox').forEach(cb => {
      cb.addEventListener('change', () => _toggleItem(cb.dataset.nome));
    });
    section.querySelectorAll('.btn-remove-item').forEach(btn => {
      btn.addEventListener('click', () => _removerItem(btn.dataset.nome));
    });
    section.querySelector('#btn-limpar-lista')?.addEventListener('click', async () => {
      const ok = await UI.confirm({
        title: 'Excluir tudo',
        message: 'Remover todos os itens da lista?',
        confirmLabel: 'Excluir tudo',
      });
      if (!ok) return;
      _itens = [];
      _persistir();
      _renderItens();
    });
  }

  function _agruparItensPorCategoria(itens) {
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
    Object.keys(map).forEach(cat => {
      if (!Config.CATEGORIA_ICONS[cat]) result.push({ categoria: cat, itens: map[cat] });
    });
    return result;
  }

  function _renderPainelListas() {
    const salvar = document.getElementById('lista-salvar-form');
    if (salvar && !salvar.dataset.bound) {
      salvar.dataset.bound = 'true';
      salvar.onsubmit = (e) => {
        e.preventDefault();
        const input = document.getElementById('lista-salvar-nome');
        _salvarComoNova(input?.value.trim());
        if (input) input.value = '';
      };
    }

    const listEl = document.getElementById('listas-salvas-list');
    if (!listEl) return;

    if (_listasHistorico.length === 0) {
      listEl.innerHTML = '<p class="text-muted" style="font-size:12px">Nenhuma lista salva ainda.</p>';
      return;
    }

    listEl.innerHTML = _listasHistorico.map((lista, idx) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--color-border-light)">
        <span style="font-size:13px;font-weight:600">${UI.escHtml(lista.nome)}</span>
        <div style="display:flex;gap:var(--space-1)">
          <button class="btn btn-outline btn-sm" data-action="carregar" data-idx="${idx}">
            <span class="material-icons" style="font-size:14px">download</span>
          </button>
          <button class="btn btn-danger btn-sm" data-action="deletar"
            data-id="${UI.escHtml(lista.id)}" data-nome="${UI.escHtml(lista.nome)}">
            <span class="material-icons" style="font-size:14px">delete_outline</span>
          </button>
        </div>
      </div>`).join('');

    listEl.querySelectorAll('[data-action="carregar"]').forEach(btn => {
      btn.addEventListener('click', () => _carregarListaSalva(_listasHistorico[btn.dataset.idx]));
    });
    listEl.querySelectorAll('[data-action="deletar"]').forEach(btn => {
      btn.addEventListener('click', () => _deletarLista(btn.dataset.id, btn.dataset.nome));
    });
  }

  function _renderPainelShare() {
    const form = document.getElementById('share-form');
    if (!form) return;
    form.onsubmit = (e) => {
      e.preventDefault();
      const input = document.getElementById('share-email-input');
      _vincularEmail(input?.value.trim().toLowerCase());
      if (input) input.value = '';
    };
  }

  // ── Reset ─────────────────────────────────────────────────

  function reset() {
    _itens = [];
    _listaId = null;
    _vinculados = [];
    _listasHistorico = [];
    _notasHistorico = [];
    _painelAberto = null;

    const ids = ['lista-itens-section', 'listas-vinculados', 'sugestoes-scroll', 'listas-salvas-list', 'painel-selecao-acc'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ''; });

    const count = document.getElementById('listas-header-count');
    if (count) count.textContent = '0/0';

    _fecharPainel();

    // Limpa binds para rebind no próximo init
    ['lista-add-form', 'lista-salvar-form'].forEach(id => {
      const el = document.getElementById(id);
      if (el) delete el.dataset.bound;
    });

    // Reseta abas
    document.querySelectorAll('#listas-tab-panel .listas-tab').forEach(t => {
      t.classList.remove('active');
      delete t.dataset.bound;
    });
    document.querySelectorAll('.listas-tab-body').forEach(b => b.classList.add('hidden'));
  }

  return { init, reset };
})();
