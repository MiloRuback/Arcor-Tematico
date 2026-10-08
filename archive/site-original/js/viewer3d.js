/* ==================================================
   PROJETO ARCO - VISUALIZADOR 3D
   ==================================================
   Este script gerencia o carregamento e interação com modelos 3D.
   Foi projetado para ser facilmente modificado por outras IAs.
================================================== */

// ==================================================
// CONFIGURAÇÃO CENTRAL (MODIFIQUE AQUI PARA TROCAR O MODELO)
// ==================================================
const MODEL_CONFIG = {
    name: "Projeto ARCO",
    // Para adicionar um modelo 3D, coloque-o na pasta models e altere o nome do arquivo abaixo:
    file: "./models/parque-arco.glb", 
    // Poster mostrado enquanto carrega (ou caso falhe)
    poster: "./images/projeto/placeholder-3d.jpg" 
};

// ==================================================
// GALERIA (PREPARAÇÃO FUTURA)
// ==================================================
const MODELS = [
    {
        id: "parque",
        name: "Parque ARCO",
        file: "./models/parque-arco.glb",
        description: "Modelo 3D completo do projeto."
    },
    {
        id: "cascata",
        name: "Cascata Central",
        file: "./models/cascata.glb",
        description: "Cascata central do projeto."
    },
    {
        id: "mascote",
        name: "Mascote",
        file: "./models/mascote.glb",
        description: "Representação 3D do mascote."
    }
];

// ==================================================
// LÓGICA DO VISUALIZADOR
// ==================================================
document.addEventListener('DOMContentLoaded', () => {
    // Referências aos elementos DOM
    const modelViewer = document.getElementById('arco-model-viewer');
    const statusOverlay = document.getElementById('viewer-status-overlay');
    const statusTitle = document.getElementById('viewer-status-title');
    const statusDesc = document.getElementById('viewer-status-desc');
    
    // Controles personalizados
    const btnFullscreen = document.getElementById('btn-fullscreen');
    const btnReset = document.getElementById('btn-reset');
    const btnAutoRotate = document.getElementById('btn-autorotate');
    const btnExplore = document.getElementById('btn-explore-3d-action');

    if (!modelViewer) return;

    // 1. CARREGAMENTO INICIAL SOB DEMANDA (LAZY LOAD)
    // Não carrega o modelo 3D até que o usuário clique ou role até a seção
    // Aqui usamos o clique no botão como trigger para maior performance,
    // mas o model-viewer web component também gerencia lazy loading internamente.
    
    let isModelLoaded = false;

    function attemptToLoadModel(modeloURL) {
        if (isModelLoaded) return;
        
        statusTitle.textContent = "Carregando modelo 3D...";
        statusDesc.textContent = "Preparando a experiência...";
        
        // Atribui o src ao model-viewer. 
        // O web component começará o download do .glb
        modelViewer.src = modeloURL;
        
        // Mostra o visualizador
        modelViewer.style.display = "block";
    }

    // Listener para o botão "Explorar em 3D"
    if (btnExplore) {
        btnExplore.addEventListener('click', (e) => {
            e.preventDefault();
            attemptToLoadModel(MODEL_CONFIG.file);
            document.querySelector('#modelo3d').scrollIntoView({behavior: 'smooth'});
        });
    }

    // 2. EVENTOS DO MODEL-VIEWER
    
    // Evento de sucesso ao carregar
    modelViewer.addEventListener('load', () => {
        isModelLoaded = true;
        // Esconde a tela de aviso/status
        statusOverlay.classList.add('hidden');
    });

    // Evento de erro ao carregar (ex: arquivo GLB não existe ainda)
    modelViewer.addEventListener('error', (error) => {
        console.warn("Modelo 3D não encontrado. A interface exibirá a mensagem de preparação.");
        statusTitle.textContent = "MODELO 3D EM PREPARAÇÃO";
        statusDesc.textContent = "A visualização volumétrica do projeto estará disponível em breve.";
        
        // Remove a fonte para não tentar carregar infinitamente e quebrar o visual
        modelViewer.removeAttribute('src'); 
    });

    // 3. CONTROLES PERSONALIZADOS DA INTERFACE
    
    // Tela cheia
    if (btnFullscreen) {
        btnFullscreen.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                const wrapper = document.querySelector('.viewer-wrapper');
                if (wrapper.requestFullscreen) {
                    wrapper.requestFullscreen();
                } else if (wrapper.webkitRequestFullscreen) { /* Safari */
                    wrapper.webkitRequestFullscreen();
                } else if (wrapper.msRequestFullscreen) { /* IE11 */
                    wrapper.msRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        });
    }

    // Resetar Câmera
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            // Reseta a câmera para os valores padrão
            modelViewer.cameraOrbit = "auto auto auto";
            modelViewer.cameraTarget = "auto auto auto";
        });
    }

    // Alternar Rotação Automática
    if (btnAutoRotate) {
        btnAutoRotate.addEventListener('click', () => {
            const hasAutoRotate = modelViewer.hasAttribute('auto-rotate');
            if (hasAutoRotate) {
                modelViewer.removeAttribute('auto-rotate');
                btnAutoRotate.style.opacity = '0.5';
            } else {
                modelViewer.setAttribute('auto-rotate', '');
                btnAutoRotate.style.opacity = '1';
            }
        });
    }
});
