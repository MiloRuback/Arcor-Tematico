/* ==================================================
   PROJETO ARCO - SCRIPT PRINCIPAL
   ==================================================
   Inicializações gerais, animações de scroll e interatividade.
================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. ANIMAÇÕES DE SCROLL (REVEAL)
    // Mostra os elementos suavemente quando entram na tela
    const revealElements = document.querySelectorAll('.reveal');

    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Opcional: Descomentar linha abaixo se quiser que a animação aconteça apenas uma vez
                // observer.unobserve(entry.target); 
            }
        });
    };

    const revealOptions = {
        threshold: 0.15, // Porcentagem do elemento visível para disparar
        rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver(revealCallback, revealOptions);

    revealElements.forEach(el => revealObserver.observe(el));


    // 2. LAZY LOADING DE IMAGENS DE FUNDO (SE NECESSÁRIO FUTURAMENTE)
    // Prepara a estrutura caso as imagens fiquem muito pesadas
    
    // 3. INICIALIZAÇÃO DE OUTROS MÓDULOS
    // A inicialização da navegação e do visualizador 3D é feita
    // diretamente nos seus respectivos arquivos js utilizando módulos (ES6) 
    // ou defer na importação do HTML.
});
