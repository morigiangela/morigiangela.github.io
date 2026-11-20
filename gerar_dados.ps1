# ============================================================
# Gera dashboard-vitto/dados.json a partir de vendas-pizzas.csv
# Inclui: pizzas, tamanhos, categorias, meses (com hora), totais
# ============================================================

$csvPath    = 'C:\Users\mairo\Desktop\Documentos- projetos- ia\morigiangela.github.io\dashboard-vitto\dados\vendas-pizzas.csv'
$outputPath = 'C:\Users\mairo\Desktop\Documentos- projetos- ia\morigiangela.github.io\dashboard-vitto\dados.json'

Write-Host "Lendo CSV..."
$rows = Import-Csv -Path $csvPath -Encoding UTF8
Write-Host "Rows: $($rows.Count)"

# ── Dicionários de IDs ────────────────────────────────────────────────────────
$pizzaIds = @{}
$tamIds   = @{}
$catIds   = @{}

$pizzaCounter = 1
$tamCounter   = 1
$catCounter   = 1

foreach ($row in $rows) {
    $sabor = $row.nome_pizza_simp
    if (-not $sabor) { $sabor = $row.nome_pizza }
    if (-not $sabor) { $sabor = $row.sabor_pizza }
    if (-not $sabor) { $sabor = 'desconhecido' }
    $sabor = $sabor.Trim()

    $tam = $row.tamanho
    if (-not $tam) { $tam = 'desconhecido' }
    $tam = $tam.Trim().ToUpper()

    # chave única: sabor + tamanho  
    $pizzaKey = ($sabor + '_' + $tam).ToLower() -replace '\s+', '_' -replace '[^a-z0-9_]', ''

    $cat = $row.categoria
    if (-not $cat) { $cat = 'desconhecido' }
    $cat = $cat.Trim()

    if (-not $pizzaIds.ContainsKey($pizzaKey)) {
        $pizzaIds[$pizzaKey] = $pizzaCounter++
    }
    if (-not $tamIds.ContainsKey($tam)) {
        $tamIds[$tam] = $tamCounter++
    }
    if (-not $catIds.ContainsKey($cat)) {
        $catIds[$cat] = $catCounter++
    }
}

Write-Host "Pizzas únicas: $($pizzaIds.Count), Tamanhos: $($tamIds.Count), Categorias: $($catIds.Count)"

# ── Função de parse de preço ──────────────────────────────────────────────────
function ParsePreco($s) {
    $s = $s -replace 'R\$','' -replace '\s',''
    $s = $s -replace '\.', '' -replace ',', '.'
    try { return [double]$s } catch { return 0.0 }
}

# ── Acumular meses ────────────────────────────────────────────────────────────
# Estrutura: $meses[yyyyMM][pizza|pedidos|hora|cat|tam|fat]
$meses   = @{}
$allPeds = [System.Collections.Generic.HashSet[string]]::new()

Write-Host "Processando linhas..."
$processados = 0

foreach ($row in $rows) {
    $processados++
    if ($processados % 10000 -eq 0) { Write-Host "  $processados / $($rows.Count)" }

    # Data
    $dataTxt = $row.data_pedido
    if (-not $dataTxt) { continue }
    try {
        $dt = [datetime]::ParseExact($dataTxt.Trim(), 'dd/MM/yyyy', [System.Globalization.CultureInfo]::InvariantCulture)
    } catch { continue }
    $mesKey = $dt.ToString('yyyy-MM')

    # Hora (apenas HH)
    $horaIdx = -1
    $horaTxt = $row.hora_pedido
    if ($horaTxt) {
        $h = $horaTxt.Trim().Split(':')[0]
        if ($h -match '^\d+$') { $horaIdx = [int]$h }
    }

    # Preço
    $preco = ParsePreco $row.preco_total

    # Quantidade
    $qtd = 0
    $qtdTxt = $row.quantidade
    if ($qtdTxt -and $qtdTxt.Trim() -ne '') {
        try { $qtd = [int]($qtdTxt.Trim()) } catch { $qtd = 0 }
    }

    # Pizza key
    $sabor = $row.nome_pizza_simp
    if (-not $sabor) { $sabor = $row.nome_pizza }
    if (-not $sabor) { $sabor = $row.sabor_pizza }
    if (-not $sabor) { $sabor = 'desconhecido' }
    $sabor = $sabor.Trim()
    $tam = $row.tamanho
    if (-not $tam) { $tam = 'desconhecido' }
    $tam = $tam.Trim().ToUpper()
    $pizzaKey = ($sabor + '_' + $tam).ToLower() -replace '\s+', '_' -replace '[^a-z0-9_]', ''
    $pizzaId = $pizzaIds[$pizzaKey]

    $catNome = $row.categoria
    if (-not $catNome) { $catNome = 'desconhecido' }
    $catNome = $catNome.Trim()
    $cid = $catIds[$catNome]
    $tid = $tamIds[$tam]

    # Inicializar mês
    if (-not $meses.ContainsKey($mesKey)) {
        $meses[$mesKey] = @{
            pizza = @{}
            pedidos = [System.Collections.Generic.HashSet[string]]::new()
            hora = @{}
            cat  = @{}
            tam  = @{}
            faturamento = 0.0
        }
    }
    $m = $meses[$mesKey]

    # Pedido
    $idPed = $row.id_pedido
    if ($idPed) {
        [void]$m.pedidos.Add($idPed.Trim())
        [void]$allPeds.Add($idPed.Trim())
    }

    # Pizza
    $pidStr = "$pizzaId"
    if (-not $m.pizza.ContainsKey($pidStr)) {
        $m.pizza[$pidStr] = @{ unidades = 0; faturamento = 0.0 }
    }
    $m.pizza[$pidStr].faturamento += $preco
    if ($qtd -gt 0) { $m.pizza[$pidStr].unidades += $qtd }

    # Hora
    if ($horaIdx -ge 0) {
        $hStr = "$horaIdx"
        if (-not $m.hora.ContainsKey($hStr)) { $m.hora[$hStr] = 0.0 }
        $m.hora[$hStr] += $preco
    }

    # Categoria
    $cidStr = "$cid"
    if (-not $m.cat.ContainsKey($cidStr)) { $m.cat[$cidStr] = @{ unidades = 0; faturamento = 0.0 } }
    $m.cat[$cidStr].faturamento += $preco
    if ($qtd -gt 0) { $m.cat[$cidStr].unidades += $qtd }

    # Tamanho
    $tidStr = "$tid"
    if (-not $m.tam.ContainsKey($tidStr)) { $m.tam[$tidStr] = @{ unidades = 0; faturamento = 0.0 } }
    $m.tam[$tidStr].faturamento += $preco
    if ($qtd -gt 0) { $m.tam[$tidStr].unidades += $qtd }

    # Faturamento total do mês
    $m.faturamento += $preco
}

Write-Host "Meses processados: $($meses.Count)"
Write-Host "Pedidos distintos totais: $($allPeds.Count)"

# ── Montar JSON final ─────────────────────────────────────────────────────────
$mesesJson = [ordered]@{}
$totalFat = 0.0

foreach ($mk in ($meses.Keys | Sort-Object)) {
    $m = $meses[$mk]
    $totalFat += $m.faturamento

    # Converter hora keys de string para int para ordenar
    $horaOrdered = [ordered]@{}
    foreach ($hk in ($m.hora.Keys | ForEach-Object { [int]$_ } | Sort-Object)) {
        $horaOrdered["$hk"] = [math]::Round($m.hora["$hk"], 2)
    }

    $pizzaJson = [ordered]@{}
    foreach ($pk in ($m.pizza.Keys | Sort-Object { [int]$_ })) {
        $pizzaJson[$pk] = [ordered]@{
            unidades   = $m.pizza[$pk].unidades
            faturamento = [math]::Round($m.pizza[$pk].faturamento, 2)
        }
    }

    $catJson = [ordered]@{}
    foreach ($ck in ($m.cat.Keys | Sort-Object { [int]$_ })) {
        $catJson[$ck] = [ordered]@{
            unidades   = $m.cat[$ck].unidades
            faturamento = [math]::Round($m.cat[$ck].faturamento, 2)
        }
    }

    $tamJson = [ordered]@{}
    foreach ($tk in ($m.tam.Keys | Sort-Object { [int]$_ })) {
        $tamJson[$tk] = [ordered]@{
            unidades   = $m.tam[$tk].unidades
            faturamento = [math]::Round($m.tam[$tk].faturamento, 2)
        }
    }

    $mesesJson[$mk] = [ordered]@{
        pedidosDistintos = $m.pedidos.Count
        faturamentoTotal = [math]::Round($m.faturamento, 2)
        pizza = $pizzaJson
        hora  = $horaOrdered
        cat   = $catJson
        tam   = $tamJson
    }
}

# ── Converter IDs para string nas chaves ──────────────────────────────────────
$pizzaIdsStr = [ordered]@{}
foreach ($k in ($pizzaIds.Keys | Sort-Object)) { $pizzaIdsStr[$k] = $pizzaIds[$k] }

$tamIdsStr = [ordered]@{}
foreach ($k in ($tamIds.Keys | Sort-Object)) { $tamIdsStr[$k] = $tamIds[$k] }

$catIdsStr = [ordered]@{}
foreach ($k in ($catIds.Keys | Sort-Object)) { $catIdsStr[$k] = $catIds[$k] }

$output = [ordered]@{
    pizzas    = $pizzaIdsStr
    tamanhos  = $tamIdsStr
    categorias = $catIdsStr
    meses     = $mesesJson
}

$json = $output | ConvertTo-Json -Depth 10 -Compress
[System.IO.File]::WriteAllText($outputPath, $json, [System.Text.Encoding]::UTF8)

$fileSize = (Get-Item $outputPath).Length
Write-Host ""
Write-Host "===== RESULTADO ====="
Write-Host "Arquivo: $outputPath"
Write-Host "Tamanho: $fileSize bytes ($([math]::Round($fileSize/1024,1)) KB)"
Write-Host "Faturamento total: R$ $([math]::Round($totalFat,2).ToString('N2','pt-BR'))"
Write-Host "Pedidos distintos: $($allPeds.Count)"
if ($allPeds.Count -gt 0) {
    Write-Host "Ticket medio: R$ $([math]::Round($totalFat / $allPeds.Count, 2).ToString('N2','pt-BR'))"
}

# Validar referência jan/2025 a jul/2026
$fatPeriodo = 0.0
$pedsPeriodo = [System.Collections.Generic.HashSet[string]]::new()
foreach ($mk in $meses.Keys) {
    if ($mk -ge '2025-01' -and $mk -le '2026-07') {
        $fatPeriodo += $meses[$mk].faturamento
    }
}
Write-Host ""
Write-Host "Faturamento jan/2025-jul/2026: R$ $([math]::Round($fatPeriodo,2).ToString('N2','pt-BR'))"
Write-Host "Referencia esperada: R$ 4.068.031,25"
Write-Host "===== FIM ====="
