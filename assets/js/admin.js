const sidebar = document.querySelector('#sidebar');
const menuButton = document.querySelector('.mobile-menu');
const navButtons = [...document.querySelectorAll('.nav-item[data-view]')];
const views = [...document.querySelectorAll('.view')];
const uploadTemplate = document.querySelector('#upload-template');
const uploadSlot = document.querySelector('#upload-form-slot');
const toast = document.querySelector('#toast');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3200);
}

function mountUploadForm() {
  if (uploadSlot.children.length) return;
  uploadSlot.append(uploadTemplate.content.cloneNode(true));
  const form = uploadSlot.querySelector('form');
  const fileInput = form.querySelector('#project-file');
  const selectedFile = form.querySelector('#selected-file');
  fileInput.addEventListener('change', () => {
    selectedFile.textContent = fileInput.files[0]?.name || 'JPG, PNG, WEBP or MP4';
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    showToast('Dashboard design is ready. Connect R2 and D1 to publish this project live.');
  });
}

function changeView(name) {
  views.forEach(view => view.classList.toggle('active', view.id === `view-${name}`));
  navButtons.forEach(button => button.classList.toggle('active', button.dataset.view === name));
  if (name === 'upload') mountUploadForm();
  sidebar.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

navButtons.forEach(button => button.addEventListener('click', () => changeView(button.dataset.view)));
document.querySelectorAll('[data-view-link]').forEach(button => button.addEventListener('click', () => changeView(button.dataset.viewLink)));
document.querySelectorAll('[data-open-upload]').forEach(button => button.addEventListener('click', () => changeView('upload')));

menuButton.addEventListener('click', () => {
  const open = sidebar.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    sidebar.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  }
});

const categories = [
  ['Videography · Events', 'Video'], ['Videography · Corporate', 'Video'],
  ['Videography · Real Estate', 'Video'], ['Videography · Commercial', 'Video'],
  ['Videography · Music Videos', 'Video'], ['Videography · Social Media', 'Video'],
  ['Videography · Podcast', 'Video'], ['Videography · AI', 'Video'],
  ['Videography · Behind the Scenes', 'Video'], ['Photography · Events', 'Photo'],
  ['Photography · Corporate', 'Photo'], ['Photography · Fashion', 'Photo'],
  ['Photography · Product', 'Photo'], ['Photography · Real Estate', 'Photo'],
  ['Photography · Street', 'Photo']
];

document.querySelector('#category-list').innerHTML = categories.map(([name, type]) =>
  `<article><span><strong>${name}</strong><small>${type} category</small></span><button type="button" aria-label="Edit ${name}">✎</button></article>`
).join('');
