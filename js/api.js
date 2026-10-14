/**
 * ALLMARKET — Serviço de API / Backend Local em JavaScript
 * Toda a lógica de regras de negócio, persistência, vínculos,
 * listas de compras e processamento de notas fiscais agora é executada
 * 100% no JavaScript cliente, sem dependência da API em Go.
 */

const ApiService = (() => {

  // ── Estado reativo de notas ─────────────────────────────
  let _temNotas = false;
  const _listeners = new Set();

  function _notify() {
    _listeners.forEach(fn => fn(_temNotas));
  }

  function onTemNotasChange(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  }

  /**
   * Simula um pequeno delay assíncrono para dar feedback visual da animação
   */
  function _delay(ms = 250) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Notas Fiscais ───────────────────────────────────────

  /**
   * Retorna o histórico de notas do usuário e de contas vinculadas.
   */
  async function getHistorico(email) {
    LoadingService.show();
    try {
      await _delay(150);
      const notas = await BackendUsecase.getHistorico(email);
      const filtradas = Array.isArray(notas) ? notas.filter(n => n.chave) : [];
      _temNotas = filtradas.length > 0;
      _notify();
      return filtradas;
    } finally {
      LoadingService.hide();
    }
  }

  /**
   * Processa a URL ou dados de uma nota fiscal.
   */
  async function processarNota(url, email) {
    LoadingService.show();
    try {
      // Pequeno delay para exibir a animação de scanner do laser
      await _delay(800);
      const nota = await BackendUsecase.processarNota(url, email);
      if (nota && nota.chave) {
        _temNotas = true;
        _notify();
      }
      return nota;
    } finally {
      LoadingService.hide();
    }
  }

  /**
   * Exclui uma nota pela chave.
   */
  async function excluirNota(chave) {
    LoadingService.show();
    try {
      await _delay(150);
      const res = await BackendUsecase.excluirNota(chave);
      const email = AuthService.getEmail();
      if (email) {
        await validarEAtualizarNotas(email);
      }
      return res;
    } finally {
      LoadingService.hide();
    }
  }

  // ── Listas de Compras ───────────────────────────────────

  /**
   * Retorna as listas de compras do usuário e de contas vinculadas.
   */
  async function getListas(email) {
    LoadingService.show();
    try {
      await _delay(150);
      return await BackendUsecase.getListas(email);
    } finally {
      LoadingService.hide();
    }
  }

  /**
   * Salva ou atualiza uma lista de compras.
   */
  async function salvarLista(lista) {
    LoadingService.show();
    try {
      await _delay(150);
      return await BackendUsecase.salvarLista(lista);
    } finally {
      LoadingService.hide();
    }
  }

  /**
   * Deleta uma lista pelo ID.
   */
  async function deletarLista(id) {
    LoadingService.show();
    try {
      await _delay(150);
      return await BackendUsecase.deletarLista(id);
    } finally {
      LoadingService.hide();
    }
  }

  /**
   * Sincroniza listas de compras em lote.
   */
  async function sincronizarListas(email, listas) {
    LoadingService.show();
    try {
      await _delay(150);
      return await BackendUsecase.sincronizarListas(email, listas);
    } finally {
      LoadingService.hide();
    }
  }

  // ── Vínculos de Contas ───────────────────────────────────

  /**
   * Retorna os emails vinculados ao usuário.
   */
  async function getVinculos(email) {
    LoadingService.show();
    try {
      await _delay(100);
      return await BackendUsecase.getVinculos(email);
    } finally {
      LoadingService.hide();
    }
  }

  /**
   * Vincula dois emails para compartilhamento familiar.
   */
  async function vincularEmail(emailDono, emailVinculado) {
    LoadingService.show();
    try {
      await _delay(150);
      return await BackendUsecase.vincularEmail(emailDono, emailVinculado);
    } finally {
      LoadingService.hide();
    }
  }

  /**
   * Remove o vínculo entre dois emails.
   */
  async function desvincularEmail(emailA, emailB) {
    LoadingService.show();
    try {
      await _delay(150);
      return await BackendUsecase.desvincularEmail(emailA, emailB);
    } finally {
      LoadingService.hide();
    }
  }

  // ── Helpers de Estado ───────────────────────────────────

  /**
   * Valida se o usuário tem notas e atualiza o estado reativo.
   */
  async function validarEAtualizarNotas(email) {
    try {
      const notas = await BackendUsecase.getHistorico(email);
      _temNotas = Array.isArray(notas) && notas.length > 0;
      _notify();
    } catch (_) {
      _temNotas = false;
      _notify();
    }
    return _temNotas;
  }

  /**
   * Limpa o estado no logout.
   */
  function limparEstado() {
    _temNotas = false;
    _notify();
  }

  return {
    getHistorico,
    processarNota,
    excluirNota,
    getListas,
    salvarLista,
    deletarLista,
    sincronizarListas,
    getVinculos,
    vincularEmail,
    desvincularEmail,
    validarEAtualizarNotas,
    limparEstado,
    onTemNotasChange,
    get temNotas() { return _temNotas; },
  };
})();
