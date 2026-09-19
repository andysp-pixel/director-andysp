import { EmailMessage } from 'cloudflare:email';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']);
const CATEGORIES = {
  'video-events': ['Videography', 'Events'], 'video-corporate': ['Videography', 'Corporate'],
  'video-real-estate': ['Videography', 'Real Estate'], 'video-commercial': ['Videography', 'Commercial'],
  'video-music': ['Videography', 'Music Videos'], 'video-social': ['Videography', 'Social Media'],
  'video-podcast': ['Videography', 'Podcast'], 'video-ai': ['Videography', 'AI'],
  'video-bts': ['Videography', 'Behind the Scenes'], 'photo-events': ['Photography', 'Events'],
  'photo-corporate': ['Photography', 'Corporate'], 'photo-fashion': ['Photography', 'Fashion'],
  'photo-product': ['Photography', 'Product'], 'photo-real-estate': ['Photography', 'Real Estate'],
  'photo-street': ['Photography', 'Street']
};

const BOOKING_EMAIL = 'damoryandy@gmail.com';

let accessKeys;
let schemaReady;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      const adminHost = url.hostname.toLowerCase() === 'admin.directorandysp.com';
      if (adminHost && (url.pathname === '/' || url.pathname === '/index.html')) {
        const assetUrl = new URL('/admin/index.html', url);
        return env.ASSETS.fetch(new Request(assetUrl, request));
      }
      if (url.pathname.startsWith('/media/')) return serveMedia(request, env, url.pathname.slice(7));
      if (url.pathname === '/api/projects' && request.method === 'GET') {
        await ensureSchema(env);
        return listProjects(env, url, false);
      }
      if (url.pathname === '/api/visit' && request.method === 'POST') {
        await ensureSchema(env);
        return recordVisit(request, env);
      }
      if (url.pathname === '/api/bookings' && request.method === 'POST') {
        await ensureSchema(env);
        return createBooking(request, env);
      }
      const bookingPdf = url.pathname.match(/^\/api\/bookings\/([a-f0-9-]+)\/pdf$/i);
      if (bookingPdf && request.method === 'GET') {
        await ensureSchema(env);
        return downloadBookingPdf(env, bookingPdf[1], url.searchParams.get('token'));
      }
      if (url.pathname === '/api/content' && request.method === 'GET') {
        await ensureSchema(env);
        return listContent(env, url, false);
      }
      const viewMatch = url.pathname.match(/^\/api\/projects\/([a-f0-9-]+)\/view$/i);
      if (viewMatch && request.method === 'POST') {
        await ensureSchema(env);
        return recordProjectView(request, env, viewMatch[1]);
      }
      if (url.pathname.startsWith('/admin/api/')) {
        const identity = await authorize(request, env);
        if (!identity.ok) return json({ error: identity.error }, identity.status);
        await ensureSchema(env);
        if (url.pathname === '/admin/api/session' && request.method === 'GET') return json({ email: identity.email });
        if (url.pathname === '/admin/api/projects' && request.method === 'GET') return listProjects(env, url, true);
        if (url.pathname === '/admin/api/analytics' && request.method === 'GET') return getAnalytics(env);
        if (url.pathname === '/admin/api/bookings' && request.method === 'GET') return listBookings(env);
        if (url.pathname === '/admin/api/content' && request.method === 'GET') return listContent(env, url, true);
        if (url.pathname === '/admin/api/content' && request.method === 'POST') return createContent(request, env);
        if (url.pathname === '/admin/api/projects' && request.method === 'POST') return createProject(request, env);
        const match = url.pathname.match(/^\/admin\/api\/projects\/([a-f0-9-]+)$/i);
        if (match && request.method === 'PATCH') return updateProject(request, env, match[1]);
        if (match && request.method === 'DELETE') return deleteProject(env, match[1]);
        const bookingMatch = url.pathname.match(/^\/admin\/api\/bookings\/([a-f0-9-]+)$/i);
        if (bookingMatch && request.method === 'PATCH') return updateBooking(request, env, bookingMatch[1]);
        if (bookingMatch && request.method === 'DELETE') return deleteBooking(env, bookingMatch[1]);
        const contentMatch = url.pathname.match(/^\/admin\/api\/content\/([a-f0-9-]+)$/i);
        if (contentMatch && request.method === 'PATCH') return updateContent(request, env, contentMatch[1]);
        if (contentMatch && request.method === 'DELETE') return deleteContent(env, contentMatch[1]);
        return json({ error: 'Not found' }, 404);
      }
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      return json({ error: 'The request could not be completed.' }, 500);
    }
  }
};

async function ensureSchema(env) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await env.DB.batch([
        env.DB.prepare("CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, title TEXT NOT NULL, discipline TEXT NOT NULL CHECK (discipline IN ('Videography','Photography')), category_key TEXT NOT NULL, category_name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', media_key TEXT NOT NULL UNIQUE, media_type TEXT NOT NULL CHECK (media_type IN ('image','video')), mime_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')), featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0,1)), views INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
        env.DB.prepare('CREATE TABLE IF NOT EXISTS site_visits (id INTEGER PRIMARY KEY AUTOINCREMENT, visitor_id TEXT NOT NULL, path TEXT NOT NULL, visited_at TEXT NOT NULL)'),
        env.DB.prepare("CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, pdf_token TEXT NOT NULL, offer_key TEXT NOT NULL, offer_name TEXT NOT NULL, price TEXT NOT NULL, client_name TEXT NOT NULL, client_email TEXT NOT NULL, phone TEXT NOT NULL, project_date TEXT NOT NULL DEFAULT '', footage_link TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL)"),
        env.DB.prepare("CREATE TABLE IF NOT EXISTS content_items (id TEXT PRIMARY KEY, content_type TEXT NOT NULL CHECK (content_type IN ('service','offer')), title TEXT NOT NULL, subtitle TEXT NOT NULL DEFAULT '', price TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', features_json TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'published', display_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
        env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_projects_category_status ON projects(category_key, status, created_at DESC)'),
        env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at DESC)'),
        env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_site_visits_time ON site_visits(visited_at DESC)'),
        env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created_at DESC)'),
        env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_content_type_order ON content_items(content_type, display_order, created_at)')
      ]);
      try { await env.DB.prepare('ALTER TABLE projects ADD COLUMN views INTEGER NOT NULL DEFAULT 0').run(); }
      catch (error) { if (!String(error.message).includes('duplicate column')) throw error; }
    })().catch(error => { schemaReady = null; throw error; });
  }
  return schemaReady;
}

async function listProjects(env, url, admin) {
  const category = url.searchParams.get('category');
  const where = [];
  const values = [];
  if (!admin) where.push("status = 'published'");
  if (category && CATEGORIES[category]) { where.push('category_key = ?'); values.push(category); }
  const sql = `SELECT id,title,discipline,category_key,category_name,description,media_key,media_type,mime_type,status,featured,views,created_at,updated_at FROM projects ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY featured DESC, created_at DESC`;
  const result = await env.DB.prepare(sql).bind(...values).all();
  return json({ projects: result.results.map(publicProject) }, 200, admin ? 'no-store' : 'public, max-age=30');
}

async function createProject(request, env) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_UPLOAD_BYTES + 100000) return json({ error: 'File is larger than 100 MB.' }, 413);
  const form = await request.formData();
  const file = form.get('file');
  const title = clean(form.get('title'), 120);
  const description = clean(form.get('description'), 600);
  const categoryKey = clean(form.get('category'), 50);
  const category = CATEGORIES[categoryKey];
  const status = form.get('publish') === 'true' ? 'published' : 'draft';
  if (!(file instanceof File) || !file.size) return json({ error: 'Choose an image or video.' }, 400);
  if (file.size > MAX_UPLOAD_BYTES) return json({ error: 'File is larger than 100 MB.' }, 413);
  if (!ALLOWED_TYPES.has(file.type)) return json({ error: 'Use JPG, PNG, WEBP, GIF, MP4 or WEBM.' }, 415);
  if (!title || !category) return json({ error: 'Title and category are required.' }, 400);

  const id = crypto.randomUUID();
  const extension = safeExtension(file.name, file.type);
  const mediaKey = `projects/${categoryKey}/${id}.${extension}`;
  const now = new Date().toISOString();
  await env.MEDIA.put(mediaKey, file.stream(), { httpMetadata: { contentType: file.type }, customMetadata: { projectId: id, title } });
  try {
    await env.DB.prepare('INSERT INTO projects (id,title,discipline,category_key,category_name,description,media_key,media_type,mime_type,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id, title, category[0], categoryKey, category[1], description, mediaKey, file.type.startsWith('video/') ? 'video' : 'image', file.type, status, now, now).run();
  } catch (error) {
    await env.MEDIA.delete(mediaKey);
    throw error;
  }
  const row = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
  return json({ project: publicProject(row) }, 201);
}

async function updateProject(request, env, id) {
  const body = await request.json();
  const current = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
  if (!current) return json({ error: 'Project not found.' }, 404);
  const title = body.title === undefined ? current.title : clean(body.title, 120);
  const description = body.description === undefined ? current.description : clean(body.description, 600);
  const status = body.status === undefined ? current.status : body.status;
  const featured = body.featured === undefined ? current.featured : (body.featured ? 1 : 0);
  if (!title || !['draft', 'published'].includes(status)) return json({ error: 'Invalid project update.' }, 400);
  const now = new Date().toISOString();
  await env.DB.prepare('UPDATE projects SET title=?, description=?, status=?, featured=?, updated_at=? WHERE id=?')
    .bind(title, description, status, featured, now, id).run();
  const row = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
  return json({ project: publicProject(row) });
}

async function deleteProject(env, id) {
  const project = await env.DB.prepare('SELECT media_key FROM projects WHERE id = ?').bind(id).first();
  if (!project) return json({ error: 'Project not found.' }, 404);
  await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
  await env.MEDIA.delete(project.media_key);
  return json({ deleted: true });
}

async function recordVisit(request, env) {
  const body = await request.json().catch(() => ({}));
  const path = clean(body.path || '/', 180);
  const cookie = request.headers.get('cookie') || '';
  let visitorId = cookie.match(/(?:^|;\s*)andy_visitor=([a-f0-9-]{36})/i)?.[1];
  const headers = {};
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    headers['set-cookie'] = `andy_visitor=${visitorId}; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Lax`;
  }
  await env.DB.prepare('INSERT INTO site_visits (visitor_id,path,visited_at) VALUES (?,?,?)')
    .bind(visitorId, path, new Date().toISOString()).run();
  return new Response(null, { status: 204, headers });
}

async function recordProjectView(request, env, id) {
  const changed = await env.DB.prepare("UPDATE projects SET views = views + 1 WHERE id = ? AND status = 'published'").bind(id).run();
  return changed.meta.changes ? json({ counted: true }) : json({ error: 'Project not found.' }, 404);
}

async function getAnalytics(env) {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [visits, projectViews] = await env.DB.batch([
    env.DB.prepare('SELECT COUNT(*) AS page_views, COUNT(DISTINCT visitor_id) AS visitors FROM site_visits WHERE visited_at >= ?').bind(since),
    env.DB.prepare('SELECT COALESCE(SUM(views),0) AS views FROM projects')
  ]);
  return json({
    page_views: Number(visits.results[0]?.page_views || 0),
    visitors: Number(visits.results[0]?.visitors || 0),
    views: Number(projectViews.results[0]?.views || 0),
    period: '30d'
  });
}

async function createBooking(request, env) {
  const body = await request.json().catch(() => ({}));
  const booking = {
    id: crypto.randomUUID(), pdf_token: crypto.randomUUID(),
    offer_key: clean(body.offer_key, 80), offer_name: clean(body.offer_name, 140),
    price: clean(body.price, 80), client_name: clean(body.client_name, 120),
    client_email: clean(body.client_email, 180), phone: clean(body.phone, 60),
    project_date: clean(body.project_date, 40), footage_link: clean(body.footage_link, 500),
    notes: clean(body.notes, 1200), created_at: new Date().toISOString()
  };
  if (!booking.offer_name || !booking.client_name || !booking.client_email || !booking.phone) {
    return json({ error: 'Offer, name, email and phone are required.' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.client_email)) return json({ error: 'Enter a valid email address.' }, 400);
  await env.DB.prepare('INSERT INTO bookings (id,pdf_token,offer_key,offer_name,price,client_name,client_email,phone,project_date,footage_link,notes,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(booking.id, booking.pdf_token, booking.offer_key, booking.offer_name, booking.price, booking.client_name, booking.client_email, booking.phone, booking.project_date, booking.footage_link, booking.notes, 'new', booking.created_at).run();

  let emailSent = false;
  if (env.BOOKING_EMAIL?.send) {
    try { await sendBookingEmail(env, booking); emailSent = true; }
    catch (error) { console.error('Booking email failed', error); }
  }
  return json({
    booking_id: booking.id,
    pdf_url: `/api/bookings/${booking.id}/pdf?token=${encodeURIComponent(booking.pdf_token)}`,
    email_sent: emailSent,
    message: 'Your booking request has been received.'
  }, 201);
}

async function listBookings(env) {
  const result = await env.DB.prepare('SELECT id,offer_name,price,client_name,client_email,phone,project_date,footage_link,notes,status,created_at FROM bookings ORDER BY created_at DESC').all();
  return json({ bookings: result.results });
}

async function updateBooking(request, env, id) {
  const body = await request.json().catch(() => ({}));
  const status = clean(body.status, 20);
  if (!['new', 'contacted', 'confirmed', 'completed', 'cancelled'].includes(status)) return json({ error: 'Invalid booking status.' }, 400);
  const result = await env.DB.prepare('UPDATE bookings SET status=? WHERE id=?').bind(status, id).run();
  return result.meta.changes ? json({ updated: true }) : json({ error: 'Booking not found.' }, 404);
}

async function deleteBooking(env, id) {
  const result = await env.DB.prepare('DELETE FROM bookings WHERE id=?').bind(id).run();
  return result.meta.changes ? json({ deleted: true }) : json({ error: 'Booking not found.' }, 404);
}

async function downloadBookingPdf(env, id, token) {
  const row = await env.DB.prepare('SELECT * FROM bookings WHERE id=? AND pdf_token=?').bind(id, token || '').first();
  if (!row) return new Response('Not found', { status: 404 });
  return new Response(makeBookingPdf(row), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="director-andy-booking-${id.slice(0, 8)}.pdf"`,
      'cache-control': 'private, no-store'
    }
  });
}

async function sendBookingEmail(env, booking) {
  const pdf = makeBookingPdf(booking);
  const boundary = `andy-${crypto.randomUUID()}`;
  const lines = [
    `From: Director Andy SP Website <bookings@directorandysp.com>`,
    `To: ${BOOKING_EMAIL}`,
    `Reply-To: ${booking.client_email}`,
    `Subject: New booking: ${booking.offer_name} — ${booking.client_name}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`, '',
    `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', '',
    bookingEmailText(booking), '',
    `--${boundary}`, 'Content-Type: application/pdf',
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="booking-${booking.id.slice(0, 8)}.pdf"`, '',
    bytesToBase64(pdf), '', `--${boundary}--`
  ];
  const message = new EmailMessage('bookings@directorandysp.com', BOOKING_EMAIL, lines.join('\r\n'));
  await env.BOOKING_EMAIL.send(message);
}

function bookingEmailText(b) {
  return [`New website booking`, ``, `Offer: ${b.offer_name}`, `Price: ${b.price || 'Quote required'}`, `Name: ${b.client_name}`, `Email: ${b.client_email}`, `Phone: ${b.phone}`, `Preferred date: ${b.project_date || '-'}`, `Footage link: ${b.footage_link || '-'}`, `Notes: ${b.notes || '-'}`, `Reference: ${b.id}`].join('\n');
}

function makeBookingPdf(b) {
  const values = [
    'DIRECTOR ANDY SP - BOOKING REQUEST', '',
    `Reference: ${b.id}`, `Created: ${b.created_at}`, '',
    `Offer: ${b.offer_name}`, `Price: ${b.price || 'Quote required'}`, '',
    `Client: ${b.client_name}`, `Email: ${b.client_email}`, `Phone: ${b.phone}`,
    `Preferred date: ${b.project_date || '-'}`, `Footage link: ${b.footage_link || '-'}`, '',
    `Notes: ${b.notes || '-'}`, '',
    'This document confirms that the booking request was received.',
    'Director Andy SP | directorandysp.com | +971 58 811 8994'
  ].map(line => ascii(line).slice(0, 105));
  const stream = ['BT', '/F1 17 Tf', '55 790 Td'];
  values.forEach((line, index) => {
    if (index === 0) stream.push(`(${pdfEscape(line)}) Tj`, '/F1 10 Tf');
    else stream.push(`0 -22 Td (${pdfEscape(line)}) Tj`);
  });
  stream.push('ET');
  const body = stream.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${body.length} >>\nstream\n${body}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let pdf = '%PDF-1.4\n', offsets = [0];
  objects.forEach((object, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

async function listContent(env, url, admin) {
  const type = clean(url.searchParams.get('type'), 20);
  const conditions = [], values = [];
  if (type && ['service', 'offer'].includes(type)) { conditions.push('content_type=?'); values.push(type); }
  if (!admin) conditions.push("status='published'");
  const result = await env.DB.prepare(`SELECT * FROM content_items ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''} ORDER BY content_type,display_order,created_at`).bind(...values).all();
  return json({ items: result.results.map(contentItem) });
}

async function createContent(request, env) {
  const body = await request.json().catch(() => ({}));
  const item = contentPayload(body);
  if (!item.content_type || !item.title) return json({ error: 'Type and title are required.' }, 400);
  const id = crypto.randomUUID(), now = new Date().toISOString();
  await env.DB.prepare('INSERT INTO content_items (id,content_type,title,subtitle,price,description,features_json,status,display_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, item.content_type, item.title, item.subtitle, item.price, item.description, JSON.stringify(item.features), item.status, item.display_order, now, now).run();
  const row = await env.DB.prepare('SELECT * FROM content_items WHERE id=?').bind(id).first();
  return json({ item: contentItem(row) }, 201);
}

async function updateContent(request, env, id) {
  const current = await env.DB.prepare('SELECT * FROM content_items WHERE id=?').bind(id).first();
  if (!current) return json({ error: 'Content not found.' }, 404);
  const body = await request.json().catch(() => ({}));
  const merged = contentPayload({ ...current, features: body.features ?? JSON.parse(current.features_json || '[]'), ...body });
  await env.DB.prepare('UPDATE content_items SET content_type=?,title=?,subtitle=?,price=?,description=?,features_json=?,status=?,display_order=?,updated_at=? WHERE id=?')
    .bind(merged.content_type, merged.title, merged.subtitle, merged.price, merged.description, JSON.stringify(merged.features), merged.status, merged.display_order, new Date().toISOString(), id).run();
  return json({ updated: true });
}

async function deleteContent(env, id) {
  const result = await env.DB.prepare('DELETE FROM content_items WHERE id=?').bind(id).run();
  return result.meta.changes ? json({ deleted: true }) : json({ error: 'Content not found.' }, 404);
}

function contentPayload(body) {
  const type = clean(body.content_type, 20);
  return { content_type: ['service', 'offer'].includes(type) ? type : '', title: clean(body.title, 120), subtitle: clean(body.subtitle, 180), price: clean(body.price, 80), description: clean(body.description, 800), features: Array.isArray(body.features) ? body.features.map(x => clean(x, 180)).filter(Boolean).slice(0, 12) : [], status: body.status === 'draft' ? 'draft' : 'published', display_order: Math.max(0, Math.min(999, Number(body.display_order) || 0)) };
}
function contentItem(row) { return { ...row, features: JSON.parse(row.features_json || '[]') }; }
function ascii(value) { return String(value ?? '').normalize('NFKD').replace(/[^\x20-\x7E]/g, ''); }
function pdfEscape(value) { return String(value).replace(/([\\()])/g, '\\$1'); }
function bytesToBase64(bytes) { let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(binary); }

async function serveMedia(request, env, encodedKey) {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
  const key = encodedKey.split('/').map(decodeURIComponent).join('/');
  if (!key.startsWith('projects/') || key.includes('..')) return new Response('Not found', { status: 404 });
  const object = await env.MEDIA.get(key, { range: request.headers });
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('accept-ranges', 'bytes');
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  let status = 200;
  if (object.range) {
    status = 206;
    const { offset, length } = object.range;
    headers.set('content-range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set('content-length', String(length));
  } else headers.set('content-length', String(object.size));
  return new Response(request.method === 'HEAD' ? null : object.body, { status, headers });
}

async function authorize(request, env) {
  if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD || !env.ADMIN_EMAIL) return { ok: false, status: 503, error: 'Admin authentication is not configured.' };
  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token) return { ok: false, status: 401, error: 'Sign in through Cloudflare Access.' };
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
    const header = JSON.parse(decodeBase64Url(encodedHeader));
    const payload = JSON.parse(decodeBase64Url(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    const expectedIssuer = `https://${env.CF_ACCESS_TEAM_DOMAIN}`.replace(/\/$/, '');
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (payload.exp <= now || payload.nbf > now || payload.iss?.replace(/\/$/, '') !== expectedIssuer || !audiences.includes(env.CF_ACCESS_AUD)) throw new Error('Invalid claims');
    const key = await accessKey(env.CF_ACCESS_TEAM_DOMAIN, header.kid);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, base64UrlBytes(encodedSignature), new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`));
    const email = String(payload.email || '').toLowerCase();
    if (!valid || email !== String(env.ADMIN_EMAIL).toLowerCase()) throw new Error('Access denied');
    return { ok: true, email };
  } catch (error) {
    return { ok: false, status: 403, error: 'Access denied.' };
  }
}

async function accessKey(domain, kid) {
  if (!accessKeys) {
    const response = await fetch(`https://${domain}/cdn-cgi/access/certs`);
    if (!response.ok) throw new Error('Unable to load Access keys');
    accessKeys = await response.json();
  }
  const jwk = accessKeys.keys.find(key => key.kid === kid);
  if (!jwk) { accessKeys = null; throw new Error('Unknown signing key'); }
  return crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
}

function publicProject(row) {
  return { ...row, featured: Boolean(row.featured), media_url: `/media/${row.media_key.split('/').map(encodeURIComponent).join('/')}` };
}
function clean(value, max) { return String(value || '').trim().replace(/[<>]/g, '').slice(0, max); }
function safeExtension(name, mime) {
  const known = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/webm': 'webm' };
  return known[mime] || String(name).split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
}
function decodeBase64Url(value) { return new TextDecoder().decode(base64UrlBytes(value)); }
function base64UrlBytes(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
}
function json(data, status = 200, cache = 'no-store') {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, 'cache-control': cache } });
}
