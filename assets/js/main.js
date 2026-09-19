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

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !navLinks.classList.contains('open')) return;
    navLinks.classList.remove('open');
    document.body.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.focus();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth <= 980 || !navLinks.classList.contains('open')) return;
    navLinks.classList.remove('open');
    document.body.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
  });
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

// Light / dark theme shared by every page.
(() => {
  const storageKey = 'director-andy-theme';
  const root = document.documentElement;
  const toggle = document.querySelector('.theme-toggle');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');

  const currentTheme = () => root.getAttribute('data-theme') || (systemTheme.matches ? 'dark' : 'light');

  const updateButton = theme => {
    if (!toggle) return;
    const dark = theme === 'dark';
    const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
    const text = toggle.querySelector('.theme-toggle-text');
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
    if (text) text.textContent = dark ? 'Light' : 'Dark';
  };

  const applyTheme = (theme, save = false) => {
    const safeTheme = theme === 'dark' ? 'dark' : 'light';
    root.setAttribute('data-theme', safeTheme);
    if (themeColor) themeColor.content = safeTheme === 'dark' ? '#080D20' : '#F4F4F8';
    updateButton(safeTheme);
    if (save) {
      try { localStorage.setItem(storageKey, safeTheme); } catch (_) { /* Storage may be disabled. */ }
    }
  };

  applyTheme(currentTheme());

  toggle?.addEventListener('click', () => {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
  });

  const followSystem = event => {
    try {
      if (localStorage.getItem(storageKey)) return;
    } catch (_) { /* Follow the device preference when storage is unavailable. */ }
    applyTheme(event.matches ? 'dark' : 'light');
  };

  if (typeof systemTheme.addEventListener === 'function') systemTheme.addEventListener('change', followSystem);
  else systemTheme.addListener(followSystem);
})();
/* =====================================================
   MUSIC OFFER POPUP
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

  const musicOffer =
    document.getElementById("musicOffer");

  const musicOfferClose =
    document.getElementById("musicOfferClose");


  /*
   * Show offer automatically
   * every time Home Page is opened.
   */

  if (musicOffer) {

    setTimeout(() => {

      musicOffer.classList.add("active");

      document.body.style.overflow = "hidden";

    }, 650);

  }


  /*
   * Close popup
   */

  if (musicOfferClose) {

    musicOfferClose.addEventListener("click", () => {

      musicOffer.classList.remove("active");

      document.body.style.overflow = "";

    });

  }


  /*
   * Click outside modal = close
   */

  if (musicOffer) {

    musicOffer.addEventListener("click", function (event) {

      if (event.target === musicOffer) {

        musicOffer.classList.remove("active");

        document.body.style.overflow = "";

      }

    });

  }


  /*
   * ESC key = close
   */

  document.addEventListener("keydown", function (event) {

    if (
      event.key === "Escape" &&
      musicOffer &&
      musicOffer.classList.contains("active")
    ) {

      musicOffer.classList.remove("active");

      document.body.style.overflow = "";

    }

  });

});


/* =====================================================
   MUSIC OFFER WHATSAPP BOOKING
===================================================== */

function bookMusicOffer(service) {

  const message =
`Hello Director Andy SP 👋

I would like to book your Music Service.

Service:
${service}

Artist Name:
[My name]

Song Name:
[Song name]

I have my footage ready.

Please send me the next steps and availability.`;


  const whatsappNumber =
    "971554600587";


  const whatsappURL =
    "https://wa.me/" +
    whatsappNumber +
    "?text=" +
    encodeURIComponent(message);


  window.open(
    whatsappURL,
    "_blank",
    "noopener,noreferrer"
  );

}
