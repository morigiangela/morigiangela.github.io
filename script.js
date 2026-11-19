// ==========================================================================
// INTERATIVIDADE DO SITE PESSOAL - ANGELA VEIGA MORIGI
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const navLinks = document.getElementById('navLinks');
  const links = document.querySelectorAll('.nav-link');

  // Alternar menu mobile
  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('show');
    });

    // Fechar o menu ao clicar em qualquer link
    links.forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('show');
      });
    });
  }

  // Destacar link ativo conforme o scroll da página
  const sections = document.querySelectorAll('section[id]');
  
  function updateActiveLink() {
    const scrollY = window.pageYOffset;

    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 120;
      const sectionId = current.getAttribute('id');

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        document.querySelectorAll('.nav-links a[href*=' + sectionId + ']').forEach(link => {
          link.classList.add('active');
        });
      } else {
        document.querySelectorAll('.nav-links a[href*=' + sectionId + ']').forEach(link => {
          link.classList.remove('active');
        });
      }
    });
  }

  window.addEventListener('scroll', updateActiveLink);
});
