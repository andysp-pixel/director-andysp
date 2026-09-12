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
