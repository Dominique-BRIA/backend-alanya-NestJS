# Alanya Backend API — NestJS Version

API backend pour l'application Alanya : messagerie temps réel, appels audio/vidéo, stories éphémères et assistant IA.

## 🚀 Stack Technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| **NestJS** | 10.3.x | Framework principal |
| **TypeScript** | 5.5.x | Typage statique |
| **Prisma** | 6.1.x | ORM + migrations PostgreSQL |
| **PostgreSQL** | 16 | Base de données relationnelle |
| **JWT** | 9.0.x | Authentification par tokens |
| **Passport** | 0.7.x | Stratégies d'authentification |
| **Firebase Admin** | 13.0.x | Push notifications (FCM) |
| **Google Generative AI** | Latest | Assistant conversationnel IA (Gemini) |
| **Nodemailer** | 6.9.x | Envoi d'emails (OTP) |
| **Zod** | 3.24.x | Validation des données |
| **bcryptjs** | 2.4.x | Hachage des mots de passe |
| **Socket.io** | 4.x | WebSockets temps réel |
| **Swagger** | 7.3.x | Documentation API |
| **Throttler** | 6.1.x | Rate limiting |
| **AWS SDK** | 3.1077.x | Stockage B2/S3 compatible |

## 📁 Structure du Projet

```
src/
├── main.ts                    # Bootstrap + configuration globale
├── app.module.ts              # Module racine
├── common/                    # Utilitaires partagés
│   ├── decorators/            # @CurrentUser, @Public
│   ├── filters/               # HttpExceptionFilter, AllExceptionsFilter
│   ├── guards/                # JwtAuthGuard, ThrottlerGuard
│   ├── interceptors/          # Logging, Transform
│   └── pipes/                 # ZodValidationPipe
├── config/                    # Configuration centralisée
│   ├── configuration.ts       # ConfigService typé
│   └── env.validation.ts      # Validation variables d'env (Joi)
├── prisma/                    # Module Prisma global
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── modules/                   # Modules métier (feature modules)
│   ├── auth/                  # Authentification complète
│   ├── users/                 # Profils, recherche
│   ├── countries/             # Référentiel pays
│   ├── contacts/              # Gestion contacts
│   ├── conversations/         # Conversations (CRUD)
│   ├── messages/              # Messages (CRUD, temps réel)
│   ├── calls/                 # Appels audio/vidéo
│   ├── meetings/              # Réunions planifiées
│   ├── statuses/              # Stories/Statuts
│   ├── media/                 # Upload/download médias
│   ├── push/                  # Notifications push FCM
│   ├── ai/                    # Assistant IA (Gemini)
│   ├── blocked/               # Utilisateurs bloqués
│   └── health/                # Health checks
└── gateway/                   # WebSocket Gateway
    ├── events.gateway.ts
    └── guards/
```

## ⚡ Installation et Démarrage

### Prérequis
- **Node.js** 20+
- **PostgreSQL** 16+
- **Redis** 7+ (optionnel, pour rate limiting distribué)

### Variables d'environnement
```bash
cp .env.example .env
# Éditer .env avec vos valeurs
```

### Avec Docker (Recommandé)
```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f app
```

### Sans Docker
```bash
# 1. Installer les dépendances
npm install

# 2. Générer le client Prisma
npm run prisma:generate

# 3. Appliquer les migrations
npm run prisma:migrate

# 4. Démarrer en développement
npm run start:dev
```

## 📚 Documentation API

Une fois l'application démarrée :
- **Swagger UI** : http://localhost:3000/docs
- **API Base URL** : http://localhost:3000/api

## 🔐 Authentification

L'API utilise des **JWT Access Tokens** (15min) + **Refresh Tokens** (7j).

### Headers requis
```
Authorization: Bearer <access_token>
```

### Endpoints publics (sans token)
- `POST /api/auth/register` — Inscription
- `POST /api/auth/login` — Connexion
- `POST /api/auth/verify` — Vérification OTP
- `POST /api/auth/forgot-password` — Demande reset
- `POST /api/auth/reset-password` — Reset avec OTP
- `POST /api/auth/refresh` — Rafraîchir tokens
- `GET /api/pays` — Liste des pays
- `GET /api/health` — Health check

## 📦 Modules Principaux

### Auth (`/api/auth`)
- Inscription avec email + pays
- Connexion email/mot de passe
- Vérification email par OTP (6 chiffres)
- Configuration profil (pseudo + mot de passe)
- Reset mot de passe par OTP
- Refresh / Logout tokens

### Users (`/api/users`)
- `GET /me` — Profil connecté
- `PUT /me` — Mise à jour profil
- `GET /search` — Recherche utilisateurs
- `GET /public/:publicNumber` — Profil par numéro public

### Countries (`/api/pays`)
- `GET /` — Liste pays (public)
- `GET /:idPays` — Détail pays (public)
- CRUD admin (protégé)

### Contacts (`/api/contacts`)
- `GET /` — Liste contacts
- `GET /blocked` — Contacts bloqués
- `POST /` — Ajouter par numéro public
- `PUT /:contactId` — Modifier alias/blocage
- `DELETE /:contactId` — Supprimer
- `POST /:contactId/block` — Bloquer
- `POST /:contactId/unblock` — Débloquer

### Conversations (`/api/conversations`)
- `GET /` — Liste conversations paginée
- `GET /:id` — Détail conversation
- `POST /` — Créer (directe ou groupe)
- `PUT /:id` — Modifier (admin groupe)
- `POST /:id/participants` — Ajouter participants (groupe)
- `DELETE /:id/participants/:userId` — Retirer participant
- `POST /:id/leave` — Quitter

### Messages (`/api/conversations/:conversationId/messages`)
- `GET /` — Messages paginés
- `POST /` — Envoyer message
- `DELETE /:messageId` — Supprimer (expéditeur)
- `POST /:messageId/hide` — Masquer pour soi
- `PUT /:messageId/read` — Marquer lu
- `GET /unread/count` — Compteur non lus

### Calls (`/api/calls`)
- `POST /initiate` — Initier appel
- `PUT /action` — Accepter/Refuser/Terminer
- `GET /:callId` — Détail appel
- `GET /` — Historique appels

### Meetings (`/api/meetings`)
- `GET /` — Liste réunions
- `GET /:id` — Détail réunion
- `POST /` — Créer réunion
- `PUT /:id` — Modifier (organisateur)
- `DELETE /:id` — Supprimer (organisateur)
- `PUT /:id/participants/:userId` — Répondre invitation
- `PUT /:id/connection` — Statut connexion

### Statuses (`/api/statuses`)
- `GET /` — Fil d'actualité (contacts + soi)
- `GET /user/:userId` — Statuts d'un utilisateur
- `POST /` — Créer statut (24h)
- `DELETE /:id` — Supprimer son statut
- `POST /:id/view` — Marquer vu
- `GET /:id/views` — Qui a vu (auteur)

### Media (`/api/media`)
- `POST /presign-upload` — URL upload presignée
- `POST /confirm-upload` — Confirmer upload
- `GET /:id` — Détail média
- `GET /:id/download` — URL téléchargement
- `DELETE /:id` — Supprimer média
- `GET /conversation/:id` — Médias conversation

### Push (`/api/push`)
- `POST /register` — Enregistrer device FCM
- `GET /devices` — Lister devices
- `DELETE /devices/:id` — Supprimer device

### AI (`/api/ai`)
- `GET /threads` — Liste threads
- `GET /threads/:id` — Détail thread
- `POST /threads` — Nouveau thread
- `DELETE /threads/:id` — Supprimer thread
- `POST /chat` — Discuter avec Gemini

### Blocked (`/api/blocked`)
- `GET /` — Utilisateurs bloqués
- `POST /` — Bloquer utilisateur
- `DELETE /:id` — Débloquer

### Health (`/api/health`)
- `GET /` — Health check basique
- `GET /db` — Check base de données
- `GET /ready` — Readiness probe
- `GET /live` — Liveness probe

## 🔌 WebSocket (Temps Réel)

Connexion : `ws://localhost:3000` avec `?token=<access_token>`

### Événements Client → Serveur
```typescript
// Rejoindre une conversation
socket.emit('conversation:join', { conversationId })

// Quitter une conversation
socket.emit('conversation:leave', { conversationId })

// Envoyer un message
socket.emit('message:send', { conversationId, content, type, mediaId })

// Marquer lu
socket.emit('message:read', { conversationId, messageId })

// Typing indicator
socket.emit('typing:start', { conversationId })
socket.emit('typing:stop', { conversationId })

// Signalisation WebRTC
socket.emit('call:signal', { callId, targetUserId, signal })
```

### Événements Serveur → Client
```typescript
// Nouveau message
socket.on('message:new', (message) => {})

// Message lu
socket.on('message:read', ({ messageId, readBy }) => {})

// Typing
socket.on('typing:start', ({ conversationId, userId }) => {})
socket.on('typing:stop', ({ conversationId, userId }) => {})

// Statut utilisateur
socket.on('user:status', ({ userId, isOnline }) => {})

// Appel entrant
socket.on('call:incoming', (callData) => {})

// Signalisation WebRTC
socket.on('call:signal', ({ callId, fromUserId, signal }) => {})

// Nouveau statut
socket.on('status:new', (status) => {})

// Statut vu
socket.on('status:viewed', ({ statusId, viewerId }) => {})
```

## 🧪 Tests

```bash
# Tests unitaires
npm run test

# Tests e2e
npm run test:e2e

# Couverture
npm run test:cov
```

## 📦 Build Production

```bash
npm run build
npm run start:prod
```

## 🐳 Déploiement Docker

```bash
# Build image
docker build -t alanya-api .

# Run container
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  alanya-api
```

## 🔧 Scripts Utiles

```bash
# Prisma Studio (interface DB)
npm run prisma:studio

# Migration production
npm run prisma:migrate:deploy

# Seed base de données
npm run prisma:seed

# Linting
npm run lint

# Formatage
npm run format
```

## 📝 Variables d'Environnement Requises

| Variable | Description | Requis |
|----------|-------------|--------|
| `DATABASE_URL` | URL PostgreSQL | ✅ |
| `JWT_ACCESS_SECRET` | Secret access token (32+ chars) | ✅ |
| `JWT_REFRESH_SECRET` | Secret refresh token (32+ chars) | ✅ |
| `GEMINI_API_KEY` | Clé API Google Gemini | ❌ |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | Compte service Firebase (base64) | ❌ |
| `SMTP_*` | Configuration SMTP | ❌ |
| `B2_*` | Configuration Backblaze B2 | ❌ |

## 📄 Licence

Projet privé — BRIA GROUP