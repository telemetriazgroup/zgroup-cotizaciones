# ZGROUP — Cotizaciones Técnicas v7.0
Sistema de cotización técnico-financiero para equipos de frío industriales.
Arquitectura separada: **Node.js/Express backend** + **Frontend HTML/CSS/JS** + **PostgreSQL**.

---

## Estructura del Proyecto

```
zgroup-cotizaciones/
├── backend/                   # API REST Node.js
│   ├── .env.example           # Variables de entorno (copiar a .env)
│   ├── package.json
│   └── src/
│       ├── server.js          # Entry point Express
│       ├── db/
│       │   ├── index.js       # Pool PostgreSQL + initDb()
│       │   └── schema.sql     # Tablas: projects, project_items, project_plans
│       ├── routes/
│       │   ├── projects.js    # CRUD proyectos
│       │   ├── items.js       # CRUD partidas presupuesto
│       │   └── plans.js       # CRUD planos técnicos (PDF/IMG)
│       └── middleware/
│           └── errorHandler.js
└── frontend/                  # SPA estática
    ├── index.html             # Layout 3 columnas completo
    ├── css/
    │   └── theme.css          # Paleta dark (cyan/amber/green) + todos los estilos
    └── js/
        ├── catalog.js         # Catálogo 55 ítems ZGROUP
        ├── api.js             # Cliente HTTP → backend
        ├── ui.js              # Helpers UI: toast, moneda, modal, toggleMod
        ├── compute.js         # Motor financiero puro (5 módulos)
        └── app.js             # Estado, render, eventos, init
```

---

## Requisitos

- **Node.js** ≥ 18
- **PostgreSQL** ≥ 14
- Cualquier servidor estático para el frontend (o abrir `index.html` directamente)

---

## Instalación y Arranque

### 1. Base de datos

```sql
-- En psql o tu cliente favorito:
CREATE USER zgroup_user WITH PASSWORD 'tu_password';
CREATE DATABASE zgroup_db OWNER zgroup_user;
GRANT ALL PRIVILEGES ON DATABASE zgroup_db TO zgroup_user;
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edita .env con tus credenciales PostgreSQL
npm install
npm start          # Producción
# ó
npm run dev        # Con nodemon (hot-reload)
```

El schema SQL se aplica automáticamente en el primer arranque.
El backend corre en `http://localhost:3001`.

### 3. Frontend

**Opción A — servidor local (recomendado)**
```bash
cd frontend
npx serve .        # o: python3 -m http.server 8080
# Abrir http://localhost:3000 (o 8080)
```

**Opción B — abrir directamente**
Abrir `frontend/index.html` en el navegador.
> ⚠️ Si el navegador bloquea fetch a localhost por CORS, usar la Opción A.

---

## Variables de Entorno (`.env`)

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=zgroup_user
DB_PASSWORD=tu_password
DB_NAME=zgroup_db
PORT=3001
```

---

## Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/projects` | Lista todos los proyectos |
| POST | `/api/projects` | Crear proyecto |
| GET | `/api/projects/:id` | Proyecto completo (items + planos) |
| PUT | `/api/projects/:id` | Actualizar parámetros financieros |
| DELETE | `/api/projects/:id` | Eliminar proyecto |
| POST | `/api/projects/:id/items` | Añadir partida |
| PUT | `/api/projects/:id/items/:iid` | Actualizar partida |
| DELETE | `/api/projects/:id/items/:iid` | Eliminar partida |
| DELETE | `/api/projects/:id/items` | Limpiar todas las partidas |
| POST | `/api/projects/:id/plans` | Subir plano técnico |
| DELETE | `/api/projects/:id/plans/:plid` | Eliminar plano |

---

## Módulos Financieros

1. **Venta Directa** — Precio lista + margen de seguridad o descuento comercial
2. **Corto Plazo** — Capital propio ZGROUP: depreciación + merma + ROA
3. **Largo Plazo** — Apalancamiento bancario: Fase 1 (con deuda) + Fase 2 (activo libre)
4. **Estacionalidad** — Tarifa full + standby para clientes agro (proyección 5 años fija)
5. **Panel Gerencial** — Comparativa CP vs LP, veredicto estratégico

---

## Cambiar URL del Backend

Si el backend corre en un servidor distinto, editar la primera línea de:
```
frontend/js/api.js
```
```js
const API_BASE = 'http://TU_SERVIDOR:3001/api';
```

---

## Tech Stack

- **Backend**: Node.js + Express 4 + pg (node-postgres) + dotenv + cors
- **Frontend**: HTML5 + CSS3 + Vanilla JS (ES6+) — sin frameworks
- **BD**: PostgreSQL con UUID para IDs, índices en FKs
- **Fuentes**: Rajdhani · JetBrains Mono · Inter (Google Fonts)
