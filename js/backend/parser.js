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
   * Faz parse de HTML retornado pela SEFAZ ou colado pelo usuário
   */
  function parseHTMLSEFAZ(html, url = '') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const texto = doc.body ? doc.body.textContent : html;

    const chave = extrairChave(url) || extrairChave(html) || ('35' + Date.now() + '100000000000000000').slice(0, 44);

    // Estabelecimento
    let nome = '';
    const elNome = doc.querySelector('emit xNome, .txtTopo, #u20, .txtTit, h2, h3');
    if (elNome) nome = elNome.textContent.trim();
    if (!nome) nome = 'Supermercado AllMarket';

    const cnpj = extrairCNPJ(html) || '12345678000199';

    let endereco = '';
    const elEnd = doc.querySelector('.text, .txtEndereco, enderEmit');
    if (elEnd) endereco = elEnd.textContent.trim();

    // Data e número
    const numMatch = texto.match(/Número:\s*(\d+)/i) || texto.match(/nNF>(\d+)/i);
    const numero = numMatch ? numMatch[1] : String(Math.floor(Math.random() * 90000) + 10000);

    const dataMatch = texto.match(/Emissão:\s*(\d{2}\/\d{2}\/\d{4}\s*\d{2}:\d{2}:\d{2})/i);
    const dataEmissao = normalizarData(dataMatch ? dataMatch[1] : null);

    // Itens
    const itens = [];
    const linhas = doc.querySelectorAll('#tabResult tr, .table tr, det');

    if (linhas.length > 0) {
      linhas.forEach(linha => {
        const elNomeItem = linha.querySelector('.txtTit, xProd');
        if (!elNomeItem) return;
        const nomeBruto = elNomeItem.textContent.trim();
        if (!nomeBruto || nomeBruto.includes('Vl. Total')) return;

        const nomeItem = expandirNome(nomeBruto);
        const elQtd = linha.querySelector('.Rqtd, .txtQtde, qCom');
        const quantidade = extrairNumero(elQtd ? elQtd.textContent : 1) || 1;

        const elUn = linha.querySelector('.RUN, .txtUnidade, uCom');
        const unidade = elUn ? elUn.textContent.replace(/UN:/i, '').trim() : 'UN';

        const elPrecoUnit = linha.querySelector('.RvlUnit, .txtValor, vUnCom');
        const precoUnitario = extrairNumero(elPrecoUnit ? elPrecoUnit.textContent : 0);

        const elPrecoTotal = linha.querySelector('.valor, .txtValorTotal, vProd');
        const precoTotal = extrairNumero(elPrecoTotal ? elPrecoTotal.textContent : precoUnitario * quantidade);

        itens.push({
          nome: nomeItem,
          codigo: String(itens.length + 1),
          quantidade,
          unidade: unidade || 'UN',
          preco_unitario: precoUnitario || (precoTotal / quantidade),
          preco_total: precoTotal,
          valor_total: precoTotal,
          categoria: buscarCategoria(nomeItem),
        });
      });
    }

    const valorTotal = itens.reduce((acc, i) => acc + (i.preco_total || 0), 0);

    return {
      chave,
      numero,
      serie: '1',
      data_emissao: dataEmissao,
      estabelecimento: {
        nome,
        nome_fantasia: nome,
        cnpj,
        endereco: endereco || 'Av. Principal, 1000 - Centro',
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
