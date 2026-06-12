# 🎓 InfoBot — Chatbot Académico Universitario

> Chatbot inteligente para estudiantes universitarios vía Telegram.  
> Stack: NestJS 11 · Prisma 7 · PostgreSQL · OpenAI GPT-4o-mini · MCP

---

## 🚀 Setup Rápido

### 1. Requisitos
- Node.js 20+
- PostgreSQL 14+ (local o en la nube)
- Cuenta OpenAI (para IA real) — opcional para demo
- Bot de Telegram creado con [@BotFather](https://t.me/botfather)

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus valores reales:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/infobot"
OPENAI_API_KEY="sk-..."
TELEGRAM_BOT_TOKEN="123456:ABC-..."
```

### 3. Instalar dependencias

```bash
npm install
```

### 4. Crear base de datos en PostgreSQL

```sql
-- Ejecutar en psql o pgAdmin:
CREATE DATABASE infobot;
```

### 5. Aplicar schema y seed

```bash
npm run setup
# Equivale a: prisma db push && ts-node prisma/seed.ts
```

### 6. Iniciar en desarrollo

```bash
npm run start:dev
```

El bot se conectará a Telegram usando **long polling** (no necesitas webhook en desarrollo).

---

## 📱 Cómo probar el bot

1. Abre Telegram y busca tu bot
2. Escribe `/start`
3. Ingresa el código universitario de demo: **`2021-0042`**
4. ¡Listo! Prueba estas consultas:

| Pregunta | Herramienta activada |
|---|---|
| `¿Qué clases tengo mañana?` | `get_schedule` |
| `¿Cuál es mi promedio?` | `get_grades` |
| `¿Qué materias estoy cursando?` | `get_enrolled_subjects` |
| `¿Cuándo son mis exámenes?` | `get_academic_events` |
| `¿Cómo solicito una beca?` | `search_university_documents` |

**Estudiantes de demo:**
- `2021-0042` → Carlos Mendoza (Semestre 6)
- `2022-0015` → María Rodríguez (Semestre 4)

---

## 🏗️ Estructura del Proyecto

```
src/
├── prisma/          # PrismaService (conexión BD)
├── auth/            # Login por código universitario
├── ai/              # GPT-4o-mini + tool calling loop
├── mcp/             # MCP Server + 5 herramientas académicas
│   └── tools/
│       ├── schedule.tool.ts    # Horarios
│       ├── grades.tool.ts      # Notas y promedios
│       ├── subjects.tool.ts    # Materias inscritas
│       ├── calendar.tool.ts    # Eventos académicos
│       └── documents.tool.ts   # RAG documentos
├── rag/             # Búsqueda en documentos universitarios
├── telegram/        # Bot grammy + webhook/polling
└── students/        # REST API estudiantes (para demo web)
```

---

## 🌐 Despliegue en Railway

1. Crea proyecto en [railway.app](https://railway.app)
2. Agrega servicio **PostgreSQL** desde el dashboard
3. Conecta tu repositorio GitHub
4. Railway detecta NestJS automáticamente
5. Agrega las variables de entorno en el panel de Railway
6. Configura el webhook de Telegram:
   ```
   POST https://api.telegram.org/bot{TOKEN}/setWebhook
   Body: { "url": "https://tu-app.railway.app/api/v1/telegram/webhook" }
   ```

---

## 🔧 Scripts disponibles

```bash
npm run start:dev      # Desarrollo con hot reload
npm run build          # Compilar para producción
npm run start:prod     # Iniciar build de producción

npm run setup          # Inicializar BD + seed datos demo
npm run seed           # Solo seed (sin migrate)
npm run db:reset       # Reset completo + seed
npm run prisma:studio  # Abrir Prisma Studio (GUI para BD)
npm run prisma:push    # Aplicar schema a la BD
```

---

## 🤖 Arquitectura MCP

El bot usa **Model Context Protocol** para llamar herramientas estructuradas:

```
Usuario → Telegram → NestJS → GPT-4o-mini
                                    ↓
                              [decide tool]
                                    ↓
                          MCP Server (integrado)
                          ├── get_schedule → PostgreSQL
                          ├── get_grades → PostgreSQL  
                          ├── get_enrolled_subjects → PostgreSQL
                          ├── get_academic_events → PostgreSQL
                          └── search_university_documents → RAG
                                    ↓
                          Resultado JSON → GPT-4o-mini → Respuesta en español
```

---

## 📊 Endpoints REST (para integración web futura)

```
GET  /api/v1/students              # Lista estudiantes
GET  /api/v1/students/:code        # Detalle por código
POST /api/v1/telegram/webhook      # Webhook de Telegram
POST /api/v1/telegram/set-webhook  # Configurar webhook
```
