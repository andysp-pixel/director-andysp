const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    document.body.classList.toggle('menu-open', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });
  navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    document.body.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }));
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

const projectCards = [...document.querySelectorAll('.project-card[data-category]')];
const filterButtons = [...document.querySelectorAll('.filter-btn')];

function applyPortfolioFilter(filter) {
  filterButtons.forEach(btn => {
    const isActive = btn.dataset.filter === filter;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });

  projectCards.forEach(card => {
    const categories = (card.dataset.category || '').split(/\s+/).filter(Boolean);
    const shouldShow = filter === 'all' || categories.includes(filter);

    card.hidden = !shouldShow;
    card.classList.toggle('filtered-out', !shouldShow);
    card.setAttribute('aria-hidden', String(!shouldShow));

    if (!shouldShow) {
      const video = card.querySelector('video');
      if (video && !video.paused) video.pause();
    }
  });
}

filterButtons.forEach(button => {
  button.setAttribute('aria-pressed', String(button.classList.contains('active')));
  button.addEventListener('click', () => applyPortfolioFilter(button.dataset.filter || 'all'));
});

// Keep portfolio playback clean: when one local video starts, pause the others.
const portfolioVideos = [...document.querySelectorAll('video')];
portfolioVideos.forEach(video => {
  video.addEventListener('play', () => {
    portfolioVideos.forEach(other => {
      if (other !== video && !other.paused) other.pause();
    });
  });
});

const bookingForm = document.querySelector('#bookingForm');
if (bookingForm) {
  bookingForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(bookingForm);
    const message = [
      'Hi Director Andy SP, I would like to book a project.',
      '',
      `Name: ${data.get('name') || '-'}`,
      `Company / Brand: ${data.get('company') || '-'}`,
      `Service: ${data.get('service') || '-'}`,
      `Project date: ${data.get('date') || '-'}`,
      `Budget: ${data.get('budget') || '-'}`,
      `Location: ${data.get('location') || '-'}`,
      `Project details: ${data.get('details') || '-'}`
    ].join('\n');
    const url = `https://wa.me/971588118994?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  });
}

document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
