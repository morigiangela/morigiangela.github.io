$json = Get-Content 'C:\Users\mairo\Desktop\Documentos- projetos- ia\morigiangela.github.io\dashboard-vitto\dados.json' -Raw | ConvertFrom-Json
$totalFat = 0.0
$totalPed = 0
$fatPeriodo = 0.0
$pedPeriodo = 0
foreach ($mk in ($json.meses | Get-Member -MemberType NoteProperty).Name) {
    $m = $json.meses.$mk
    $totalFat += $m.faturamentoTotal
    $totalPed += $m.pedidosDistintos
    if ($mk -ge '2025-01' -and $mk -le '2026-07') {
        $fatPeriodo += $m.faturamentoTotal
        $pedPeriodo += $m.pedidosDistintos
    }
}
# Hora check
$hora2025_01 = ($json.meses.'2025-01'.hora | Get-Member -MemberType NoteProperty).Count
Write-Host "Faturamento total: $totalFat"
Write-Host "Pedidos totais:    $totalPed"
Write-Host "Ticket medio:      $([math]::Round($totalFat/$totalPed, 2))"
Write-Host ""
Write-Host "Faturamento jan/2025-jul/2026: $fatPeriodo"
Write-Host "Pedidos    jan/2025-jul/2026:  $pedPeriodo"
Write-Host ""
Write-Host "Hora keys em 2025-01: $hora2025_01"
Write-Host "Tamanho arquivo: $((Get-Item 'C:\Users\mairo\Desktop\Documentos- projetos- ia\morigiangela.github.io\dashboard-vitto\dados.json').Length) bytes"
