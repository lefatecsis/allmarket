/**
 * ALLMARKET Backend JS — Parser e Categorizador de Produtos
 * Porting direto e aprimorado de:
 *  - allmarket-api/internal/usecase/mapeamento_produtos.go
 *  - allmarket-api/internal/usecase/scraper_estados.go
 */

const BackendParser = (() => {

  // Dicionário de expansão de abreviações típicas de notas fiscais
  const EXPANSAO_NOMES = {
    'FEIJ':        'Feijão',
    'ARROZ':       'Arroz',
    'MAC':         'Macarrão',
    'ESPAG':       'Espaguete',
    'PENNE':       'Macarrão Penne',
    'NHOQ':        'Nhoque',
    'LASAN':       'Lasanha',
    'ACUC':        'Açúcar',
    'MASC':        'Açúcar Mascavo',
    'DEM':         'Açúcar Demerara',
    'SAL':         'Sal',
    'OLEO':        'Óleo',
    'AZE':         'Azeite',
    'VIN':         'Vinagre',
    'FAR TRIG':    'Farinha de Trigo',
    'FAR MIL':     'Farinha de Milho',
    'FAR MAND':    'Farinha de Mandioca',
    'POLV':        'Polvilho',
    'AVEIA':       'Aveia',
    'GRAN':        'Granola',
    'CEREAL':      'Cereal',
    'CAFE':        'Café',
    'CAPP':        'Cappuccino',
    'ACHOC':       'Achocolatado',
    'MEL':         'Mel',
    'LEIT':        'Leite',
    'LEIT INT':    'Leite Integral',
    'LEIT DESN':   'Leite Desnatado',
    'LEIT COND':   'Leite Condensado',
    'LEIT PO':     'Leite em Pó',
    'CR LEITE':    'Creme de Leite',
    'IOG':         'Iogurte',
    'IOG NAT':     'Iogurte Natural',
    'IOG GREG':    'Iogurte Grego',
    'MUSS':        'Mussarela',
    'QUEIJ':       'Queijo',
    'QUEIJ PRAT':  'Queijo Prato',
    'QUEIJ COALH': 'Queijo Coalho',
    'REQUE':       'Requeijão',
    'PRES':        'Presunto',
    'MORT':        'Mortadela',
    'PEIT PERU':   'Peito de Peru',
    'FRANG':       'Frango',
    'FRANG CONG':  'Frango Congelado',
    'CARN':        'Carne',
    'CARN BOV':    'Carne Bovina',
    'CARN SUIN':   'Carne Suína',
    'CARN MOID':   'Carne Moída',
    'LING':        'Linguiça',
    'LING CALAB':  'Linguiça Calabresa',
    'SALS':        'Salsicha',
    'BACON':       'Bacon',
    'PEIX':        'Peixe',
    'FILE PEIX':   'Filé de Peixe',
    'REFRI':       'Refrigerante',
    'REFRI COLA':  'Refrigerante Cola',
    'SUC':         'Suco',
    'SUC CONC':    'Suco Concentrado',
    'AGUA':        'Água',
    'AGUA MIN':    'Água Mineral',
    'AGUA GAS':    'Água com Gás',
    'ENER':        'Energético',
    'ISOT':        'Isotônico',
    'DET':         'Detergente',
    'SAB':         'Sabão',
    'SAB BARRA':   'Sabão em Barra',
    'SAB PO':      'Sabão em Pó',
    'SAB LIQ':     'Sabão Líquido',
    'AMAC':        'Amaciante',
    'DESINF':      'Desinfetante',
    'AG SANIT':    'Água Sanitária',
    'ALVEJ':       'Alvejante',
    'MULTIUSO':    'Limpador Multiuso',
    'SHAMP':       'Shampoo',
    'COND':        'Condicionador',
    'SABON':       'Sabonete',
    'SABON LIQ':   'Sabonete Líquido',
    'CREME DENT':  'Creme Dental',
    'ESC DENT':    'Escova Dental',
    'FIO DENT':    'Fio Dental',
    'DESOD':       'Desodorante',
    'PERF':        'Perfume',
    'PAPEL HIG':   'Papel Higiênico',
    'PAPEL TOALH': 'Papel Toalha',
    'GUARD':       'Guardanapo',
    'ALUM':        'Papel Alumínio',
    'FILME PVC':   'Filme Plástico',
    'BAT':         'Batata',
    'BAT DOCE':    'Batata Doce',
    'TOM':         'Tomate',
    'CEB':         'Cebola',
    'ALHO':        'Alho',
    'CEN':         'Cenoura',
    'BET':         'Beterraba',
    'ABOB':        'Abóbora',
    'ABOBR':       'Abobrinha',
    'PEP':         'Pepino',
    'MILH':        'Milho',
    'ERV':         'Ervilha',
    'ALFAC':       'Alface',
    'RUC':         'Rúcula',
    'AGRI':        'Agrião',
    'COUV':        'Couve',
    'ESP':         'Espinafre',
    'BAN':         'Banana',
    'LARAN':       'Laranja',
    'LIM':         'Limão',
    'MAMAO':       'Mamão',
    'MELAO':       'Melão',
    'UVA':         'Uva',
    'MANGA':       'Manga',
    'ABAC':        'Abacaxi',
    'OVO':         'Ovo',
    'PAO':         'Pão',
    'PAO FRANC':   'Pão Francês',
    'PAO FORM':    'Pão de Forma',
    'PAO INT':     'Pão Integral',
    'BISC':        'Biscoito',
    'BISC RECH':   'Biscoito Recheado',
    'BOL':         'Bolo',
    'TORR':        'Torrada',
    'CHOC':        'Chocolate',
    'BOMB':        'Bombom',
    'BAL':         'Bala',
    'PIRUL':       'Pirulito',
    'GELAT':       'Gelatina',
    'PUDIM':       'Pudim',
    'MOL TOM':     'Molho de Tomate',
    'KETCH':       'Ketchup',
    'MOST':        'Mostarda',
    'MAION':       'Maionese',
    'TEMP':        'Tempero',
    'CALDO':       'Caldo',
    'CONG':        'Congelado',
    'PIZZA':       'Pizza',
    'HAMB':        'Hambúrguer',
    'NUG':         'Nuggets',
    'BAT CONG':    'Batata Congelada',
    'RAC CAO':     'Ração Cachorro',
    'RAC GATO':    'Ração Gato',
    'AREIA GATO':  'Areia para Gato',
    'VEL':         'Vela',
    'PIL':         'Pilha',
    'LAMP':        'Lâmpada',
  };

  // Mapeamento de termos para Categorias
  const MAPEAMENTO_CATEGORIAS = {
    'FEIJÃO':             'ALIMENTOS',
    'ARROZ':              'ALIMENTOS',
    'AÇÚCAR':             'ALIMENTOS',
    'MACARRÃO':           'ALIMENTOS',
    'ESPAGUETE':          'ALIMENTOS',
    'FARINHA':            'ALIMENTOS',
    'ÓLEO':               'ALIMENTOS',
    'AZEITE':             'ALIMENTOS',
    'SAL':                'ALIMENTOS',
    'MOLHO':              'ALIMENTOS',
    'CHOCOLATE':          'ALIMENTOS',
    'GELATINA':           'ALIMENTOS',
    'BISCOITO':           'ALIMENTOS',
    'AVEIA':              'ALIMENTOS',
    'CAFÉ':               'BEBIDAS',
    'CHÁ':                'BEBIDAS',
    'SUCO':               'BEBIDAS',
    'REFRIGERANTE':       'BEBIDAS',
    'ÁGUA':               'BEBIDAS',
    'CERVEJA':            'BEBIDAS',
    'VINHO':              'BEBIDAS',
    'ENERGÉTICO':         'BEBIDAS',
    'LEITE':              'LATICÍNIOS',
    'QUEIJO':             'LATICÍNIOS',
    'MUSSARELA':          'LATICÍNIOS',
    'IOGURTE':            'LATICÍNIOS',
    'MANTEIGA':           'LATICÍNIOS',
    'REQUEIJÃO':          'LATICÍNIOS',
    'CREME DE LEITE':     'LATICÍNIOS',
    'PÃO':                'PADARIA',
    'BOLO':               'PADARIA',
    'TORRADA':            'PADARIA',
    'BROA':               'PADARIA',
    'CARNE':              'CARNES E EMBUTIDOS',
    'BOVINA':             'CARNES E EMBUTIDOS',
    'FRANGO':             'CARNES E EMBUTIDOS',
    'PEIXE':              'CARNES E EMBUTIDOS',
    'LINGUIÇA':           'CARNES E EMBUTIDOS',
    'SALSICHA':           'CARNES E EMBUTIDOS',
    'PRESUNTO':           'CARNES E EMBUTIDOS',
    'MORTADELA':          'CARNES E EMBUTIDOS',
    'BACON':              'CARNES E EMBUTIDOS',
    'DETERGENTE':         'LIMPEZA',
    'SABÃO':              'LIMPEZA',
    'AMACIANTE':          'LIMPEZA',
    'DESINFETANTE':       'LIMPEZA',
    'ÁGUA SANITÁRIA':     'LIMPEZA',
    'ALVEJANTE':          'LIMPEZA',
    'LIMPADOR':           'LIMPEZA',
    'ESPONJA':            'LIMPEZA',
    'SHAMPOO':            'HIGIENE PESSOAL',
    'CONDICIONADOR':      'HIGIENE PESSOAL',
    'SABONETE':           'HIGIENE PESSOAL',
    'CREME DENTAL':       'HIGIENE PESSOAL',
    'DESODORANTE':        'HIGIENE PESSOAL',
    'PAPEL HIGIÊNICO':    'HIGIENE PESSOAL',
    'ESCOVA':             'HIGIENE PESSOAL',
    'FRUTA':              'HORTIFRUTI',
    'LEGUME':             'HORTIFRUTI',
    'VERDURA':            'HORTIFRUTI',
    'BANANA':             'HORTIFRUTI',
    'MAÇÃ':               'HORTIFRUTI',
    'TOMATE':             'HORTIFRUTI',
    'BATATA':             'HORTIFRUTI',
    'CEBOLA':             'HORTIFRUTI',
    'ALHO':               'HORTIFRUTI',
    'CENOURA':            'HORTIFRUTI',
    'ALFACE':             'HORTIFRUTI',
    'OVOS':               'HORTIFRUTI',
    'OVO':                'HORTIFRUTI',
  };

  /**
   * Expande siglas de produtos para o nome legível
   */
  function expandirNome(nome) {
    if (!nome) return '';
    const palavras = String(nome).trim().toUpperCase().split(/\s+/);
    const resultado = palavras.map(p => EXPANSAO_NOMES[p] || p);
    return resultado.join(' ');
  }

  /**
   * Identifica a categoria a partir do nome do produto
   */
  function buscarCategoria(nome) {
    if (!nome) return 'OUTROS';
    const nomeUpper = String(nome).toUpperCase();

    // 1. Busca direta por termos conhecidos
    for (const [termo, categoria] of Object.entries(MAPEAMENTO_CATEGORIAS)) {
      if (nomeUpper.includes(termo)) {
        return categoria;
      }
    }

    // 2. Busca pelas siglas expandidas
    for (const [sigla, expansao] of Object.entries(EXPANSAO_NOMES)) {
      if (nomeUpper.startsWith(sigla) || nomeUpper.includes(` ${sigla} `)) {
        const expUpper = expansao.toUpperCase();
        for (const [termo, cat] of Object.entries(MAPEAMENTO_CATEGORIAS)) {
          if (expUpper.includes(termo)) {
            return cat;
          }
        }
      }
    }

    return 'OUTROS';
  }

  /**
   * Extrai a chave de 44 dígitos da nota fiscal de um texto ou URL
   */
  function extrairChave(input) {
    if (!input) return '';
    const limpo = String(input);

    // Parâmetro p= na URL (ex: ?p=44digitos...)
    const pMatch = limpo.match(/[?&]p=([0-9]{44})/i);
    if (pMatch) return pMatch[1];

    // Parâmetro chNFe= ou chave=
    const chMatch = limpo.match(/[?&](?:chNFe|chave)=([0-9]{44})/i);
    if (chMatch) return chMatch[1];

    // 44 dígitos seguidos
    const digMatch = limpo.match(/\b([0-9]{44})\b/);
    if (digMatch) return digMatch[1];

    // 44 dígitos com possíveis espaços ou hífens
    const numeros = limpo.replace(/[^0-9]/g, '');
    if (numeros.length === 44) return numeros;

    return '';
  }

  /**
   * Extrai CNPJ (14 dígitos) de um texto
   */
  function extrairCNPJ(texto) {
    if (!texto) return '';
    const m = String(texto).match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
    if (m) {
      return m[0].replace(/\D/g, '');
    }
    return '';
  }

  /**
   * Converte string de número brasileiro (1.234,56 ou 12,34) para float
   */
  function extrairNumero(texto) {
    if (texto == null) return 0;
    if (typeof texto === 'number') return texto;
    let s = String(texto).replace(/[^0-9.,]/g, '').trim();
    if (s.includes(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  /**
   * Formata data para "DD/MM/YYYY HH:mm:ss"
   */
  function normalizarData(dataBruta) {
    if (!dataBruta) {
      const agora = new Date();
      return agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR');
    }
    const dStr = String(dataBruta).trim();
    if (/^\d{2}\/\d{2}\/\d{4}/.test(dStr)) {
      return dStr;
    }
    try {
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR');
      }
    } catch (_) {}
    return dStr;
  }

  /**
   * Faz parse de HTML retornado pela SEFAZ ou colado pelo usuário.
   *
   * Estrutura real confirmada via HTML da NFC-e SP (ConsultaQRCode.aspx):
   *   - div.txtTopo          → nome do estabelecimento
   *   - div.text (1º)        → CNPJ
   *   - div.text (2º)        → endereço
   *   - #tabResult tr        → uma linha por produto
   *     - span.txtTit        → nome do produto (NÃO .txtTit2)
   *     - span.Rqtd          → "Qtde.:1" ou "Qtde.:0,276"
   *     - span.RUN            → "UN: UN" ou "UN: KG"
   *     - span.RvlUnit        → "Vl. Unit.: 10,99"
   *     - span.valor          → "10,99"  (na <td> direita)
   *   - span.chave           → "3526 1001 4442..." (44 dígitos com espaços)
   *   - span.totalNumb.txtMax → valor total "154,17"
   *   - texto "Emissão: DD/MM/YYYY HH:mm:ss"
   */
  function parseHTMLSEFAZ(html, url = '') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const texto = doc.body ? (doc.body.textContent || '') : (html || '');

    // ── Chave de 44 dígitos ──────────────────────────────────
    // A chave na página vem com espaços: "3526 1001 4442 1000..."
    let chave = '';
    const elChave = doc.querySelector('span.chave, .chave');
    if (elChave) chave = (elChave.textContent || '').replace(/\D/g, '');
    // Se não achou no elemento, tenta extrair da URL (?p=44dígitos|...)
    if (!chave || chave.length !== 44) chave = extrairChave(url);
    // Último recurso: 44 dígitos seguidos no texto bruto
    if (!chave || chave.length !== 44) chave = extrairChave(html);
    if (chave && chave.length !== 44) chave = '';

    // ── Estabelecimento ──────────────────────────────────────
    let nome = '';
    const elNome = doc.querySelector('div.txtTopo, #u20.txtTopo, .txtTopo');
    if (elNome) nome = elNome.textContent.replace(/\s+/g, ' ').trim();

    // CNPJ e Endereço — SP: div.text, 1º = CNPJ, 2º = endereço
    let cnpj = '';
    let endereco = '';
    const elTexts = doc.querySelectorAll('div.text');
    if (elTexts.length >= 1) {
      cnpj = extrairCNPJ(elTexts[0].textContent);
      if (elTexts.length >= 2) endereco = elTexts[1].textContent.replace(/\s+/g, ' ').trim();
    }
    if (!cnpj) cnpj = extrairCNPJ(html);

    // ── Data de emissão ──────────────────────────────────────
    // Padrão: "Emissão: 17/10/2026 14:46:56" ou só "DD/MM/YYYY HH:mm:ss"
    let dataEmissao = '';
    const dataMatch = texto.match(/Emiss[aã]o\s*:?\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}(?::\d{2})?)/i)
                   || texto.match(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}(?::\d{2})?)/);
    if (dataMatch) dataEmissao = dataMatch[1].trim();
    if (!dataEmissao) dataEmissao = normalizarData(null);

    // ── Número da nota ───────────────────────────────────────
    let numero = '';
    const numMatch = texto.match(/N[uú]mero\s*:\s*(\d+)/i) || texto.match(/nNF\s*[:=]?\s*(\d+)/i);
    if (numMatch) numero = numMatch[1];
    if (!numero) numero = String(Math.floor(Math.random() * 90000) + 10000);

    // ── Itens ────────────────────────────────────────────────
    // Estrutura real SP: cada <tr> tem span.txtTit (nome), span.Rqtd, span.RUN,
    // span.RvlUnit (na 1ª <td>) e span.valor (na 2ª <td> .txtTit.noWrap).
    // As linhas com "Vl. Total" como texto do span.txtTit são cabeçalhos — ignorar.
    const itens = [];

    const linhas = doc.querySelectorAll('#tabResult tr, table#tabResult tr');
    linhas.forEach(tr => {
      // Nome: span.txtTit na primeira célula (ignora o span.txtTit.noWrap que é "Vl. Total")
      const tdEsq = tr.querySelector('td:first-child');
      if (!tdEsq) return;

      const elNomeItem = tdEsq.querySelector('span.txtTit');
      if (!elNomeItem) return;
      const nomeBruto = elNomeItem.textContent.replace(/\s+/g, ' ').trim();
      if (!nomeBruto || /Vl\.?\s*Total/i.test(nomeBruto)) return;

      const elQtd = tdEsq.querySelector('span.Rqtd');
      const quantidade = extrairNumero(elQtd ? elQtd.textContent : 1) || 1;

      const elUn = tdEsq.querySelector('span.RUN');
      const unidade = elUn
        ? elUn.textContent.replace(/UN\s*:\s*/i, '').replace(/\s+/g, '').toUpperCase() || 'UN'
        : 'UN';

      const elPu = tdEsq.querySelector('span.RvlUnit');
      const precoUnit = extrairNumero(elPu ? elPu.textContent : 0);

      // Valor total do item: span.valor na 2ª coluna
      const tdDir = tr.querySelector('td:last-child, td.txtTit');
      const elPt = tdDir ? tdDir.querySelector('span.valor') : null;
      const precoTotal = extrairNumero(elPt ? elPt.textContent : precoUnit * quantidade);

      const nomeItem = expandirNome(nomeBruto);

      itens.push({
        nome: nomeItem,
        codigo: elQtd ? elQtd.textContent.replace(/\D/g, '') || String(itens.length + 1) : String(itens.length + 1),
        quantidade,
        unidade,
        preco_unitario: precoUnit || (quantidade ? precoTotal / quantidade : 0),
        preco_total: precoTotal,
        valor_total: precoTotal,
        categoria: buscarCategoria(nomeItem),
      });
    });

    // ── Fallback para XMLs (det/xProd) ───────────────────────
    if (itens.length === 0) {
      const dets = doc.querySelectorAll('det, item');
      dets.forEach((det, i) => {
        const elNomeItem = det.querySelector('xProd, prod xProd');
        if (!elNomeItem) return;
        const nomeBruto = elNomeItem.textContent.replace(/\s+/g, ' ').trim();
        if (!nomeBruto) return;
        const nomeItem = expandirNome(nomeBruto);
        const elQtd = det.querySelector('qCom');
        const quantidade = extrairNumero(elQtd ? elQtd.textContent : 1) || 1;
        const elUn = det.querySelector('uCom');
        const unidade = elUn ? elUn.textContent.trim().toUpperCase() : 'UN';
        const elPu = det.querySelector('vUnCom');
        const precoUnit = extrairNumero(elPu ? elPu.textContent : 0);
        const elPt = det.querySelector('vProd');
        const precoTotal = extrairNumero(elPt ? elPt.textContent : precoUnit * quantidade);
        itens.push({
          nome: nomeItem, codigo: String(i + 1), quantidade, unidade,
          preco_unitario: precoUnit || (quantidade ? precoTotal / quantidade : 0),
          preco_total: precoTotal, valor_total: precoTotal,
          categoria: buscarCategoria(nomeItem),
        });
      });
    }

    // ── Valor total da nota ──────────────────────────────────
    let valorTotal = 0;
    const elTotal = doc.querySelector('span.totalNumb.txtMax, .totalNumb.txtMax');
    if (elTotal) valorTotal = extrairNumero(elTotal.textContent);
    if (!valorTotal) valorTotal = itens.reduce((acc, i) => acc + (i.preco_total || 0), 0);

    return {
      chave,
      numero,
      serie: '1',
      data_emissao: dataEmissao,
      estabelecimento: {
        nome: nome || 'Estabelecimento não identificado',
        nome_fantasia: nome || '',
        cnpj: cnpj || '',
        endereco: endereco || '',
      },
      itens,
      valor_total: valorTotal,
    };
  }

  return {
    expandirNome,
    buscarCategoria,
    extrairChave,
    extrairCNPJ,
    extrairNumero,
    normalizarData,
    parseHTMLSEFAZ,
  };
})();
