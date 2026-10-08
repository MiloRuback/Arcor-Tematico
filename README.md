# ARCOR — apresentação e exposição 3D

Site estático em HTML, CSS e JavaScript, com Three.js local. Não requer build nem serviços externos.

## Abrir

No PowerShell, na pasta do projeto:

```powershell
./tests/servir.ps1
```

Abra http://127.0.0.1:8765/. Mantenha o terminal do servidor aberto. O script procura Python instalado ou o runtime local do Codex. Não abra o HTML por `file://`: os módulos e o GLB precisam de HTTP.

## Explorar

- Entre pelas portas ou use “Pular abertura”.
- Selecione a vista geral ou um dos três estandes.
- Arraste para girar; use a roda ou os botões para aproximar e afastar.
- Com o canvas focado, use setas, `+`, `-` e `Home`.
- No celular, um dedo rola a página; dois dedos controlam o 3D.
- Imagens abrem em uma galeria com setas e fechamento por `Escape`.

Modelo: `assets/models/exposicao-shopping.glb`. Fonte editável: `assets/models/source/gerar_modelo.py`.

## Verificar

```powershell
npm.cmd ci --prefix tests/tools --no-audit --no-fund
node tests/check-site.cjs
node --test tests/camera.test.mjs
node tests/validate-model.cjs
```

Para regenerar o GLB, instale `assets/models/source/requirements.txt` e execute o script Python. A regeneração substitui o GLB e as texturas procedurais.

Rotas de diagnóstico: `/?webgl=off#modelo3d`, `/?quality=poster#modelo3d` e `/?motion=reduce#video`. A primeira simula indisponibilidade de WebGL; a segunda permite testar o modo leve e tentar carregar o 3D; a terceira permite conferir a preferência por menos movimento. `/?capture=1#modelo3d` mostra somente a cena para captura.

Veja `docs/RELATORIO-ENTREGA.md` para alterações, resultados e limitações. Cópias anteriores estão em `archive/site-original` e `archive/modelo-v1`.
