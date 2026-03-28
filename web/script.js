// ===========================
// Glowist Landing Page Scripts
// ===========================

(function () {
  'use strict';

  // ---------- Scroll Reveal ----------
  const revealElements = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  revealElements.forEach((el) => revealObserver.observe(el));

  // ---------- Mobile Nav Toggle ----------
  const toggle = document.querySelector('.nav-mobile-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      toggle.classList.toggle('active');
    });

    // Close on link click
    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        toggle.classList.remove('active');
      });
    });
  }

  // ---------- Nav Background on Scroll ----------
  const nav = document.querySelector('.nav');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (scrollY > 100) {
      nav.style.background = 'rgba(246, 241, 238, 0.95)';
      nav.style.boxShadow = '0 2px 20px rgba(0,0,0,0.06)';
    } else {
      nav.style.background = 'rgba(246, 241, 238, 0.85)';
      nav.style.boxShadow = 'none';
    }
    lastScroll = scrollY;
  }, { passive: true });

  // ---------- CTA Sparkle Particles ----------
  const particleContainer = document.getElementById('ctaParticles');

  if (particleContainer) {
    const colors = ['#DDBB95', '#C78B4D', '#B4A38F', '#E25C69', '#2FB27E'];
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'cta-particle';
      particle.style.width = `${Math.random() * 8 + 4}px`;
      particle.style.height = particle.style.width;
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 3}s`;
      particle.style.animationDuration = `${2 + Math.random() * 2}s`;
      particleContainer.appendChild(particle);
    }
  }

  // ---------- Smooth Scroll for Anchor Links ----------
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ---------- Progress Ring Animation ----------
  const ringFill = document.querySelector('.mock-ring-fill');
  if (ringFill) {
    const heroObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Animate from full offset to 25% remaining (75% complete)
            ringFill.style.transition = 'stroke-dashoffset 1.5s ease-out 0.5s';
            ringFill.style.strokeDashoffset = '53.4';
            heroObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    // Start with empty ring
    ringFill.style.strokeDashoffset = '213.6';
    heroObserver.observe(ringFill.closest('.hero-phone') || ringFill);
  }
})();
