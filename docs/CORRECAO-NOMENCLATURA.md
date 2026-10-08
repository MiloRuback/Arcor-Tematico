# Correção da nomenclatura ARCOR

Foram corrigidas 33 ocorrências nos arquivos textuais, mais o letreiro e os metadados nos dois arquivos GLB e a textura-fonte do letreiro. Nenhuma pasta ou arquivo foi renomeado.

## Arquivos com correções textuais

- `index.html` (11 ocorrências)
- `README.md` (1)
- `js/main.js` (1)
- `js/navigation.js` (1)
- `js/viewer3d.js` (6)
- `tests/model-viewer.html` (2)
- `tests/servir.ps1` (1)
- `docs/RELATORIO-ENTREGA.md` (2)
- `assets/models/RELATORIO.md` (1)
- `assets/models/source/gerar_modelo.py` (3)
- `archive/modelo-v1/gerar_modelo.py` (3)
- `archive/modelo-v1/RELATORIO.md` (1)

Os eventos internos passaram a `arcor:skip-intro`, `arcor:model-status` e `arcor:model-error`. Emissor e consumidor de abertura foram atualizados juntos. Não foram alterados IDs, classes, rotas, imports, nomes de funções ou nomes de arquivos.

## Letreiro 3D

Após a indicação do letreiro pelo usuário, a textura `assets/models/textures/assinatura.png` e sua versão incorporada foram corrigidas nos GLBs principal e arquivado. Os metadados receberam o nome correto. Foi feita comparação binária de todos os demais bufferViews: geometria, atributos e outras texturas permaneceram idênticos. Não houve regeneração da cena nem alteração de posições, dimensões ou materiais.

As estatísticas de ambos os modelos e os relatórios de tamanho foram atualizados. O arquivo principal tem 12.872.840 bytes. Os resultados em `tests/static-checks.json`, `tests/model-validation-summary.json` e `assets/models/validacao-gltf.json` foram atualizados pela validação.

## Ocorrências mantidas e limites

- Dependências externas foram preservadas: `GammaCorrectionShader` em Three.js e as variáveis `acorr` e `acorrcirc` nos exemplos de autocorrelação do SciPy contêm a sequência pesquisada sem representar a marca. Correspondências em executáveis e caches Python também não são texto do projeto.
- Capturas históricas em `tests/screenshots/`, prévias JPG e a imagem alternativa `assets/images/model-poster.webp` ainda podem mostrar a grafia antiga desenhada nos pixels. Essas imagens não foram retocadas. A imagem alternativa ainda precisa ser recapturada da cena corrigida; a ferramenta de captura do navegador não estava disponível nesta etapa.
- Os arquivos de referência originais e o vídeo foram preservados.
- Este relatório documenta a exceção; a busca textual final nos fontes e documentos anteriores à sua criação não encontrou mais ocorrências da grafia incorreta.

## Validação

- `node tests/check-site.cjs`: aprovado, 46 IDs, 21 recursos locais e quatro scripts com sintaxe válida.
- `node --test tests/camera.test.mjs`: três testes aprovados.
- `node tests/validate-model.cjs`: zero erros e zero avisos.
- Resposta HTTP da página conferida com o título corrigido.
- Não há etapa de build: o projeto é estático.

CSS, layout, cores, animações e comportamento não foram modificados. Uma aba já aberta deve ser recarregada para receber os novos textos e o GLB atualizado.
