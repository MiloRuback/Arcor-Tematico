==================================================
 GUIA PARA ADIÇÃO DE MODELOS 3D - PROJETO ARCO
==================================================

Este diretório é reservado exclusivamente para os modelos 3D do projeto.
A estrutura do site foi desenvolvida para facilitar a integração destes modelos por qualquer desenvolvedor ou Inteligência Artificial.

1. ONDE COLOCAR ARQUIVOS GLB/GLTF:
   Coloque os arquivos com extensão .glb ou .gltf diretamente nesta pasta (models/).

2. COMO NOMEAR OS ARQUIVOS:
   Utilize nomes em minúsculo, sem espaços ou caracteres especiais.
   Exemplos: parque-arco.glb, cascata.glb, mascote.glb.

3. COMO ADICIONAR UM NOVO MODELO:
   Mova o arquivo 3D para esta pasta. Se o modelo representar a visão geral do projeto, você pode simplesmente nomeá-lo como "parque-arco.glb", que é o padrão que o sistema tentará carregar.

4. QUAL VARIÁVEL DEVE SER ALTERADA (CONFIGURAÇÃO):
   Abra o arquivo de script localizado em: js/viewer3d.js.
   Logo no início do arquivo, você encontrará a constante MODEL_CONFIG.
   
5. COMO TROCAR O MODELO PRINCIPAL:
   No arquivo js/viewer3d.js, altere a propriedade 'file' dentro de MODEL_CONFIG para apontar para o seu novo arquivo:
   const MODEL_CONFIG = {
       name: "Projeto ARCO",
       file: "./models/seu-novo-arquivo.glb", // <- ALTERE AQUI
       poster: "./images/projeto/placeholder-3d.jpg"
   };

6. COMO ADICIONAR VÁRIOS MODELOS (GALERIA):
   No arquivo js/viewer3d.js, existe um array chamado MODELS.
   Adicione novos objetos a essa lista com as informações do novo modelo. A estrutura base do site já entende essa configuração e poderá ser facilmente expandida no HTML para gerar botões de troca de modelos.
