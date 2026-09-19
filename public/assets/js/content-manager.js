function contentEscape(value) {
  const node = document.createElement('span');
  node.textContent = value || '';
  return node.innerHTML;
}

async function loadManagedWebsiteContent() {
  const type = location.pathname.includes('offers') ? 'offer' : location.pathname.includes('services') ? 'service' : '';
  if (!type) return;
  try {
    const response = await fetch(`/api/content?type=${type}`);
    if (!response.ok) return;
    const { items = [] } = await response.json();
    if (!items.length) return;
    if (type === 'service') appendServices(items);
    else appendOffers(items);
  } catch (_) { /* Static website content remains available offline. */ }
}

function appendServices(items) {
  const accordion = document.querySelector('#sp-service-accordion');
  if (!accordion) return;
  const colors = ['#d9eef2', '#ede8d8', '#eedadf', '#dfe9da'];
  items.forEach((item, index) => {
    const article = document.createElement('article');
    article.className = 'sp-service cinema-reveal';
    article.style.setProperty('--service-bg', colors[index % colors.length]);
    article.innerHTML = `<button class="sp-service-head" type="button" aria-expanded="false"><span class="sp-num">${String(accordion.children.length + 1).padStart(2, '0')}</span><div class="sp-name"><h3>${contentEscape(item.title)}</h3><small>${contentEscape(item.subtitle)}</small></div><span class="sp-icon">↗</span></button><div class="sp-content"><div class="sp-description"><h2>${contentEscape(item.title)}</h2><p>${contentEscape(item.description)}</p>${item.features?.length ? `<ul>${item.features.map(feature => `<li>${contentEscape(feature)}</li>`).join('')}</ul>` : ''}<a href="book.html?service=${encodeURIComponent(item.title)}">Discuss project ↗</a></div></div>`;
    article.querySelector('button').onclick = () => {
      accordion.querySelectorAll('.sp-service').forEach(other => other.classList.toggle('active', other === article && !article.classList.contains('active')));
    };
    accordion.appendChild(article);
  });
}

function appendOffers(items) {
  const grid = document.querySelector('.music-offer-grid');
  if (!grid) return;
  items.forEach((item, index) => {
    const article = document.createElement('article');
    article.className = 'music-package cinema-reveal';
    article.innerHTML = `<div class="music-package-top"><span>${String(grid.children.length + 1).padStart(2, '0')}</span><strong>${contentEscape(item.title)}</strong></div><div class="music-package-price"><small></small><b>${contentEscape(item.price || 'Quote')}</b></div><p>${contentEscape(item.description || item.subtitle)}</p><ul>${(item.features || []).map(feature => `<li>${contentEscape(feature)}</li>`).join('')}</ul><button class="offer-book-button" type="button">Book this offer <span>↗</span></button><a class="offer-whatsapp" href="https://wa.me/971588118994?text=${encodeURIComponent(`Hi Director Andy SP, I would like to book: ${item.title} (${item.price || 'custom quote'}).`)}" target="_blank" rel="noopener">WhatsApp</a>`;
    article.querySelector('.offer-book-button').onclick = () => selectOffer(item.id, item.title, item.price || 'Custom quote');
    grid.appendChild(article);
  });
}

loadManagedWebsiteContent();
