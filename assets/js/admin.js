const sidebar = document.querySelector('#sidebar');
const menuButton = document.querySelector('.mobile-menu');
const navButtons = [...document.querySelectorAll('.nav-item[data-view]')];
const views = [...document.querySelectorAll('.view')];
const uploadTemplate = document.querySelector('#upload-template');
const uploadSlot = document.querySelector('#upload-form-slot');
const toast = document.querySelector('#toast');
let projects = [];

function showToast(message, error = false) {
  toast.textContent = message;
  toast.style.background = error ? '#b42318' : '#0b132b';
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3600);
}

async function api(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

async function loadProjects() {
  try {
    const data = await api('/admin/api/projects');
    projects = data.projects || [];
    renderDashboard();
    renderProjects();
  } catch (error) { showToast(error.message, true); }
}

function renderDashboard() {
  const stats = document.querySelectorAll('.stat-card strong');
  if (stats.length >= 4) {
    stats[0].textContent = projects.length;
    stats[1].textContent = projects.filter(project => project.status === 'published').length;
    stats[2].textContent = projects.filter(project => project.status === 'draft').length;
    stats[3].textContent = new Set(projects.map(project => project.category_key)).size;
  }
  const table = document.querySelector('#view-dashboard .project-table');
  if (table) renderTable(table, projects.slice(0, 3), false);
}

function renderProjects() {
  const panel = document.querySelector('#view-projects .empty-panel, #view-projects .recent-panel');
  if (!panel) return;
  if (!projects.length) {
    panel.className = 'empty-panel';
    panel.innerHTML = '<span>▦</span><h2>No uploaded projects yet.</h2><p>Use “Add project” to upload your first image or video.</p>';
    return;
  }
  panel.className = 'panel recent-panel';
  panel.innerHTML = '<div class="project-table" aria-label="All portfolio projects"></div>';
  renderTable(panel.querySelector('.project-table'), projects, true);
}

function renderTable(table, items, actions) {
  table.innerHTML = '<div class="table-row table-head"><span>Project</span><span>Category</span><span>Status</span><span>Updated</span><span></span></div>';
  if (!items.length) { table.insertAdjacentHTML('beforeend', '<div class="table-row"><span>No projects uploaded yet.</span></div>'); return; }
  items.forEach(project => {
    const row = document.createElement('div');
    row.className = 'table-row';
    const media = project.media_type === 'image' ? `<img src="${escapeAttribute(project.media_url)}" alt="">` : `<video src="${escapeAttribute(project.media_url)}" muted preload="metadata"></video>`;
    row.innerHTML = `<span class="project-name">${media}<strong>${escapeHtml(project.title)}</strong></span><span>${escapeHtml(project.category_name)}</span><span><i class="status ${project.status}">${project.status === 'published' ? 'Published' : 'Draft'}</i></span><span>${formatDate(project.updated_at)}</span><span class="project-actions"><button type="button" aria-label="Project actions">•••</button></span>`;
    if (actions) {
      const actionsCell = row.querySelector('.project-actions');
      const statusButton = actionsCell.querySelector('button');
      statusButton.textContent = project.status === 'published' ? 'Unpublish' : 'Publish';
      statusButton.className = 'text-button';
      statusButton.addEventListener('click', () => toggleStatus(project));
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'text-button'; remove.textContent = 'Delete';
      remove.addEventListener('click', () => removeProject(project));
      actionsCell.appendChild(remove);
    }
    table.appendChild(row);
  });
}

async function toggleStatus(project) {
  try {
    const status = project.status === 'published' ? 'draft' : 'published';
    await api(`/admin/api/projects/${project.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) });
    showToast(status === 'published' ? 'Project published.' : 'Project moved to drafts.');
    await loadProjects();
  } catch (error) { showToast(error.message, true); }
}

async function removeProject(project) {
  if (!window.confirm(`Delete “${project.title}”? This also removes its media file.`)) return;
  try {
    await api(`/admin/api/projects/${project.id}`, { method: 'DELETE' });
    showToast('Project deleted.');
    await loadProjects();
  } catch (error) { showToast(error.message, true); }
}

function mountUploadForm() {
  if (uploadSlot.children.length) return;
  uploadSlot.append(uploadTemplate.content.cloneNode(true));
  const form = uploadSlot.querySelector('form');
  const fileInput = form.querySelector('#project-file');
  const selectedFile = form.querySelector('#selected-file');
  fileInput.addEventListener('change', () => { selectedFile.textContent = fileInput.files[0]?.name || 'JPG, PNG, WEBP, GIF, MP4 or WEBM'; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    button.disabled = true; button.textContent = 'Uploading…';
    const body = new FormData(form);
    body.set('publish', form.elements.publish.checked ? 'true' : 'false');
    try {
      await api('/admin/api/projects', { method: 'POST', body });
      form.reset(); selectedFile.textContent = 'JPG, PNG, WEBP, GIF, MP4 or WEBM';
      showToast('Project uploaded successfully.');
      await loadProjects(); changeView('projects');
    } catch (error) { showToast(error.message, true); }
    finally { button.disabled = false; button.textContent = 'Save project →'; }
  });
}

function changeView(name) {
  views.forEach(view => view.classList.toggle('active', view.id === `view-${name}`));
  navButtons.forEach(button => button.classList.toggle('active', button.dataset.view === name));
  if (name === 'upload') mountUploadForm();
  sidebar.classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function escapeHtml(value) { const node = document.createElement('span'); node.textContent = value || ''; return node.innerHTML; }
function escapeAttribute(value) { return String(value || '').replace(/["'<>]/g, ''); }
function formatDate(value) { return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value)); }

navButtons.forEach(button => button.addEventListener('click', () => changeView(button.dataset.view)));
document.querySelectorAll('[data-view-link]').forEach(button => button.addEventListener('click', () => changeView(button.dataset.viewLink)));
document.querySelectorAll('[data-open-upload]').forEach(button => button.addEventListener('click', () => changeView('upload')));
menuButton.addEventListener('click', () => { const open = sidebar.classList.toggle('open'); menuButton.setAttribute('aria-expanded', String(open)); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') { sidebar.classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false'); } });

const categories = [
  ['Videography · Events', 'Video'], ['Videography · Corporate', 'Video'], ['Videography · Real Estate', 'Video'], ['Videography · Commercial', 'Video'], ['Videography · Music Videos', 'Video'], ['Videography · Social Media', 'Video'], ['Videography · Podcast', 'Video'], ['Videography · AI', 'Video'], ['Videography · Behind the Scenes', 'Video'], ['Photography · Events', 'Photo'], ['Photography · Corporate', 'Photo'], ['Photography · Fashion', 'Photo'], ['Photography · Product', 'Photo'], ['Photography · Real Estate', 'Photo'], ['Photography · Street', 'Photo']
];
document.querySelector('#category-list').innerHTML = categories.map(([name, type]) => `<article><span><strong>${name}</strong><small>${type} category</small></span><button type="button" aria-label="Edit ${name}">✎</button></article>`).join('');
loadProjects();
