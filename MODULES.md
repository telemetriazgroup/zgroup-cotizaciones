# ZGROUP — Documentación de Módulos

> Referencia detallada del comportamiento esperado de cada módulo, casos de borde y criterios de aceptación.

---

## Módulo 0 — Autenticación

### Comportamiento
- Login con email/password → JWT access (15min) + refresh token (7d)
- Refresh automático silencioso cuando el access token expira (React Query interceptor)
- Logout invalida el refresh token en BD y Redis

### Roles y Permisos

| Acción | ADMIN | COMERCIAL | VIEWER |
|--------|-------|-----------|--------|
| Ver propios proyectos | ✅ | ✅ | ✅ |
| Ver todos los proyectos | ✅ | ❌ | ❌ |
| Crear/editar proyecto | ✅ | ✅ | ❌ |
| Eliminar proyecto | ✅ | Solo propios | ❌ |
| Editar catálogo | ✅ | ❌ | ❌ |
| Exportar | ✅ | ✅ | ✅ |

### Casos de borde
- Token expirado durante una edición → interceptor refresca y reintenta la request original
- Refresh token expirado → redirigir al login con mensaje "Sesión expirada"
- Múltiples tabs → todas deben sincronizar el estado de auth (broadcast channel o localStorage event)

### Criterios de aceptación
- [ ] Login exitoso redirige al workspace
- [ ] Login fallido muestra error "Credenciales incorrectas"
- [ ] Access token expira → siguiente request se renueva automáticamente (invisible al usuario)
- [ ] Logout elimina cookies y redirige a `/login`

---

## Módulo 1 — Catálogo

### Comportamiento
- Panel izquierdo siempre visible (270px fijo)
- Búsqueda en tiempo real (debounce 200ms) por nombre o código
- Filtros por categoría: Todos | Trab. Estructura | Sistema de Frio | Accesorios | Puertas
- Click en ítem → agregar al presupuesto con qty y precio de los controles inferiores
- Si el ítem ya existe con el mismo precio → sumar qty (no duplicar fila)

### Datos del catálogo (55 ítems — migrar de HTML a BD)

| Categoría | Cantidad | Tipos |
|-----------|----------|-------|
| Trab. Estructura | 21 | ACTIVO + CONSUMIBLE |
| Sistema de Frio | 8 | ACTIVO |
| Accesorios | 18 | ACTIVO + CONSUMIBLE |
| Puertas | 8 | ACTIVO |

### Controles de adición
- **CANTIDAD**: default 1, mínimo 0.01, paso 0.01
- **P.UNIT CUSTOM**: opcional. Si se llena, sobreescribe el precio del catálogo
- **+ PIEZA PERSONALIZADA**: abre modal para ítem libre (código, nombre, tipo, unidad, qty, precio)

### Casos de borde
- Búsqueda sin resultados → mensaje vacío, no error
- Precio custom = 0 → permitido (puede ser un servicio interno)
- Catálogo vacío (error de API) → mostrar ítems del catálogo en caché local (React Query staleTime: Infinity)

### Criterios de aceptación
- [ ] Filtrar por categoría + buscar simultáneamente
- [ ] Click en ítem añade con la qty y precio custom ingresados
- [ ] Si el ítem existe con mismo precio → qty se suma, no se duplica
- [ ] Pieza personalizada aparece en el presupuesto como cualquier otro ítem
- [ ] El catálogo se carga desde BD; si falla, usa caché

---

## Módulo 2 — Presupuesto Detallado

### Comportamiento
- Columnas: Código | Descripción | Und | P.Unit (editable) | Cant. (editable) | Subtotal | Eliminar
- Edición inline de precio y cantidad → subtotal recalcula en tiempo real
- Botón LIMPIAR → confirmar antes de borrar todo
- Footer: subtotal activos | subtotal consumibles | total lista

### Cálculo de subtotales
```
subtotal_item = unitPrice × qty
total_activos = sum(subtotal donde tipo === 'ACTIVO')
total_consumibles = sum(subtotal donde tipo === 'CONSUMIBLE')
total_lista = total_activos + total_consumibles
```

### Casos de borde
- Precio unitario = 0 → permitido, subtotal = 0
- Qty negativa → no permitido (validar min=0.01)
- Qty decimal → permitido (ej: 0.5 metros lineales)
- Edición rápida de múltiples campos → debounce 300ms antes de guardar en API

### Criterios de aceptación
- [ ] Editar precio → subtotal y totales del footer actualizan inmediatamente
- [ ] Editar cantidad → mismo comportamiento
- [ ] Eliminar ítem → fila desaparece con animación fade-out
- [ ] LIMPIAR pide confirmación antes de proceder
- [ ] Cambios se persisten en BD (no solo en memoria)
- [ ] Total lista en InfoBar (barra superior) sincroniza con el footer

---

## Módulo 3 — Venta Directa (M1 Financial)

### Comportamiento
- Dos modos: **Margen de Seguridad** (sube el precio) o **Descuento Comercial** (baja el precio)
- Input porcentaje con step 0.5
- Resultado = `base ± base × (pct / 100)`
- El `ventaTotal` resultante es la **base de todos los módulos siguientes**

### Fórmulas
```
Margen:    ventaTotal = base × (1 + adjPct/100)
Descuento: ventaTotal = base × (1 - adjPct/100)
```

### Casos de borde
- adjPct = 0 → ventaTotal = base (válido)
- adjPct = 100 con descuento → ventaTotal = 0 (mostrar warning visual)
- Cambiar de margen a descuento → recalcular todo inmediatamente

### Criterios de aceptación
- [ ] El modo activo (Margen/Descuento) se resalta visualmente
- [ ] Cambiar % recalcula en tiempo real todos los módulos financieros
- [ ] "TOTAL VENTA" en el header del módulo sincroniza con el resultado
- [ ] Label del ajuste cambia según el modo ("+Seguridad" vs "−Dto.")

---

## Módulo 4 — Corto Plazo (M2 Financial)

### Comportamiento
Capital propio ZGROUP. ZGROUP compra el equipo, lo alquila y recupera la inversión.

### Parámetros
| Campo | Default | Descripción |
|-------|---------|-------------|
| Plazo contrato | 6 meses | Duración del alquiler |
| Vida útil CP | 60 meses | Desgaste por montaje/desmontaje frecuente |
| Gtos. Operativos | 5% anual | Mantenimiento, admin |
| ROA anual | 35% | Retorno sobre activos (la ganancia ZGROUP) |
| Factor merma montaje | 2% | Daño por instalación, amortizado en el contrato |

### Fórmulas
```
Base = ventaTotal

Depreciación mensual = ventaTotal / vidaUtil_CP
Merma mensual        = ventaTotal × (merma% / 100) / plazoContrato
Gtos.Op mensual      = ventaTotal × (gtosOp% / 100) / 12
Consumibles mensual  = totalConsumibles / plazoContrato  (solo si hay consumibles)
ROA mensual          = ventaTotal × (ROA% / 100) / 12   ← GANANCIA ZGROUP

Renta al cliente     = Dep + Merma + Gtos.Op + Consumibles + ROA

Ganancia ZGROUP/mes  = ROA mensual
Punto de equilibrio  = ceil(ventaTotal / ROA_mensual)   [meses]
```

### Casos de borde
- Sin consumibles → fila de consumibles oculta
- Vida útil < plazo contrato → warning (depreciación > precio en el contrato)
- ROA = 0 → Ganancia = 0, PE = infinito (mostrar "—")

### Criterios de aceptación
- [ ] Todos los labels dinámicos sincronizan (vida útil, merma%, plazo)
- [ ] Con consumibles → fila visible con monto correcto
- [ ] KPIs: Ganancia mensual (verde) y Punto equilibrio (cyan) correctos
- [ ] Header del acordeón muestra la renta al cliente actual

---

## Módulo 5 — Largo Plazo (M3 Financial)

### Comportamiento
El banco financia el 100% del equipo. ZGROUP gestiona el leasing y gana el spread
entre la tasa que paga al banco y la que cobra al cliente.

### Parámetros
| Campo | Default | Descripción |
|-------|---------|-------------|
| Vida útil LP | 120 meses | Mayor que CP (equipo estático) |
| Plazo préstamo banco | 24 meses | N del sistema francés |
| Plazo contrato cliente | 36 meses | Debe ser ≥ plazo banco |
| TEA banco | 7% | Costo financiero |
| Tasa cotización cliente | 15% | Lo que paga el cliente (debe > TEA banco) |
| Gtos. operativos | 5% anual | Mantenimiento admin |
| Gastos formalización | $350 | Costos notariales, SUNARP, etc. |
| Renta post-préstamo | 80% | % de la renta F1 que paga el cliente en F2 |
| Fondo de reposición | 5% anual | Se activa si contrato > 80% vida útil |

### Fórmulas — Sistema Francés
```
TotalFinanciado = ventaTotal + gastos_formalizacion

TEM_banco   = (1 + TEA_banco/100)^(1/12) - 1
TEM_cliente = (1 + TEA_cliente/100)^(1/12) - 1

Cuota banco   = TotalFin × TEM_banco   / (1 - (1+TEM_banco)^-N_banco)
Cuota cliente = TotalFin × TEM_cliente / (1 - (1+TEM_cliente)^-N_banco)

Gtos.Op mensual = ventaTotal × (gtosOp% / 100) / 12

── FASE 1 (meses 1 a N_banco) ──
Spread         = Cuota_cliente - Cuota_banco  ← ganancia ZGROUP F1
Renta F1       = Cuota_cliente + Gtos.Op       ← lo que paga el cliente
Ganancia F1/mes = Spread
Total F1        = Ganancia_F1 × N_banco

── FASE 2 (meses N_banco+1 a N_contrato) ──
N_F2            = N_contrato - N_banco
Renta F2        = Renta_F1 × (postPct/100)     ← fidelización, más barata
Ganancia F2/mes = Renta_F2 - Gtos.Op - Fondo_rep_mensual
Total F2        = Ganancia_F2 × N_F2

── TOTALES ──
Total_ciclo = Total_F1 + Total_F2
PE          = ceil(gastos_form / Ganancia_F1)  [meses para recuperar form.]

── FONDO DE REPOSICIÓN ──
Activar si: N_contrato > lpVida × 0.80
Fondo mensual = ventaTotal × (fondoRep% / 100) / 12
```

### Timeline Visual
- Barra horizontal con 2 fases: Fase1 (roja, proporcional) + Fase2 (verde)
- Marcador amarillo en el punto donde el banco queda liquidado
- Labels dinámicos con meses de cada fase

### Tabla de Amortización
- Expandible (lazy render)
- N filas × 5 columnas: N° | Saldo Inicial | Interés | Amortización | Cuota
- Virtualizar si N > 60 (usar @tanstack/virtual)

### Casos de borde
- N_contrato = N_banco → Fase 2 = 0 meses (solo mostrar Fase 1)
- TEA banco = 0 → cuota = TotalFin / N (sin interés)
- Tasa cliente < Tasa banco → Spread negativo → ERROR (mostrar alerta roja)
- N_contrato < N_banco → forzar N_contrato = N_banco (validar en UI)

### Criterios de aceptación
- [ ] Timeline se actualiza en tiempo real con los inputs
- [ ] Alerta de fondo de reposición aparece/desaparece correctamente
- [ ] Tabla de amortización muestra cuotas correctas (verificar con calculadora financiera)
- [ ] KPIs: Utilidad F1, Utilidad F2, Total Ciclo correctos
- [ ] Header del acordeón muestra renta F1 actual

---

## Módulo 6 — Estacionalidad (M4 Financial)

### Comportamiento
Para clientes agroindustriales que usan el equipo solo parte del año.
El contrato es anual pero con tarifa reducida en meses sin producción.

### Parámetros
| Campo | Default | Descripción |
|-------|---------|-------------|
| Meses operativos | 8 | Meses a tarifa full (campaña) |
| Meses standby | 4 | Meses a tarifa reducida (fuera de campaña) |
| Seguro (% anual) | 1% | Seguro del activo (cubre los 12 meses) |
| % Ajuste standby | 35% | % de la renta full que paga en standby |

### Fórmulas
```
Renta Full = Renta F1 del módulo LP (la referencia siempre es LP)
Renta Standby = Renta Full × (sbPct / 100)

Costo mínimo standby (piso) = Cuota banco + Seguro mensual + Gestión 5%
⚠️ Alerta si Renta Standby < Costo mínimo

── INGRESOS ANUALES ──
Ingreso full year     = Renta Full × meses_operativos
Ingreso standby year  = Renta Standby × meses_standby
Ingreso total año     = Ingreso full + Ingreso standby

── TABLA 5 AÑOS FIJOS ──
Para cada año (1-5):
  Meses en Fase 1 vs Fase 2 = según N_banco y N_contrato
  Ingreso bruto = f(meses F1/F2, seasonalRatio)
  Pago banco    = Cuota_banco × meses_en_F1
  Gtos.Op       = Gtos.Op mensual × meses_activos
  Utilidad neta = Ingreso - Pago banco - Gtos.Op
  Acumulado     = sum(util_neta hasta este año)

seasonalRatio = (estOp + estSb × sbPct/100) / 12

REGLA DE ORO: sum(UtilNeta 5 años) = Total_Ciclo_LP × seasonalRatio
```

### Alertas
1. **Standby < costo mínimo**: Alerta roja con el % mínimo requerido
2. **Fila de transición F1→F2**: Banner cyan cuando un año tiene ambas fases
3. **Primer año F2 completo**: Banner verde "Pago al banco = $0.00"

### Criterios de aceptación
- [ ] Alerta standby < costo mínimo con porcentaje correcto sugerido
- [ ] Tabla 5 años genera exactamente 5 años (filas fijas, no variable)
- [ ] Fila de totals (tfoot) suma correctamente
- [ ] Banners de transición y F2 aparecen en el año correcto
- [ ] Regla de Oro: suma de Utilidad Neta 5 años ≈ Total Ciclo LP × seasonalRatio (tolerancia ±$1)
- [ ] Header del acordeón muestra ingreso anual estimado

---

## Módulo 7 — Panel Gerencial (M5 Financial)

### Comportamiento
Comparativa estratégica entre modalidad CP y LP para un horizonte de análisis configurable.

### Tabla comparativa (CP vs LP)
| Fila | CP | LP |
|------|----|----|
| Renta cliente/mes | cpRenta | lpRentaF1 + " F1" |
| Capital en riesgo | ventaTotal | $0 (banco) |
| Punto de equilibrio | cpPE meses | lpPE meses |
| Utilidad F1 | cpGanancia/mes | lpGanF1/mes × N_banco meses |
| Utilidad F2 | — | lpGanF2/mes × N_F2 meses |
| Ganancia {period} meses | cpGanancia × period | f1InPeriod×lpGanF1 + f2InPeriod×lpGanF2 |
| TOTAL CICLO VIDA LP | — | lpTotalCicloSeasonal |

### Lógica de ganancia en period meses (LP)
```
f1InPeriod = min(period, N_banco)
f2InPeriod = max(0, period - N_banco)
lpTotalInPeriod = lpGanF1 × f1InPeriod + lpGanF2 × f2InPeriod
```

### Alerta estratégica
```
Si lpRentaF1 > cpRenta:
  "⚠ Renta F1 LP es {diff}/mes más cara que CP. Reduce la Tasa de Cotización."
```

### Veredicto automático
```
Si ventaTotal = 0:
  "⚡ Añade partidas para ver el análisis."

Si LP es más barato (lpRentaF1 ≤ cpRenta):
  "✅ ESTRATEGIA ÓPTIMA: LP Fase 1 es {diff}/mes más barata → cliente preferirá LP.
   Desglose del ciclo completo con F1 y F2.
   Comparativa de capital en riesgo."

Sino:
  "⚠ Ajustar Tasa de Cotización LP."
```

### Criterios de aceptación
- [ ] Horizonte de análisis configurable (1-120 meses)
- [ ] Ganancia {period}m calcula correctamente la mezcla F1/F2
- [ ] Alerta visible solo cuando LP > CP
- [ ] Veredicto actualiza en tiempo real
- [ ] Total Ciclo LP usa `lpTotalCicloSeasonal` (con seasonalRatio aplicado)

---

## Módulo 8 — Planos Técnicos

### Comportamiento
- Drag & drop o click para subir archivos
- Formatos: PDF, DWG, DXF, PNG, JPG, JPEG, SVG
- Máximo 25MB por archivo
- Preview de imágenes (abrir en nueva tab)
- Descarga con URL firmada de S3 (TTL 15 minutos)

### Flujo de upload
```
1. Usuario arrastra archivo → UI muestra progress bar
2. Frontend: POST /api/projects/:id/plans (multipart/form-data)
3. API: valida MIME type, genera UUID, sube a S3 con streaming
4. API: guarda metadata en BD → retorna { id, name, size }
5. Frontend: añade ítem a la lista de planos
```

### Seguridad
- MIME type validado en servidor (no solo extensión)
- No ejecutar ni parsear archivos DWG/DXF (solo almacenar)
- URLs firmadas expiran (no links permanentes)

### Criterios de aceptación
- [ ] Drag & drop funciona sobre la zona o sobre toda el área del panel izquierdo
- [ ] Múltiples archivos en una sola operación
- [ ] Preview de imágenes abre en nueva tab con URL firmada
- [ ] Eliminar plano lo borra de S3 y de la lista
- [ ] Badge de cantidad en "Planos Técnicos" sincroniza

---

## Módulo 9 — Exportación

### Texto Plano
- Mismo formato que el HTML original
- Copiar al portapapeles o abrir en WhatsApp web
- Generado en el backend para garantizar paridad con el PDF

### PDF
- Generado asíncronamente (BullMQ job)
- Polling cada 2 segundos hasta que status = 'DONE'
- Descarga automática cuando está listo
- Logo ZGROUP en el header
- Tabla de ítems, módulos financieros y firma

### Formato del PDF
```
Página 1: Portada
  - Logo ZGROUP
  - Nombre proyecto, N° Odoo, fecha, moneda
  - Resumen ejecutivo (3 modalidades)

Página 2: Presupuesto detallado
  - Tabla de ítems (activos + consumibles)
  - Totales

Página 3: Análisis financiero
  - Venta directa
  - CP (cálculos)
  - LP (cálculos + timeline textual)

Página 4: Panel gerencial
  - Tabla comparativa CP vs LP
  - Veredicto estratégico

Última página: Planos (si los hay)
  - Lista de archivos adjuntos
  - Preview de imágenes (si caben)
```

### Criterios de aceptación
- [ ] Texto plano coincide con el del HTML original
- [ ] PDF se genera sin errores para proyectos con 0 ítems y con 55 ítems
- [ ] Exportar a WhatsApp abre la app/web con el texto pre-cargado
- [ ] Notificación cuando el PDF está listo para descargar

---

## Módulo 10 — Proyectos (CRUD)

### Crear proyecto
1. Modal con: Nombre (requerido) + N° Odoo (opcional)
2. POST /api/projects → crea Project + ProjectParams con defaults
3. Selección automática del nuevo proyecto
4. Toast confirmación

### Clonar proyecto
1. Botón "Clonar" en el selector (o menú de opciones)
2. Nuevo nombre: "{original} (copia)"
3. Copia ítems y params, NO copia planos
4. Toast confirmación

### Eliminar proyecto
1. Botón rojo con ícono papelera en el header
2. Confirm dialog: "¿Eliminar '{nombre}'? Esta acción no se puede deshacer."
3. Soft delete (deletedAt = now())
4. Si era el proyecto activo → seleccionar el más reciente disponible

### Seleccionar proyecto
1. Select dropdown en el header
2. Al cambiar → cargar todos los datos del proyecto (params + ítems)
3. Rellenar todos los inputs financieros con los valores guardados
4. Recalcular motor financiero

### Criterios de aceptación
- [ ] Nombre vacío → error visual en el input, no crear
- [ ] N° Odoo duplicado → permitido (no es clave única)
- [ ] Al eliminar el único proyecto → mostrar EmptyState
- [ ] Clonar preserva exactamente los mismos cálculos que el original
- [ ] El selector siempre muestra el proyecto activo seleccionado
