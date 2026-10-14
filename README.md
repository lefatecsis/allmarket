# AllM@rket — Web App (HTML, CSS e JavaScript Vanilla)

Aplicação web completa, moderna e responsiva desenvolvida em **HTML5**, **Vanilla CSS** e **JavaScript Modular (ES6)**.
Toda a lógica de backend, persistência, processamento de notas da SEFAZ, categorização inteligente de produtos e compartilhamento familiar foi portada para rodar **100% no cliente em JavaScript**, eliminando qualquer dependência de servidores externos ou APIs em Go.

---

## 🚀 Como Executar

Por ser uma aplicação baseada em padrões web nativos sem dependência de build (Webpack/Vite/Nx), basta abrir o `index.html` em qualquer servidor estático local:

```bash
# Opção 1: Usando Python 3
cd allmarket
python3 -m http.server 3000

# Opção 2: Usando npx serve
cd allmarket
npx serve .
```

Acesse em seu navegador: **`http://localhost:3000`**

---

## 📁 Estrutura de Arquivos

```
allmarket/
├── index.html                   # Estrutura SPA com todas as views e componentes
├── README.md                    # Documentação do projeto
├── assets/
│   └── img/
│       ├── logo.svg             # Logotipo oficial em vetor do AllMarket
│       └── scanner.svg          # Animação SVG com efeito de laser/scan
├── css/
│   ├── variables.css            # Tokens de design, cores, tipografia e espaçamento
│   ├── base.css                 # Reset, layout responsivo e animações globais
│   ├── components.css           # Botões, input-pill, chips, badges, cards e modais
│   ├── navbar.css               # Barra superior, barra de processamento e tabs inferiores
│   └── pages.css                # Estilos específicos de cada página (Login, Home, Notas, etc.)
└── js/
    ├── config.js                # Constantes globais e categorias de produtos
    ├── ui.js                    # Utilitários de DOM, modal de confirmação, formatação e toasts
    ├── api.js                   # Adaptador de serviços do frontend para o backend JS
    ├── auth.js                  # Autenticação Google OAuth (GSI) e login local por e-mail
    ├── router.js                # Roteador SPA com navegação por hash e guards
    ├── app.js                   # Ponto de entrada (bootstrap) e eventos globais
    ├── backend/                 # 🧠 LÓGICA DE BACKEND PORTADA PARA JAVASCRIPT
    │   ├── db.js                # Repositórios (Notas, Listas, Vínculos) e persistência local
    │   ├── parser.js            # Parser de notas da SEFAZ, expansão de abreviações e categorizador
    │   └── usecase.js           # Casos de uso de negócio (Processamento, Vínculos, Cálculos)
    └── pages/
        ├── notas.js             # Histórico, paginação, busca e detalhes de notas
        ├── analise.js           # Dashboard de métricas e gráficos (Chart.js)
        ├── comparador.js        # Comparador de preços por item e estabelecimento
        └── listas.js            # Lista de compras inteligente, sugestões e vínculos
```

---

## 🧠 Lógica do Backend em JavaScript

Toda a lógica original em Go (`allmarket-api`) foi portada e aprimorada nos seguintes módulos:

1. **`js/backend/parser.js`**:
   - Dicionário com mais de 150 expansões de abreviações típicas de notas (`FEIJ` ➔ `Feijão`, `LEIT INT` ➔ `Leite Integral`, `SAB PO` ➔ `Sabão em Pó`, etc.).
   - Classificação automática nas categorias do AllMarket: `ALIMENTOS`, `LATICÍNIOS`, `PADARIA`, `CARNES E EMBUTIDOS`, `LIMPEZA`, `HIGIENE PESSOAL`, `BEBIDAS`, `HORTIFRUTI`, `OUTROS`.
   - Extrator de chaves de 44 dígitos da NFe/NFCe e CNPJ.
   - Parser de HTML/XML da SEFAZ.

2. **`js/backend/db.js`**:
   - Persistência das notas, listas e vínculos no `localStorage`.
   - Suporte a multi-contas e relacionamento de e-mails compartilhados.
   - Seed automático de notas de demonstração na primeira inicialização para permitir testes imediatos do dashboard, gráficos e comparador.

3. **`js/backend/usecase.js`**:
   - Processamento de links e códigos de notas fiscais.
   - Totalizadores e agrupamento de itens.
   - Relacionamento bidirecional de contas familiares.
