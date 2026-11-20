/* =========================================================
   Dashboard Vitto – dashboard.js
   Carrega dados.json (nunca o CSV) e renderiza KPIs +
   5 gráficos com filtros de período, categoria e tamanho.

   Critérios visuais aplicados:
   1. Barras ordenadas ↓ (exceto eixo de tempo)
   2. Eixo Y começa em 0
   3. Uma única cor de destaque (--accent) por gráfico; resto cinza
   4. Títulos descrevem a conclusão (no HTML)
   5. Nenhum gráfico de pizza > 3 fatias (não usamos pizza aqui)
   ========================================================= */

const ACCENT = '#e63946';
const GRAY   = '#adb5bd';
const ACCENT_ALPHA = 'rgba(230,57,70,.18)';

// Reverse lookup: id numérico -> nome legível
let DATA = null;
let top10Mode = 'unidades'; // ou 'faturamento'

// Chart instances (para destruir antes de recriar)
const charts = {};

// ── Helpers ──────────────────────────────────────────────
function brl(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Mapa de IDs para nomes de pizza
function pizzaName(id) {
  const entry = Object.entries(DATA.pizzas).find(([, v]) => String(v) === String(id));
  if (!entry) return `Pizza ${id}`;
  return entry[0]
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Mapa de IDs para nomes de categoria
function catName(id) {
  const entry = Object.entries(DATA.categorias).find(([, v]) => String(v) === String(id));
  return entry ? entry[0] : `Cat ${id}`;
}

// Mapa de IDs para nomes de tamanho
function tamName(id) {
  const entry = Object.entries(DATA.tamanhos).find(([, v]) => String(v) === String(id));
  return entry ? entry[0] : `Tam ${id}`;
}

// Detecta se um mês está "incompleto" (último mês disponível com poucos pedidos)
function detectIncomplete(months) {
  const sorted = Object.keys(months).sort();
  if (!sorted.length) return null;
  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  if (!prev) return null;
  const lastPed = months[last].pedidosDistintos;
  const prevPed = months[prev].pedidosDistintos;
  return lastPed < prevPed * 0.3 ? last : null;
}

// Destrói e recria um Chart.js
function makeChart(id, config) {
  if (charts[id]) charts[id].destroy();
  const ctx = document.getElementById(id).getContext('2d');
  charts[id] = new Chart(ctx, config);
}

// Cores: destaque para o maior valor, cinza para o resto
function barColors(values) {
  const max = Math.max(...values);
  return values.map(v => v === max ? ACCENT : GRAY);
}

// ── Filtrar meses ─────────────────────────────────────────
function filteredMonths(filterStart, filterEnd) {
  return Object.entries(DATA.meses)
    .filter(([k]) => {
      if (filterStart && k < filterStart) return false;
      if (filterEnd   && k > filterEnd)   return false;
      return true;
    });
}

// ── Calcular KPIs ─────────────────────────────────────────
// Retorna { fat, ped, ticket, pedApprox }
// pedApprox=true quando o número de pedidos é uma estimativa (filtro cat/tam ativo)
function calcKPIs(monthEntries, catId, tamId) {
  let fat = 0, pedTotal = 0;

  monthEntries.forEach(([, m]) => {
    pedTotal += m.pedidosDistintos;

    if (!catId && !tamId) {
      fat += m.faturamentoTotal;
    } else if (catId && !tamId) {
      fat += (m.cat[catId]?.faturamento ?? 0);
    } else if (!catId && tamId) {
      fat += (m.tam[tamId]?.faturamento ?? 0);
    } else {
      // cat + tam: somar faturamento das pizzas que pertencem à cat e ao tam filtrado
      Object.entries(m.pizza).forEach(([pid, pdata]) => {
        const pKey = Object.keys(DATA.pizzas).find(k => String(DATA.pizzas[k]) === pid);
        if (!pKey) return;
        const pTam = pKey.split('_').pop().toUpperCase();
        if (tamId && pTam && pTam !== tamName(tamId).toUpperCase() && pTam !== String(tamId).toUpperCase()) return;
        if (pizzaBelongsToCat(pKey, catId)) fat += pdata.faturamento;
      });
    }
  });

  // Quando filtro de categoria ou tamanho ativo, pedidosDistintos não está
  // desagregado no JSON → usamos o total do período como aproximação.
  const pedApprox = !!(catId || tamId);
  const ped       = pedTotal;
  const ticket    = ped > 0 ? fat / ped : 0;
  return { fat, ped, ticket, pedApprox };
}

// Verifica se um pizza-key pertence a uma categoria (por catId)
// Baseado na estrutura do CSV/dados.json (categoria derivada do nome)
const CAT_PATTERNS = {
  'Vegetariana': ['espinafre', 'vegetais', 'jardim', 'super_vegetariana'],
  'Frango': ['frango'],
  'Especial': ['especial_casa', 'brie_carre', 'cinco_queijos', 'quatro_queijos'],
  'Clássica': ['calabresa', 'pepperoni', 'napolitana', 'italiana_picante',
               'siciliana', 'mexicana', 'tropical', 'mega_carne', 'soppressata',
               'capocollo', 'salame_pimenta', 'parma_rucula', 'mediterranea',
               'grega', 'suprema_italiana', 'suprema_espinafre']
};

function pizzaBelongsToCat(pKey, catId) {
  const nome = catName(catId);
  const patterns = CAT_PATTERNS[nome] ?? [];
  return patterns.some(p => pKey.startsWith(p));
}

// ── Faturamento Mensal ────────────────────────────────────
function renderMensal(monthEntries, catId, tamId, incompleteMes) {
  const labels = [], values = [];

  monthEntries.forEach(([k, m]) => {
    labels.push(k);
    if (!catId && !tamId) {
      values.push(m.faturamentoTotal);
    } else if (catId && !tamId) {
      values.push(m.cat[catId]?.faturamento ?? 0);
    } else if (!catId && tamId) {
      values.push(m.tam[tamId]?.faturamento ?? 0);
    } else {
      // interseção simplificada: soma das pizzas da cat+tam
      let s = 0;
      Object.entries(m.pizza).forEach(([pid, pd]) => {
        const pKey = Object.keys(DATA.pizzas).find(k2 => String(DATA.pizzas[k2]) === pid);
        if (!pKey) return;
        const parts = pKey.split('_');
        const pTam = parts[parts.length - 1].toUpperCase();
        const tamNome = tamName(tamId).toUpperCase();
        if (pTam !== tamNome) return;
        if (pizzaBelongsToCat(pKey, catId)) s += pd.faturamento;
      });
      values.push(s);
    }
  });

  // Destaque: mês incompleto em amarelo, maior em vermelho, resto cinza
  const maxVal = Math.max(...values);
  const bgColors = labels.map((l, i) => {
    if (l === incompleteMes) return '#ffc107';
    if (values[i] === maxVal) return ACCENT;
    return GRAY;
  });

  makeChart('chart-mensal', {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: bgColors,
        borderRadius: 4,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => brl(ctx.raw)
          }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => 'R$' + (v/1000).toFixed(0) + 'k' } },
        x: { ticks: { maxRotation: 45 } }
      }
    }
  });
}

// ── Top 10 Pizzas ─────────────────────────────────────────
function renderTop10(monthEntries, catId, tamId) {
  // Agregar totais de pizza
  const agg = {};
  monthEntries.forEach(([, m]) => {
    Object.entries(m.pizza).forEach(([pid, pd]) => {
      const pKey = Object.keys(DATA.pizzas).find(k => String(DATA.pizzas[k]) === pid);
      if (!pKey) return;
      // filtrar categoria
      if (catId && !pizzaBelongsToCat(pKey, catId)) return;
      // filtrar tamanho
      if (tamId) {
        const pTam = pKey.split('_').pop().toUpperCase();
        if (tamId && pTam && pTam !== tamName(tamId).toUpperCase() && pTam !== String(tamId).toUpperCase()) return;
      }
      if (!agg[pid]) agg[pid] = { unidades: 0, faturamento: 0 };
      agg[pid].unidades   += pd.unidades;
      agg[pid].faturamento += pd.faturamento;
    });
  });

  const metric = top10Mode;
  const sorted = Object.entries(agg)
    .sort((a, b) => b[1][metric] - a[1][metric])
    .slice(0, 10);

  const labels = sorted.map(([pid]) => pizzaName(pid));
  const values = sorted.map(([, d]) => d[metric]);
  const colors = barColors(values);

  makeChart('chart-top10', {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderRadius: 4, borderSkipped: false }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => metric === 'faturamento' ? brl(ctx.raw) : ctx.raw + ' un.'
          }
        }
      },
      scales: {
        x: { beginAtZero: true },
        y: { ticks: { font: { size: 10 } } }
      }
    }
  });
}

// ── Vendas por Horário ────────────────────────────────────
function renderHorario(monthEntries, catId, tamId) {
  // hora: chave '0'..'23'
  const totals = Array(24).fill(0);

  monthEntries.forEach(([, m]) => {
    if (!m.hora) return;
    Object.entries(m.hora).forEach(([h, hd]) => {
      const idx = parseInt(h, 10);
      if (isNaN(idx)) return;
      // catId / tamId: hora não tem desagregação por cat/tam no JSON
      // usamos o total de hora para cat/tam proporcionalmente (aproximação)
      totals[idx] += hd.faturamento ?? hd;
    });
  });

  const labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,'0')}h`);
  const maxIdx = totals.indexOf(Math.max(...totals));
  const colors = totals.map((_, i) => i === maxIdx ? ACCENT : GRAY);

  makeChart('chart-horario', {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: totals, backgroundColor: colors, borderRadius: 3 }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => v > 0 ? 'R$' + (v/1000).toFixed(0) + 'k' : '0' } }
      }
    }
  });
}

// ── Vendas por Tamanho ────────────────────────────────────
function renderTamanho(monthEntries, catId) {
  const agg = {};
  monthEntries.forEach(([, m]) => {
    Object.entries(m.tam).forEach(([tid, td]) => {
      if (!agg[tid]) agg[tid] = { unidades: 0, faturamento: 0 };
      agg[tid].faturamento += td.faturamento;
      agg[tid].unidades    += td.unidades;
    });
  });

  // ordenar desc por faturamento
  const sorted = Object.entries(agg)
    .sort((a, b) => b[1].faturamento - a[1].faturamento);

  const labels = sorted.map(([tid]) => tamName(tid));
  const values = sorted.map(([, d]) => d.faturamento);
  const colors = barColors(values);

  makeChart('chart-tamanho', {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderRadius: 4, borderSkipped: false }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => brl(ctx.raw) } }
      },
      scales: { x: { beginAtZero: true } }
    }
  });
}

// ── Vendas por Categoria ──────────────────────────────────
function renderCategoria(monthEntries, tamId) {
  const agg = {};
  monthEntries.forEach(([, m]) => {
    Object.entries(m.cat).forEach(([cid, cd]) => {
      if (!agg[cid]) agg[cid] = { faturamento: 0 };
      agg[cid].faturamento += cd.faturamento;
    });
  });

  const sorted = Object.entries(agg)
    .sort((a, b) => b[1].faturamento - a[1].faturamento);

  const labels = sorted.map(([cid]) => catName(cid));
  const values = sorted.map(([, d]) => d.faturamento);
  const colors = barColors(values);

  makeChart('chart-categoria', {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderRadius: 4, borderSkipped: false }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => brl(ctx.raw) } }
      },
      scales: { x: { beginAtZero: true } }
    }
  });
}

// ── Render Principal ──────────────────────────────────────
function render() {
  const startVal = document.getElementById('filter-start').value;
  const endVal   = document.getElementById('filter-end').value;
  const catVal   = document.getElementById('filter-categoria').value; // id ou ''
  const tamVal   = document.getElementById('filter-tamanho').value;   // id ou ''

  // converter para yyyy-mm para comparar com chaves do JSON
  const filterStart = startVal ? startVal.substring(0, 7) : '';
  const filterEnd   = endVal   ? endVal.substring(0, 7)   : '';

  const catId = catVal || null;
  const tamId = tamVal || null;

  const monthEntries = filteredMonths(filterStart, filterEnd);
  const incompleteMes = detectIncomplete(DATA.meses);

  // badge mês incompleto
  const badge = document.getElementById('incomplete-notice');
  if (incompleteMes) {
    const monthEntryKeys = monthEntries.map(([k]) => k);
    badge.style.display = monthEntryKeys.includes(incompleteMes) ? 'inline-block' : 'none';
  } else {
    badge.style.display = 'none';
  }

  // KPIs
  const { fat, ped, ticket, pedApprox } = calcKPIs(monthEntries, catId, tamId);
  document.getElementById('kpi-faturamento').textContent = brl(fat);
  document.getElementById('kpi-pedidos').textContent     = (pedApprox ? '~' : '') + ped.toLocaleString('pt-BR');
  document.getElementById('kpi-ticket').textContent      = brl(ticket);

  // Gráficos
  renderMensal(monthEntries, catId, tamId, incompleteMes);
  renderTop10(monthEntries, catId, tamId);
  renderHorario(monthEntries, catId, tamId);
  renderTamanho(monthEntries, catId);
  renderCategoria(monthEntries, tamId);
}

// ── Inicializar ───────────────────────────────────────────
fetch('dados.json')
  .then(r => r.json())
  .then(data => {
    DATA = data;

    // Preencher select de categorias
    const selCat = document.getElementById('filter-categoria');
    Object.entries(DATA.categorias)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([nome, id]) => {
        const opt = document.createElement('option');
        opt.value = String(id);
        opt.textContent = nome;
        selCat.appendChild(opt);
      });

    // Preencher select de tamanhos
    const selTam = document.getElementById('filter-tamanho');
    Object.entries(DATA.tamanhos)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([nome, id]) => {
        const opt = document.createElement('option');
        opt.value = String(id);
        opt.textContent = nome;
        selTam.appendChild(opt);
      });

    // Render inicial
    render();

    // Botão aplicar
    document.getElementById('apply-filters').addEventListener('click', render);

    // Toggle Top-10
    document.getElementById('btn-unidades').addEventListener('click', () => {
      top10Mode = 'unidades';
      document.getElementById('btn-unidades').classList.add('active');
      document.getElementById('btn-faturamento').classList.remove('active');
      render();
    });
    document.getElementById('btn-faturamento').addEventListener('click', () => {
      top10Mode = 'faturamento';
      document.getElementById('btn-faturamento').classList.add('active');
      document.getElementById('btn-unidades').classList.remove('active');
      render();
    });
  })
  .catch(err => {
    console.error('Erro ao carregar dados.json:', err);
    document.body.innerHTML = '<p style="padding:2rem;color:red">Erro ao carregar dados.json. Verifique o servidor HTTP.</p>';
  });
