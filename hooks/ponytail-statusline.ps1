$badge = $input | node (Join-Path $PSScriptRoot 'ponytail-statusline.js')
[Console]::Write($badge)
