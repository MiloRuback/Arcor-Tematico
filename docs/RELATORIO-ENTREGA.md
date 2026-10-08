# Entrega ARCOR

O modelo real GLB foi integrado à página principal, mantendo HTML, CSS, JavaScript e Three.js. A apresentação reúne a abertura com portas, exploração 3D, narrativa dos três estandes, vídeo original e galeria ampliável. A etapa final refinou o cenário existente sem substituir a tecnologia do projeto.

## Arquivos alterados e criados

| Arquivo ou diretório | Resultado |
| --- | --- |
| `index.html` | Apresentação, seções semânticas, controles, vídeo e galeria |
| `css/style.css` | Identidade visual, portas, estilos responsivos, foco e movimento reduzido |
| `js/main.js` | Abertura, carregamento progressivo, vídeo e galeria |
| `js/navigation.js` | Menu, âncoras, foco e tema conforme a seção |
| `js/viewer3d.js` | GLB, câmera, iluminação, carregamento, falhas e descarte de recursos |
| `js/camera-constraints.mjs` | Limites da câmera e volumes de proteção dos estandes |
| `assets/vendor/` | Three.js, carregador GLTF, controles e ambiente de iluminação locais |
| `assets/fonts/` | Fontes locais e respectivas licenças |
| `assets/images/` | Referências WebP, capa do vídeo e imagem alternativa limpa do modelo |
| `assets/models/exposicao-shopping.glb` | Modelo final integrado |
| `assets/models/source/gerar_modelo.py` | Fonte reproduzível da geometria, materiais e texturas |
| `assets/models/textures/` | Texturas procedurais de edição |
| `assets/models/estatisticas.json` | Dimensões e contagens da exportação |
| `assets/models/validacao-gltf.json` | Validação completa Khronos |
| `tests/check-site.cjs`, `tests/camera.test.mjs` | Verificação de arquivos, sintaxe e limites da câmera |
| `tests/validate-model.cjs` | Validação reproduzível do GLB |
| `tests/screenshots/` | Evidências das inspeções no navegador |
| `tests/servir.ps1`, `README.md` | Inicialização e instruções |
| `archive/site-original/`, `archive/modelo-v1/` | Versões anteriores preservadas |

As três imagens fornecidas e o MP4 original foram preservados. A galeria utiliza as imagens de referência, identificadas como referências do projeto; a cena interativa usa geometria real.

## Integração 3D

O botão de entrada inicia o carregamento do GLB. As bibliotecas são importadas sob demanda, com progresso baseado nos bytes recebidos e limite de tempo. Links diretos para outras seções adiam o modelo até sua área entrar na tela.

Há vistas de cada estande, rotação, zoom, retorno à vista geral e controle por teclado. O menu móvel, a galeria e o vídeo funcionam independentemente do WebGL. Falhas apresentam imagem alternativa, acesso às referências e opção de nova tentativa. A causa técnica permanece no DOM e em evento de diagnóstico.

## Melhorias visuais

- **Câmera:** enquadramento ajustado à proporção da tela; Paçoca como vista inicial compacta; limites de zoom, altura e volumes de proteção. O título sai da frente ao explorar.
- **Iluminação:** luz principal quente, preenchimento frio, ambiente para materiais PBR, tone mapping e sombras dos elementos principais.
- **Materiais:** rugosidade mais adequada em madeira, metal e doces; relevo de madeira e amendoim com normal maps e tangentes explícitas; variação entre três tons dos grãos.
- **Vegetação:** pequenos vasos no estande Paçoca; pinheiro natalino preservado no Poosh.
- **Cenário e arquitetura:** três estandes mantidos lado a lado, piso, contexto de shopping, balcões curvos, coração, mascote, quarto de gelo e equipamentos cenográficos.
- **Identidade ARCOR:** tipografia editorial, cores por universo, abertura arquitetônica, implantação conceitual e percurso de apresentação.
- **Água e areia:** não existem na composição modelada a partir das referências fornecidas. Não foram acrescentadas cascatas, praia ou vegetação tropical ao conjunto de estandes.

## Performance

O GLB final tem **12.872.840 bytes (12,873 MB)**, **75 malhas**, **338.602 triângulos**, **175.915 vértices** e **36 materiais**. Fica abaixo da meta de 15 MB. Existem 12 texturas-fonte; a exportação incorpora 16 imagens porque alguns materiais compartilham conteúdos que o exportador repete.

As 2.760 peças são agrupadas por material e grupo semântico, resultando em 75 chamadas de desenho do modelo por passagem. Sombras acrescentam passagens. A resolução de renderização é limitada por tamanho de tela, com sombras desativadas em telas pequenas. Um único ciclo de renderização pausa quando a cena fica fora da tela ou a página fica oculta. Geometrias, materiais, texturas, controles e observadores são descartados ao encerrar ou reiniciar a experiência, inclusive no caso de parsing que termina depois do cancelamento.

As imagens usam WebP, fontes e bibliotecas são locais e o vídeo carrega perto da área visível. Dispositivos que sinalizam economia de dados ou pouca memória podem iniciar com imagem alternativa. Não houve benchmark de FPS ou memória em celular físico.

## Problemas encontrados e corrigidos

| Problema | Correção |
| --- | --- |
| Modelo existia apenas no visualizador isolado | Integração na apresentação principal |
| Possibilidade de câmera atravessar o cenário | Distâncias, limite de altura e volumes conservadores de proteção |
| Título competia com a cena durante a exploração | Ocultação contextual ao interagir |
| Falhas de WebGL podiam interromper a experiência | Imagem alternativa e nova tentativa |
| Recursos poderiam permanecer após erro ou cancelamento | Descarte explícito e cancelamento de listeners e fetch |
| Normal maps geravam sete avisos de tangentes ausentes | Cálculo das tangentes compatível com UVs exportados |
| Imagem alternativa continha controles do teste | Substituição pela captura limpa do modelo final |
| Unidade D: temporariamente indisponível | Trabalho retomado após reconexão, sem recriar a pasta nem sobrescrever cópias por suposição |

## Testes e resultados

Comandos executados na pasta do projeto:

```powershell
node tests/check-site.cjs
node --test tests/camera.test.mjs
node tests/validate-model.cjs
```

- Verificação estática: 46 IDs, 21 recursos locais, quatro scripts com sintaxe válida e nenhum recurso ausente.
- Câmera: três testes aprovados, incluindo varredura das órbitas suportadas, limites de zoom e altura acima do piso.
- Khronos glTF Validator: **zero erros, zero avisos e zero hints**. As 58 informações `UNUSED_OBJECT` correspondem a atributos UV mantidos em malhas com materiais de cor sólida.
- Navegador: GLB carregado e renderizado na página principal; materiais finais inspecionados em vista geral e aproximada.
- Responsividade inspecionada em 1920×1080, 1366×768, 1024×768, 768×1024 e 390×844, sem transbordamento horizontal na rodada de integração.
- Menu móvel, navegação para galeria, avanço do lightbox, fechamento por Escape e restauração de foco conferidos.
- Vídeo original carregado e reproduzido sem áudio automático; interação conceitual Poosh conferida.
- Falha simulada por `?webgl=off` apresentou imagem alternativa sem canvas.
- `?motion=reduce` desativou reprodução automática do vídeo e reduziu transições. Esse teste usa uma opção de diagnóstico; não equivale a testar todas as configurações de acessibilidade de cada sistema.

A rodada responsiva ocorreu antes do último ajuste da vista inicial compacta e do refinamento final dos materiais. A vista geral final foi inspecionada; não foi repetida toda a matriz de navegadores após a indisponibilidade das ferramentas de controle do navegador. Não há build de aplicação: trata-se de um site estático. Os testes não substituem avaliação em aparelhos físicos.

## Limitações e próximos passos úteis

O modelo é uma interpretação cenográfica estilizada, não uma reconstrução fotogramétrica ou projeto executivo. Os letreiros foram recriados tipograficamente; não são vetores oficiais. Não foi produzido arquivo `.blend`, pois Blender não estava disponível; o GLB e o gerador Python permanecem editáveis. Vidros usam transparência simples e emissivos não simulam iluminação física por si mesmos. Sensores, aromas e projeções são explicados como proposta, sem alegar acionamento de hardware real.

Próximas melhorias úteis: medir FPS em celulares reais; revisar proporções e letreiros com o responsável pela apresentação; avaliar compressão Meshopt/KTX2 e níveis de detalhe se o teste em aparelhos indicar necessidade. Nenhuma publicação externa foi realizada.
