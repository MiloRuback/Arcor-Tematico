# Exposição Shopping — ARCOR

Modelo 3D conceitual produzido a partir das três imagens fornecidas e do vídeo `tripo-showcase-30e4c10f-5f2f-437f-bdbf-bbf101605299.mp4`. A composição preserva 7 Belo à esquerda, Paçoca do Amor ao centro e Poosh! à direita. O site existente não foi alterado.

## Entregáveis

Todos os caminhos abaixo são relativos à raiz `D:/site_arco`.

| Arquivo | Finalidade |
|---|---|
| `assets/models/exposicao-shopping.glb` | Ativo final glTF 2.0 Binary, com geometria, normais, UVs, materiais PBR e texturas incorporadas |
| `assets/models/source/gerar_modelo.py` | Fonte editável e reproduzível da cena |
| `assets/models/source/requirements.txt` | Dependências Python |
| `assets/models/textures/*.png` | Dez texturas geradas pelo script; cópias para edição, dispensáveis no carregamento do GLB |
| `assets/models/estatisticas.json` | Contagens e dimensões exatas da exportação |
| `assets/models/validacao-gltf.json` | Resultado completo do Khronos glTF Validator |
| `assets/models/preview-*.jpg` | Capturas do GLB efetivamente renderizado no navegador |
| `tests/model-viewer.html` | Visualizador isolado com rotação, zoom, deslocamento e vistas dos estandes |
| `tests/vendor/*` | Three.js 0.180.0 e componentes locais, com licença MIT |
| `tests/validate-model.cjs` | Comando reproduzível de validação |
| `tests/tools/package.json`, `tests/tools/package-lock.json` | Versões das ferramentas de validação e visualização |
| `tests/servir.ps1` | Servidor local para a página de teste |
| `tests/reference/video-01.jpg` | Quadro extraído do vídeo para analisar o estande circular |

## Ferramentas e métricas

Geometria produzida com Python, NumPy e Trimesh; texturas procedurais e letreiros com Pillow. Normais ponderadas pelos ângulos, calculadas em NumPy. Visualização real com Three.js/WebGL, sem substituir a cena por fotografia ou plano.

- GLB: aproximadamente **8,32 MB**, abaixo da meta de 15 MB.
- **70 malhas renderizáveis**, organizadas em grupos semânticos; cerca de **2.719 peças** antes do agrupamento.
- Aproximadamente **258 mil triângulos** e **135 mil vértices**. Valores finais exatos em `estatisticas.json` e `validacao-gltf.json`.
- **33 materiais PBR**, incluindo madeira, vidro, metal, plástico, doces, amendoim, gelo, piso e emissivos.
- **10 texturas PNG incorporadas**: quatro de 512 × 512, cinco de 1024 × 256 e uma de 256 × 128. Sem arquivos externos necessários ao GLB.
- Coração com **1.612 grãos modelados em volume**, agrupados em uma malha com o núcleo. Os grãos usam a mesma geometria-base de baixa resolução; a exportação agrega suas cópias para diminuir chamadas de desenho, sem depender de extensões de instanciamento.
- Escala de **1 unidade = 1 metro**, eixo vertical **Y**, frente **+Z**. Piso de circulação em Y = 0; espessura da laje até Y = −0,31 m. Centro horizontal próximo da origem.
- Conjunto com aproximadamente **22 × 10 m**, contexto arquitetônico com 5 m de altura; coroamentos dos estandes com aproximadamente 3,8–4,1 m.
- UVs e normais presentes em todas as malhas. Roughness e metallic definidos por material; iluminação cenográfica representada por geometria emissiva.

## Conteúdo da cena

**Paçoca do Amor:** coração volumétrico com cobertura de grãos, palco circular, pódio iluminado, quatro balcões curvos, madeira ripada, prateleiras com produtos, pilares e anéis dourados, letreiro e corações suspensos. A estrutura circular foi conferida no quadro do vídeo fornecido.

**7 Belo:** pórtico com pilares listrados e pirulitos espirais, prateleiras e balcões com baleiros, ursinhos, rosquinha com granulados e mascote tridimensional de carta com sete ouros, números 7, olhos, sorriso, braços e pernas.

**Poosh!:** quarto aberto na frente, paredes e base de gelo texturizado, juntas e setas emissivas, cama com embalagem, colchão e travesseiros, árvore de Natal, presentes, boneco de neve com snowboard, trilhos helicoidais, projetor e máquina de doces. A ausência de teto opaco permite observar o interior.

## Validação e teste

Validação completa com **Khronos glTF Validator 2.0.0-dev.3.10**, sem truncamento: **zero erros, zero avisos e zero hints**. Permanecem 55 informações `UNUSED_OBJECT`, referentes a canais UV preservados em materiais que utilizam cores sólidas, sem textura. Esses UVs foram mantidos para facilitar edição futura.

O GLB foi carregado na página Three.js local e inspecionado nas vistas do conjunto e de cada atração. Os controles permitem órbita, aproximação, afastamento e deslocamento. A validação confirma normais e atributos compatíveis com glTF, texturas internas e ausência de dependências de arquivos de imagem externos.

O teste foi feito no navegador desktop disponível. Não foi realizado benchmark de FPS em celulares nem teste de importação em Blender ou model-viewer.

## Abrir o visualizador

No PowerShell, a partir da raiz do projeto:

```powershell
./tests/servir.ps1
```

Depois abra `http://127.0.0.1:8765/tests/model-viewer.html`. O visualizador utiliza bibliotecas locais e não depende de CDN. Evite abrir por `file://`, pois o carregamento do GLB requer HTTP.

Alternativa com Python instalado no PATH:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

## Regenerar e validar

```powershell
python -m pip install -r assets/models/source/requirements.txt
python assets/models/source/gerar_modelo.py
npm.cmd ci --prefix tests/tools --no-audit --no-fund
node tests/validate-model.cjs
```

Neste ambiente, Python também está disponível em `C:/Users/Marco Antônio/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`. Trimesh foi instalado localmente em `.model-tools`, pasta de ferramentas ignorada pelo Git. O script aceita essa instalação e também instalações convencionais via pip.

## Limitações e próxima etapa

- É uma interpretação cenográfica estilizada, com proporções plausíveis, não um levantamento executivo nem reprodução fotogramétrica das referências.
- Os letreiros foram recriados tipograficamente; não são arquivos vetoriais oficiais das marcas.
- Blender não foi encontrado neste ambiente, portanto **não foi produzido arquivo `.blend`**. O script Python preserva a edição/reconstrução e o GLB pode ser importado no Blender para edição manual.
- Vidros utilizam alpha blend, sem refração física. Há detalhes simplificados para manter a cena leve. Transparências agrupadas podem apresentar limitações de ordenação em alguns ângulos.
- Não há fumaça, projeção animada, animação do mascote, colisões ou níveis de detalhe. O projetor e as luminárias são elementos cenográficos. Materiais emissivos não iluminam outras superfícies por si só; a página fornece iluminação externa para inspeção.
- Fontes alternativas em outros sistemas podem mudar discretamente os letreiros gerados. A semente aleatória é fixa para a geometria e as texturas.
- Próxima etapa sugerida: revisar proporções e letreiros com o responsável pela apresentação e então integrar o GLB ao visualizador do site, com testes em celular e eventual compressão Meshopt/KTX2. A integração e a animação de porta não fazem parte desta entrega.
