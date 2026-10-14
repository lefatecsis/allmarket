/**
 * ALLMARKET — Configuração Global
 * Centraliza URLs, chaves e constantes da aplicação.
 */

const Config = Object.freeze({
  /** Client ID oficial do Google OAuth (idêntico ao allmarket-web) */
  GOOGLE_CLIENT_ID: '570724598871-n23jsilb8ncvfv2ve6b848q327fgdav9.apps.googleusercontent.com',

  /** Configuração do Firebase Firestore (Web SDK) */
  FIREBASE: {
    apiKey: 'AIzaSyDi9go-tJZGiChcyNAjzhYqaUDutn1mVjo',
    authDomain: 'allmarket-9151b.firebaseapp.com',
    projectId: 'allmarket-9151b',
    storageBucket: 'allmarket-9151b.appspot.com',
    messagingSenderId: '570724598871',
  },

  /** Nomes das coleções no Firestore */
  COLLECTIONS: {
    NOTAS: 'tb_notas',
    LISTAS: 'tb_listas',
    VINCULOS: 'tb_vinculos',
  },

  /** Chaves do localStorage */
  STORAGE: {
    USER:        'allmarket_user',
    EMAIL:       'allmarket_user_email',
    NOTA_FOCUS:  'allmarket_nota_chave_focus',
    LISTA_LOCAL: 'allmarket_lista_local',
  },

  /** Categorias de itens e seus ícones Material */
  CATEGORIA_ICONS: {
    'ALIMENTOS':          'restaurant',
    'LATICÍNIOS':         'egg',
    'PADARIA':            'bakery_dining',
    'CARNES E EMBUTIDOS': 'set_meal',
    'LIMPEZA':            'cleaning_services',
    'HIGIENE PESSOAL':    'soap',
    'BEBIDAS':            'local_drink',
    'HORTIFRUTI':         'eco',
    'OUTROS':             'category',
  },

  /** Paginação */
  NOTAS_POR_PAGINA_MOBILE:  6,
  NOTAS_POR_PAGINA_DESKTOP: 12,
});
