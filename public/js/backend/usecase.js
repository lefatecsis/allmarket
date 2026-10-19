/**
 * ALLMARKET Backend JS — Casos de Uso e Regras de Negócio
 * Porting direto de:
 *  - allmarket-api/cmd/api/main.go
 *  - allmarket-api/internal/usecase/nota_fiscal_usecase.go
 */

const BackendUsecase = (() => {

  /**
   * Processa uma URL ou conteúdo de Nota Fiscal da SEFAZ
   */
  // ── Normalização de URLs da SEFAZ (evita double-encoding de %7C nos proxies) ─
  function _limparUrlSefaz(url) {
    let u = String(url || '').trim();
    // Decodifica %7C (pipe) caso a URL já venha parcialmente codificada
    u = u.replace(/%7C/gi, '|');
    return u;
  }

  // ── Cadeia de proxies CORS (tentados em paralelo; primeiro HTML válido vence) ─
  const CORS_PROXIES = [
    {
      name: 'jina-html',
      build: (u) => `https://r.jina.ai/${u}`,
      headers: { 'X-Return-Format': 'html' },
      json: false,
    },
    {
      name: 'jina-text',
      build: (u) => `https://r.jina.ai/${u}`,
      headers: {},
      json: false,
    },
    {
      name: 'corsproxy-org',
      build: (u) => `https://corsproxy.org/?${encodeURIComponent(u)}`,
      headers: {},
      json: false,
    },
    {
      name: 'allorigins-raw',
      build: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      headers: {},
      json: false,
    },
    {
      name: 'allorigins-get',
      build: (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
      headers: {},
      json: true,
    },
    {
      name: 'codetabs',
      build: (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
      headers: {},
      json: false,
    },
  ];

  // Marcadores que indicam que o HTML/texto é realmente uma página de NFC-e / XML de nota
  const _NOTA_MARKERS = /tabResult|txtTit|infNFe|<det|class="chave"|span class="chave"|NFCe|Qtde\.:|Vl\.\s*Total/i;

  function _fetchWithTimeout(url, options = {}, ms = 7000) {
    if (typeof AbortController === 'undefined') return fetch(url, options);
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
  }

  /**
   * Tenta obter o HTML da nota através de múltiplos proxies CORS.
   * Retorna o primeiro HTML válido encontrado, ou null se todos falharem.
   */
  async function _fetchHTMLViaProxies(targetUrl, perProxyMs = 7000) {
    const tentativas = CORS_PROXIES.map(async (p) => {
      const proxyUrl = p.build(targetUrl);
      const res = await _fetchWithTimeout(proxyUrl, { headers: p.headers || {} }, perProxyMs);
      if (!res.ok) throw new Error(`${p.name} HTTP ${res.status}`);
      let body;
      if (p.json) {
        const json = await res.json();
        body = (json && json.contents) ? json.contents : '';
      } else {
        body = await res.text();
      }
      if (!body || body.length < 200) throw new Error(`${p.name} resposta curta`);
      if (!_NOTA_MARKERS.test(body)) throw new Error(`${p.name} sem marcadores de nota`);
      console.info(`[Nota] Página obtida via proxy: ${p.name}`);
      return body;
    });

    try {
      // Promise.any = resolve com o primeiro sucesso; rejeita só se todos falharem
      return await Promise.any(tentativas);
    } catch (_) {
      return null;
    }
  }

  async function processarNota(input, email) {
    if (!email) throw new Error('E-mail do usuário é obrigatório');
    const inputLimpo = String(input || '').trim();

    const isUrl  = inputLimpo.startsWith('http');
    const isHtml = inputLimpo.includes('<');
    if (!isUrl && !isHtml && inputLimpo.length < 44) {
      throw new Error('Por favor, insira um link válido da nota fiscal (URL) ou o código da chave');
    }

    let nota = null;
    let fetchOk = false;
    const urlLimpa = isUrl ? _limparUrlSefaz(inputLimpo) : '';

    if (isUrl) {
      // Busca o HTML da nota via proxies CORS (com fallback em paralelo)
      const html = await _fetchHTMLViaProxies(urlLimpa);
      if (html) {
        fetchOk = true;
        try {
          nota = BackendParser.parseHTMLSEFAZ(html, urlLimpa);
        } catch (err) {
          console.error('Erro ao fazer parse do HTML da nota:', err);
        }
      } else {
        console.warn('[Nota] Todos os proxies CORS falharam para:', urlLimpa);
      }
    } else if (isHtml) {
      // Conteúdo HTML colado diretamente pelo usuário
      fetchOk = true;
      nota = BackendParser.parseHTMLSEFAZ(inputLimpo, '');
    }

    // Só salva se realmente extraiu itens da página (nada de dados fictícios)
    if (nota && nota.itens && nota.itens.length > 0) {
      nota.usuario_email = email.toLowerCase().trim();

      // Verifica se a nota já existia no histórico
      if (nota.chave) {
        const existente = await BackendDB.notaExiste(nota.chave);
        if (existente) {
          // Atualiza no Firestore substituindo qualquer dado fake ou desatualizado anterior
          await BackendDB.salvarNota(nota);
          nota.foiAtualizada = true;
          return nota;
        }
      }

      await BackendDB.salvarNota(nota);
      return nota;
    }

    // Não conseguiu ler os itens → erro honesto, em vez de inventar produtos
    if (!fetchOk) {
      throw new Error('Não foi possível ler a página da nota agora. Verifique a conexão e o link e tente novamente.');
    }
    throw new Error('Não foi possível extrair os itens da nota. O link é de uma NFC-e válida?');
  }

  /**
   * Obtém o histórico de notas do usuário e de contas vinculadas
   */
  async function getHistorico(email) {
    if (!email) return [];
    const emails = await BackendDB.obterEmailsRelacionados(email);
    return await BackendDB.listarNotasPorEmails(emails);
  }

  /**
   * Exclui nota fiscal por chave
   */
  async function excluirNota(chave) {
    await BackendDB.deletarNotaPorChave(chave);
    return { message: 'Nota removida com sucesso' };
  }

  /**
   * Listas de compras
   */
  async function getListas(email) {
    if (!email) return [];
    const emails = await BackendDB.obterEmailsRelacionados(email);
    return await BackendDB.listarListasPorEmails(emails);
  }

  async function salvarLista(lista) {
    return await BackendDB.salvarLista(lista);
  }

  async function deletarLista(id) {
    await BackendDB.deletarLista(id);
    return { message: 'Lista removida com sucesso' };
  }

  async function sincronizarListas(email, listas) {
    await BackendDB.sincronizarListas(email, listas);
    return { message: 'Sincronização concluída' };
  }

  /**
   * Vínculos de e-mails
   */
  async function getVinculos(email) {
    if (!email) return [];
    return await BackendDB.obterEmailsRelacionados(email);
  }

  async function vincularEmail(emailDono, emailVinculado) {
    await BackendDB.vincular(emailDono, emailVinculado);
    return { message: 'E-mails vinculados com sucesso' };
  }

  async function desvincularEmail(emailA, emailB) {
    await BackendDB.desvincular(emailA, emailB);
    return { message: 'Vínculo removido com sucesso' };
  }

  return {
    processarNota,
    getHistorico,
    excluirNota,
    getListas,
    salvarLista,
    deletarLista,
    sincronizarListas,
    getVinculos,
    vincularEmail,
    desvincularEmail,
  };
})();
