/* ==================================================
   PROJETO ARCO - NAVEGAÇÃO
   ==================================================
   Gerencia o comportamento do cabeçalho e scroll suave.
================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('header');
    
    // 1. CABEÇALHO FIXO COM MUDANÇA DE ESTILO NO SCROLL
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 2. SCROLL SUAVE PARA LINKS ÂNCORA
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            // Evita o comportamento padrão do link
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                // Calcula a posição considerando a altura do cabeçalho
                const headerHeight = header.offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
});
