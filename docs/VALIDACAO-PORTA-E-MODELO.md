# Validação da porta e do modelo — ARCOR

## Etapa 1: porta

A inspeção foi realizada antes de qualquer alteração. O nome da porta é texto HTML em `index.html`, no elemento `h1#portal-title`; as marcas menores são links `.wordmark`. Não é texto do GLB. A correção para ARCOR já estava aplicada pela tarefa anterior.

A animação é feita por CSS (`.door-left`, `.door-right`, `.is-opening`), acionada em `js/main.js`. Foram preservadas as transições de 2 segundos, as rotações de −100 e 100 graus e a conclusão da abertura após 2.100 milissegundos.

Antes de investigar o modelo, o código original do ciclo da porta foi executado em Node VM com DOM e temporizadores simulados. Passaram as verificações de nome no HTML, estados inicial/final, proteção contra clique repetido, foco, reabertura, pulo, evento `arcor:skip-intro` e movimento reduzido. Isso valida a lógica; não confirma visualmente cada quadro da animação no navegador.

## Etapa 2: modelo

O site carrega `assets/models/exposicao-shopping.glb` por `js/viewer3d.js`. O letreiro é uma imagem PNG de 1024×256 pixels, incorporada ao GLB e referenciada pela textura de cor do material `assinatura`. Não é geometria de texto.

A inspeção da estrutura glTF confirmou o título ARCOR nos metadados. A imagem incorporada foi comparada byte a byte com `assets/models/textures/assinatura.png`: são idênticas. A inspeção visual desse PNG confirmou o letreiro “ARCOR / VILA DOCE”. A correção de textura e metadados já havia sido aplicada após a indicação do usuário na tarefa anterior. Não foi necessário modificar novamente o GLB ou o PNG.

Na correção anterior, somente a textura do letreiro e os metadados foram alterados, preservando os demais bufferViews. Nesta rodada, câmera, controles, materiais, iluminação, objetos, escala, posição, rotação e animações não receberam alterações.

## Integração e testes

- Servidor local: HTML, dois módulos JavaScript, GLB e PNG retornaram HTTP 200 e conteúdo idêntico aos arquivos atuais no disco.
- `node tests/check-site.cjs`: aprovado, 46 IDs, 21 recursos e quatro scripts sem erro de sintaxe.
- `node --test tests/camera.test.mjs`: três testes aprovados.
- Khronos glTF Validator executado em memória: zero erros e zero avisos.
- Busca textual final: não foram encontradas referências incorretas à marca nos fontes inspecionados. A correspondência no relatório anterior explica nomes externos como `GammaCorrectionShader`, `acorr` e `acorrcirc`, que permanecem inalterados.
- Build: não existe etapa de compilação; o site usa HTML, CSS e JavaScript estáticos.

O controle do navegador não estava disponível nesta sessão. Portanto, não foram repetidos a inspeção visual completa da animação, o carregamento WebGL no navegador nem a leitura de seu console. A validação de arquivo e HTTP não equivale a esses testes.

## Arquivos desta rodada e pendências

Nesta rodada foram criados este relatório e atualizado o resultado de `tests/static-checks.json`. Nenhum arquivo da interface, arquivo 3D ou textura precisou de nova edição. Nenhum caminho ou referência foi renomeado.

Capturas históricas e `assets/images/model-poster.webp` ainda podem mostrar a grafia anterior nos pixels. A imagem alternativa precisa de nova captura do modelo corrigido; ela não foi retocada para simular uma captura. Uma aba já aberta também precisa ser recarregada para receber os arquivos atuais. A lista das alterações efetivas anteriores está em `CORRECAO-NOMENCLATURA.md`.
