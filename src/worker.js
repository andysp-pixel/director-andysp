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

let accessKeys;
let schemaReady;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/media/')) return serveMedia(request, env, url.pathname.slice(7));
      if (url.pathname === '/api/projects' && request.method === 'GET') {
        await ensureSchema(env);
        return listProjects(env, url, false);
      }
      if (url.pathname.startsWith('/admin/api/')) {
        const identity = await authorize(request, env);
        if (!identity.ok) return json({ error: identity.error }, identity.status);
        await ensureSchema(env);
        if (url.pathname === '/admin/api/session' && request.method === 'GET') return json({ email: identity.email });
        if (url.pathname === '/admin/api/projects' && request.method === 'GET') return listProjects(env, url, true);
        if (url.pathname === '/admin/api/projects' && request.method === 'POST') return createProject(request, env);
        const match = url.pathname.match(/^\/admin\/api\/projects\/([a-f0-9-]+)$/i);
        if (match && request.method === 'PATCH') return updateProject(request, env, match[1]);
        if (match && request.method === 'DELETE') return deleteProject(env, match[1]);
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
    schemaReady = env.DB.batch([
      env.DB.prepare("CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, title TEXT NOT NULL, discipline TEXT NOT NULL CHECK (discipline IN ('Videography','Photography')), category_key TEXT NOT NULL, category_name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', media_key TEXT NOT NULL UNIQUE, media_type TEXT NOT NULL CHECK (media_type IN ('image','video')), mime_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')), featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0,1)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
      env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_projects_category_status ON projects(category_key, status, created_at DESC)'),
      env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at DESC)')
    ]).catch(error => { schemaReady = null; throw error; });
  }
  return schemaReady;
}

async function listProjects(env, url, admin) {
  const category = url.searchParams.get('category');
  const where = [];
  const values = [];
  if (!admin) where.push("status = 'published'");
  if (category && CATEGORIES[category]) { where.push('category_key = ?'); values.push(category); }
  const sql = `SELECT id,title,discipline,category_key,category_name,description,media_key,media_type,mime_type,status,featured,created_at,updated_at FROM projects ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY featured DESC, created_at DESC`;
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
