# Spec – Dashboard Vitto (Aula 8)

## Usuário e uso
- **Usuário principal**: Vitto (gerente da pizzaria) e equipe de planejamento.
- **Objetivo**: disponibilizar, em um dashboard web, as principais métricas de desempenho da pizzaria para apoiar decisões sobre cardápio, escala de equipe e estratégias de venda.
- **Audiência**: gestores, analistas de negócios e stakeholders da Pizzaria do Vitto.

## KPIs do topo
| KPI | Valor esperado (controle da aula) |
|-----|-----------------------------------|
| **Faturamento total (período)** | R$ 4 089 300,25 |
| **Pedidos distintos** | 21 350 |
| **Ticket médio** | R$ 191,54 |

## Gráficos
- **Faturamento por mês** – barras ordenadas por tempo, eixo Y iniciando em 0, mês incompleto (agosto/2026) destacado em cor única.
- **Top 10 pizzas** – barra horizontal com seletor entre “unidades” e “faturamento”; apenas as 10 primeiras são exibidas.
- **Pizzas vendidas por hora do dia** – histograma de 24 h (eixo Y começando em 0).
- **Vendas por tamanho** – barra horizontal para cada tamanho (P, M, G, GG).
- **Vendas por categoria** – barra horizontal para cada categoria (Clássica, Especial, Frango, Vegetariana).

## Filtros
- **Mês inicial** e **Mês final** (seleção de intervalo de datas).
- **Categoria** (Clássica, Especial, Frango, Vegetariana).
- **Tamanho** (P, M, G, GG).
> Todos os filtros devem impactar simultaneamente os KPIs e os gráficos.

## Dados
- **Script responsável**: `scripts/agrega.py` (lerá `dados/vendas-pizzas.csv`).
- **Saída**: `dados.json` contendo apenas os campos necessários; tamanho < 200 KB.
- O navegador deve carregar **apenas `dados.json`**; o CSV nunca será servido ao front‑end.
- **Tratamento da linha sem quantidade**: mantida no dataset, mas excluída dos cálculos que requerem a coluna `quantidade`.
- Fonte de dados: `dados/vendas-pizzas.csv` (48 620 linhas, 16 colunas).

## Regras visuais
- Barras ordenadas da maior para a menor, exceto no eixo de tempo (faturamento mensal).
- Eixo de valores sempre começa em zero.
- Cada gráfico usa **uma única cor de destaque**; as demais barras são cinza.
- Títulos dos gráficos apresentam a conclusão principal (ex.: “Faturamento total cresce ao longo do período”).
- **Nenhum gráfico de pizza** com mais de 3 fatias (não se aplica aqui, pois usamos apenas barras).
- **Uma cor de destaque** deve ser usada de forma consistente em todo o dashboard.

## Critérios de conclusão
- **Sem filtros aplicados**: faturamento R$ 4 089 300,25; pedidos 21 350; ticket médio R$ 191,54.
- **Filtro janeiro/2025 a julho/2026**: faturamento R$ 4 068 031,25; pedidos 21 245.
- **Selecionar a categoria “Frango”** altera os três KPIs e os quatro gráficos acima.
- **Largura do dashboard**: 390 px máximo, sem rolagem horizontal.
- **dados.json** deve ter tamanho inferior a 200 KB.

---
*Este spec segue exatamente as orientações da Aula 8, mantendo a descrição correta da base de dados e o tratamento da linha sem quantidade.*