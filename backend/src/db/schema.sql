-- ZGROUP Cotizaciones Técnicas — PostgreSQL Schema

-- Módulo 0 — Usuarios y sesiones
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  role           VARCHAR(20)  NOT NULL DEFAULT 'COMERCIAL'
    CHECK (role IN ('ADMIN', 'COMERCIAL', 'VIEWER')),
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   VARCHAR(64) NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user   ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash    ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

CREATE TABLE IF NOT EXISTS projects (
  id            VARCHAR(32)  PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  odoo_number   VARCHAR(100) DEFAULT '',
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Módulo 1: Venta Directa
  adj_type      VARCHAR(20)  DEFAULT 'margin',
  adj_pct       NUMERIC      DEFAULT 10,

  -- Módulo 2: Corto Plazo
  cp_plazo      INTEGER      DEFAULT 6,
  cp_vida       INTEGER      DEFAULT 60,
  cp_op         NUMERIC      DEFAULT 5,
  cp_roa        NUMERIC      DEFAULT 35,
  cp_merma      NUMERIC      DEFAULT 2,

  -- Módulo 3: Largo Plazo
  lp_vida       INTEGER      DEFAULT 120,
  lp_n          INTEGER      DEFAULT 24,
  lp_n_contrato INTEGER      DEFAULT 36,
  lp_tea_banco  NUMERIC      DEFAULT 7,
  lp_tea_cot    NUMERIC      DEFAULT 15,
  lp_op         NUMERIC      DEFAULT 5,
  lp_form       NUMERIC      DEFAULT 350,
  lp_post_pct   NUMERIC      DEFAULT 80,
  lp_fondo_rep  NUMERIC      DEFAULT 5,

  -- Módulo 4: Estacionalidad
  est_op        INTEGER      DEFAULT 8,
  est_sb        INTEGER      DEFAULT 4,
  est_seguro    NUMERIC      DEFAULT 1,
  est_sb_pct    NUMERIC      DEFAULT 35,

  -- Módulo 5: Comparativa
  cmp_period    INTEGER      DEFAULT 24
);

CREATE TABLE IF NOT EXISTS project_items (
  id          VARCHAR(32)  PRIMARY KEY,
  project_id  VARCHAR(32)  NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  catalog_id  VARCHAR(50)  DEFAULT 'custom',
  code        VARCHAR(50),
  name        VARCHAR(255) NOT NULL,
  cat         VARCHAR(100),
  tipo        VARCHAR(20)  DEFAULT 'ACTIVO',
  unit        VARCHAR(20)  DEFAULT 'und',
  unit_price  NUMERIC      DEFAULT 0,
  qty         NUMERIC      DEFAULT 1,
  subtotal    NUMERIC      DEFAULT 0,
  sort_order  INTEGER      DEFAULT 0,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_plans (
  id          VARCHAR(32)  PRIMARY KEY,
  project_id  VARCHAR(32)  NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  size        INTEGER      DEFAULT 0,
  mime_type   VARCHAR(100),
  data_url    TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_project   ON project_items(project_id);
CREATE INDEX IF NOT EXISTS idx_plans_project   ON project_plans(project_id);

-- Columna owner: en BD nuevas ya viene en CREATE TABLE projects; en BD antiguas hay que añadirla
-- antes de cualquier índice sobre owner_user_id.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_user_id);
