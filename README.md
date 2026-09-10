# AI Image Understanding & Content Matching Engine

A backend service that uses AI to analyze images, extract metadata, and match them with content posts using vector embeddings and semantic similarity.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│                    (HTTP API Requests)                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                        API LAYER                                │
│              Express.js + Zod Validation                        │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐     │
│  │   Images    │    Posts    │    Jobs     │ Suggestions │     │
│  │  Endpoints  │  Endpoints  │  Endpoints  │  Endpoints  │     │
│  └─────────────┴─────────────┴─────────────┴─────────────┘     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     SERVICE LAYER                               │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐     │
│  │   Image     │    Post     │   Batch     │ Suggestion  │     │
│  │  Service    │  Service    │  Processor  │   Service   │     │
│  └─────────────┴─────────────┴─────────────┴─────────────┘     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      AI LAYER                                   │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │   Gemini Vision     │  │  Gemini Embedding   │              │
│  │  (Image Analysis)   │  │  (Text → Vector)    │              │
│  └─────────────────────┘  └─────────────────────┘              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   MATCHING LAYER                                │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │  Cosine Similarity  │  │   Mismatch Guard    │              │
│  │    (Ranking)        │  │   (Fox/Wolf Check)  │              │
│  └─────────────────────┘  └─────────────────────┘              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     DATA LAYER                                  │
│  ┌─────────────────────────────────────────────────────┐       │
│  │           PostgreSQL + pgvector                      │       │
│  │  images │ image_metadata │ image_embeddings │ posts  │       │
│  │  post_embeddings │ suggestions │ reviews │ batch_jobs│       │
│  └─────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL 16 + pgvector
- **AI Provider:** Google Gemini (Vision + Embeddings)
- **Validation:** Zod
- **Testing:** Jest + Supertest
- **Containerization:** Docker + Docker Compose

## Setup

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Google Gemini API key

### 1. Clone the repository

```bash
git clone <repository-url>
cd flyarnk-capstone-image-relevance-mainn
```

### 2. Environment setup

```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### 3. Docker (recommended)

```bash
# Start database and application
docker compose up

# In another terminal, run migrations and seed
docker compose run app npm run migrate
docker compose run app npm run seed
```

### 4. Local development (alternative)

```bash
npm install
npm run migrate
npm run seed
npm run dev
```

## Docker Commands

```bash
# Start all services (database + app)
docker compose up

# Start in background
docker compose up -d

# Stop all services
docker compose down

# Run a one-off command (e.g., seed database)
docker compose run app npm run seed

# Run tests
docker compose run app npm test

# View logs
docker compose logs -f app
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `your_password_here` | Database password |
| `DB_NAME` | `image_relevance` | Database name |
| `GEMINI_API_KEY` | (required) | Google Gemini API key |
| `GEMINI_VISION_MODEL` | `gemini-2.0-flash` | Vision model name |
| `GEMINI_EMBEDDING_MODEL` | `text-embedding-004` | Embedding model name |
| `APP_PORT` | `3000` | Application port |
| `APP_HOST` | `localhost` | Application host |
| `SIMILARITY_THRESHOLD` | `0.75` | Minimum cosine similarity for matches |
| `CONFIDENCE_THRESHOLD` | `0.7` | Minimum AI confidence for metadata |
| `MAX_AI_COST` | `10.00` | Maximum AI spend budget ($) |

## Database Migration

```bash
# Local
npm run migrate

# Docker
docker compose run app npm run migrate
```

## Seed Data

```bash
# Local
npm run seed

# Docker
docker compose run app npm run seed
```

## Run

```bash
# Local development
npm run dev

# Docker
docker compose up

# Production
npm run build
npm start
```

## Test

```bash
npm test
```

## API Endpoints

### Health Check

```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Images

#### Create Image
```
POST /images
```

**Request:**
```json
{
  "url": "https://example.com/image.jpg",
  "filename": "fox.jpg"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "url": "https://example.com/image.jpg",
  "filename": "fox.jpg",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

#### List Images
```
GET /images
```

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://example.com/image.jpg",
    "filename": "fox.jpg",
    "status": "pending",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Get Image
```
GET /images/:id
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "url": "https://example.com/image.jpg",
  "filename": "fox.jpg",
  "status": "completed",
  "metadata": {
    "subject": "fox",
    "category": "animal",
    "attributes": ["red", "bushy tail"],
    "caption": "A red fox in a forest",
    "confidence": 0.95
  },
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

### Posts

#### Create Post
```
POST /posts
```

**Request:**
```json
{
  "title": "Beautiful Fox",
  "content": "Look at this beautiful fox in the wild"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "Beautiful Fox",
  "content": "Look at this beautiful fox in the wild",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

#### List Posts
```
GET /posts
```

#### Get Post
```
GET /posts/:id
```

### Jobs

#### Create Processing Job
```
POST /jobs/images/process
```

**Request:**
```json
{
  "imageIds": ["550e8400-e29b-41d4-a716-446655440000"],
  "processAll": false
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "type": "image_processing",
  "status": "pending",
  "total_items": 1,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

#### Get Job Status
```
GET /jobs/:id
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "type": "image_processing",
  "status": "completed",
  "total_items": 1,
  "processed_items": 1,
  "failed_items": 0,
  "created_at": "2024-01-01T00:00:00.000Z",
  "completed_at": "2024-01-01T00:00:05.000Z"
}
```

### Matching

#### Get Matching Images for Post
```
GET /posts/:id/images
```

**Response:**
```json
{
  "postId": "550e8400-e29b-41d4-a716-446655440001",
  "matched": true,
  "suggestions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "imageId": "550e8400-e29b-41d4-a716-446655440000",
      "similarity": 0.92,
      "confidence": 0.95,
      "rank": 1,
      "reason": "Subject and semantic meaning match"
    }
  ]
}
```

### Suggestions

#### Get Suggestion
```
GET /suggestions/:id
```

#### Approve Suggestion
```
POST /suggestions/:id/approve
```

**Request:**
```json
{
  "reason": "Perfect match for the article"
}
```

#### Reject Suggestion
```
POST /suggestions/:id/reject
```

**Request:**
```json
{
  "reason": "Image quality too low"
}
```

## Evaluation

```bash
npm run evaluate
```

This runs the evaluation script that measures Top-1 Precision against known correct matches.

## Limitations

- **Free tier limitations:** Gemini API has rate limits and quota restrictions on free tier
- **Image source constraints:** Images must be publicly accessible URLs; local files not supported
- **Embedding model:** Uses Google's text-embedding-004 (768 dimensions); other models not configured
- **Database:** Requires pgvector extension for vector similarity search

## Mismatch Guard

The mismatch guard prevents incorrect matches between images and posts. It:

1. **Checks similarity threshold:** Rejects matches below 0.75 cosine similarity
2. **Checks confidence threshold:** Rejects images with AI confidence below 0.7
3. **Detects animal mismatches:** Specifically catches fox/wolf confusion using keyword analysis
4. **Validates semantic overlap:** Ensures post content aligns with image metadata

The guard uses stop-word filtering and animal keyword dictionaries to perform text-based analysis without requiring additional AI calls.
