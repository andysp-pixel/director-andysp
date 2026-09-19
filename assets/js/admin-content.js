const contentForm = document.querySelector('#content-form');
const contentList = document.querySelector('#content-list');
const bookingList = document.querySelector('#booking-list');
let managedContent = [];
let managedBookings = [];

async function adminRequest(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function safe(value) {
  const node = document.createElement('span');
  node.textContent = value || '';
  return node.innerHTML;
}

async function loadAdminContent() {
  try {
    const [content, bookings] = await Promise.all([
      adminRequest('/admin/api/content'),
      adminRequest('/admin/api/bookings')
    ]);
    managedContent = content.items || [];
    managedBookings = bookings.bookings || [];
    renderManagedContent();
    renderBookings();
    document.querySelector('#stat-bookings').textContent = managedBookings.length;
    document.querySelector('#booking-count').textContent = managedBookings.filter(item => item.status === 'new').length;
  } catch (error) {
    if (typeof showToast === 'function') showToast(error.message, true);
  }
}

function renderManagedContent() {
  if (!contentList) return;
  if (!managedContent.length) {
    contentList.innerHTML = '<div class="empty-panel"><span>✦</span><h2>No dashboard-managed items yet.</h2><p>Add services or offers here. Published items appear automatically on the website.</p></div>';
    return;
  }
  contentList.innerHTML = managedContent.map(item => `<article class="content-admin-card">
    <div><small>${safe(item.content_type)}</small><h2>${safe(item.title)}</h2><p>${safe(item.subtitle || item.description)}</p><strong>${safe(item.price)}</strong><i class="status ${safe(item.status)}">${safe(item.status)}</i></div>
    <div class="content-card-actions"><button type="button" data-edit-content="${item.id}">Edit</button><button type="button" data-delete-content="${item.id}">Delete</button></div>
  </article>`).join('');
  contentList.querySelectorAll('[data-edit-content]').forEach(button => button.onclick = () => editContent(button.dataset.editContent));
  contentList.querySelectorAll('[data-delete-content]').forEach(button => button.onclick = () => removeContent(button.dataset.deleteContent));
}

function editContent(id) {
  const item = managedContent.find(entry => entry.id === id);
  if (!item) return;
  contentForm.hidden = false;
  Object.entries({ ...item, features: (item.features || []).join('\n') }).forEach(([key, value]) => { if (contentForm.elements[key]) contentForm.elements[key].value = value ?? ''; });
  contentForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function removeContent(id) {
  const item = managedContent.find(entry => entry.id === id);
  if (!confirm(`Delete “${item?.title || 'this item'}” from the website?`)) return;
  try {
    await adminRequest(`/admin/api/content/${id}`, { method: 'DELETE' });
    showToast('Content removed.');
    await loadAdminContent();
  } catch (error) { showToast(error.message, true); }
}

function renderBookings() {
  if (!bookingList) return;
  if (!managedBookings.length) {
    bookingList.innerHTML = '<div class="empty-panel"><span>✉</span><h2>No bookings yet.</h2><p>New offer requests will appear here automatically.</p></div>';
    return;
  }
  bookingList.innerHTML = managedBookings.map(item => `<article class="booking-admin-card">
    <div class="booking-admin-head"><div><small>${new Date(item.created_at).toLocaleString()}</small><h2>${safe(item.offer_name)}</h2><strong>${safe(item.price)}</strong></div><select data-booking-status="${item.id}"><option value="new">New</option><option value="contacted">Contacted</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
    <div class="booking-client"><p><b>${safe(item.client_name)}</b></p><a href="mailto:${safe(item.client_email)}">${safe(item.client_email)}</a><a href="tel:${safe(item.phone)}">${safe(item.phone)}</a><p>Date: ${safe(item.project_date || 'Not selected')}</p></div>
    ${item.notes ? `<p>${safe(item.notes)}</p>` : ''}
    <div class="content-card-actions"><a href="https://wa.me/${String(item.phone).replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${item.client_name}, about your ${item.offer_name} booking:`)}" target="_blank" rel="noopener">WhatsApp</a><button type="button" data-delete-booking="${item.id}">Delete</button></div>
  </article>`).join('');
  bookingList.querySelectorAll('[data-booking-status]').forEach(select => { select.value = managedBookings.find(x => x.id === select.dataset.bookingStatus)?.status || 'new'; select.onchange = () => setBookingStatus(select.dataset.bookingStatus, select.value); });
  bookingList.querySelectorAll('[data-delete-booking]').forEach(button => button.onclick = () => removeBooking(button.dataset.deleteBooking));
}

async function setBookingStatus(id, status) {
  try { await adminRequest(`/admin/api/bookings/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) }); showToast('Booking updated.'); await loadAdminContent(); }
  catch (error) { showToast(error.message, true); }
}
async function removeBooking(id) {
  if (!confirm('Delete this booking permanently?')) return;
  try { await adminRequest(`/admin/api/bookings/${id}`, { method: 'DELETE' }); showToast('Booking deleted.'); await loadAdminContent(); }
  catch (error) { showToast(error.message, true); }
}

document.querySelector('#new-content')?.addEventListener('click', () => { contentForm.reset(); contentForm.elements.id.value = ''; contentForm.hidden = false; contentForm.scrollIntoView({ behavior: 'smooth' }); });
document.querySelector('#cancel-content')?.addEventListener('click', () => { contentForm.hidden = true; contentForm.reset(); });
contentForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(contentForm));
  data.features = String(data.features || '').split('\n').map(value => value.trim()).filter(Boolean);
  data.display_order = Number(data.display_order) || 0;
  const id = data.id;
  delete data.id;
  try {
    await adminRequest(id ? `/admin/api/content/${id}` : '/admin/api/content', { method: id ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    showToast(id ? 'Content updated.' : 'Content added.');
    contentForm.hidden = true; contentForm.reset(); await loadAdminContent();
  } catch (error) { showToast(error.message, true); }
});

loadAdminContent();
