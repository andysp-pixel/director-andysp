CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  discipline TEXT NOT NULL CHECK (discipline IN ('Videography', 'Photography')),
  category_key TEXT NOT NULL,
  category_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  media_key TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  mime_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  views INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_category_status
ON projects(category_key, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_updated
ON projects(updated_at DESC);

CREATE TABLE IF NOT EXISTS site_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT NOT NULL,
  path TEXT NOT NULL,
  visited_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_site_visits_time
ON site_visits(visited_at DESC);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY, pdf_token TEXT NOT NULL, offer_key TEXT NOT NULL,
  offer_name TEXT NOT NULL, price TEXT NOT NULL, client_name TEXT NOT NULL,
  client_email TEXT NOT NULL, phone TEXT NOT NULL, project_date TEXT NOT NULL DEFAULT '',
  footage_link TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created_at DESC);

CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY, content_type TEXT NOT NULL CHECK (content_type IN ('service','offer')),
  title TEXT NOT NULL, subtitle TEXT NOT NULL DEFAULT '', price TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '', features_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'published', display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_content_type_order ON content_items(content_type, display_order, created_at);
