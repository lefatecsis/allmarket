/**
 * ALLMARKET — Página: Análise de Gastos
 * Espelha o analise_mfe do projeto Angular.
 * Usa Chart.js (CDN) para gráficos de barra e rosca.
 */

const PageAnalise = (() => {
  let _barChart = null;
  let _pieChart = null;

  // ── Inicialização ────────────────────────────────────────

  async function init() {
    _destruirGraficos();
    const email = AuthService.getEmail();
    if (!email) return;
    try {
      const notas = await ApiService.getHistorico(email);
      _render(notas || []);
    } catch (err) {
      UI.showSnack('Erro ao carregar análise: ' + err.message);
    }
  }

  // ── Processamento ────────────────────────────────────────

  function _processarDados(notas) {
    const dadosMensais = {};
    const dadosLojas   = {};
    let totalGeral = 0;

    notas.forEach(nota => {
      totalGeral += Number(nota.valor_total || 0);

      // Agrupa por mês/ano
      let mesAno = '';
      const ds = nota.data_emissao || '';
      if (/^\d{2}\/\d{2}\/\d{4}/.test(ds)) {
        mesAno = ds.slice(3, 10); // MM/YYYY
      } else if (ds) {
        try {
          const d = new Date(ds);
          mesAno = `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
        } catch (_) { mesAno = 'Desconhecido'; }
      }
      if (mesAno) {
        dadosMensais[mesAno] = (dadosMensais[mesAno] || 0) + Number(nota.valor_total || 0);
      }

      // Agrupa por loja
      const loja = nota.estabelecimento?.nome_fantasia ||
                   nota.estabelecimento?.nome ||
                   'Desconhecido';
      dadosLojas[loja] = (dadosLojas[loja] || 0) + Number(nota.valor_total || 0);
    });

    // Ordena meses cronologicamente
    const mesesOrdenados = Object.keys(dadosMensais).sort((a, b) => {
      const [ma, ya] = a.split('/').map(Number);
      const [mb, yb] = b.split('/').map(Number);
      return ya !== yb ? ya - yb : ma - mb;
    });

    // Top 5 lojas
    const lojasOrdenadas = Object.entries(dadosLojas)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalGeral,
      totalNotas: notas.length,
      meses: mesesOrdenados,
      valoresMensais: mesesOrdenados.map(m => dadosMensais[m]),
      lojasLabels: lojasOrdenadas.map(([nome]) => nome),
      lojasValores: lojasOrdenadas.map(([, val]) => val),
    };
  }

  // ── Renderização ─────────────────────────────────────────

  function _render(notas) {
    const dados = _processarDados(notas);

    // Volume total
    const volEl = document.getElementById('analise-total');
    if (volEl) volEl.textContent = UI.formatCurrency(dados.totalGeral);

    const countEl = document.getElementById('analise-count');
    if (countEl) countEl.textContent = `${dados.totalNotas} nota${dados.totalNotas !== 1 ? 's' : ''}`;

    if (notas.length === 0) {
      _renderEmpty();
      return;
    }

    // Gráfico de barras — gastos mensais
    const ctxBar = document.getElementById('bar-chart');
    if (ctxBar) {
      _barChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
          labels: dados.meses,
          datasets: [{
            label: 'Gastos (R$)',
            data: dados.valoresMensais,
            backgroundColor: '#2563eb',
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => UI.formatCurrency(ctx.raw),
              },
            },
          },
          scales: {
            y: {
              ticks: {
                callback: val => `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`,
              },
            },
          },
        },
      });
    }

    // Gráfico de rosca — por loja
    const ctxPie = document.getElementById('pie-chart');
    if (ctxPie) {
      const palette = ['#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];
      _pieChart = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
          labels: dados.lojasLabels,
          datasets: [{
            data: dados.lojasValores,
            backgroundColor: palette,
            borderWidth: 2,
            borderColor: '#fff',
          }],
        },
        options: {
          responsive: true,
          cutout: '70%',
          plugins: {
            legend: { position: 'bottom', labels: { font: { size: 11 } } },
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.label}: ${UI.formatCurrency(ctx.raw)}`,
              },
            },
          },
        },
      });
    }
  }

  function _renderEmpty() {
    const chartsEl = document.getElementById('analise-charts');
    if (chartsEl) {
      chartsEl.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <span class="material-icons">bar_chart</span>
          <p>Sem dados para análise</p>
          <span>Adicione notas fiscais para visualizar seus gastos.</span>
        </div>`;
    }
  }

  function _destruirGraficos() {
    if (_barChart) { _barChart.destroy(); _barChart = null; }
    if (_pieChart) { _pieChart.destroy(); _pieChart = null; }
  }

  function reset() {
    _destruirGraficos();
    const volEl = document.getElementById('analise-total');
    if (volEl) volEl.textContent = 'R$ 0,00';
    const countEl = document.getElementById('analise-count');
    if (countEl) countEl.textContent = '0 notas';
    const chartsEl = document.getElementById('analise-charts');
    if (chartsEl) {
      chartsEl.innerHTML = `
        <div class="chart-card">
          <h3>Gastos por Mês</h3>
          <canvas id="bar-chart" aria-label="Gráfico de barras de gastos mensais"></canvas>
        </div>
        <div class="chart-card">
          <h3>Top Estabelecimentos</h3>
          <canvas id="pie-chart" aria-label="Gráfico de rosca dos principais estabelecimentos"></canvas>
        </div>`;
    }
  }

  return { init, reset };
})();
