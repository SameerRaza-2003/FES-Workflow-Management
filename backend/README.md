# FES Workflow Management - Backend

A FastAPI-based REST API for managing design workflows with two-layer approval, task history, comments, notifications, analytics, and social media posting.

## Tech Stack
- **Framework**: FastAPI
- **Database**: MongoDB (Motor async driver)
- **Auth**: JWT tokens (python-jose)
- **HTTP Client**: httpx (for social media APIs)

## Quick Start
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

API runs at: `http://localhost:8000`
Docs at: `http://localhost:8000/docs`

---

## 📁 Folder Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app entry, CORS config, router registration
│   ├── core/                # Core utilities
│   │   ├── config.py        # Environment config (SECRET_KEY, DB_URL)
│   │   ├── dependencies.py  # Auth dependency (get_current_user)
│   │   └── security.py      # Password hashing, JWT creation/verification
│   ├── db/
│   │   └── mongo.py         # MongoDB connection (get_db dependency)
│   ├── models/              # Pydantic models (schemas)
│   ├── repositories/        # Database operations (CRUD)
│   ├── routers/             # API endpoints
│   ├── services/            # Business logic
│   └── utils/               # Helper functions
└── requirements.txt
```

---

## 📦 Models (`app/models/`)

| File | Purpose |
|------|---------|
| `user.py` | `UserCreate`, `UserInDB` - User registration & DB schema |
| `auth.py` | `Token`, `TokenData` - JWT token schemas |
| `task.py` | `TaskCreate`, `TaskResponse`, `TaskUpdate` - Main task models, enums for `DesignStatus`, `ApprovalStatus`, `ContentForEntity` |
| `task_comment.py` | `TaskCommentCreate`, `TaskCommentResponse` - Comment schemas |
| `task_history.py` | `TaskHistoryResponse` - History entry schema |
| `notification.py` | `NotificationResponse` - Notification with actor info |
| `social.py` | `SocialConnection`, `SocialPostCreate`, `SocialPostResponse` - Social media posting |
| `analytics_*.py` | Analytics response schemas |

### Key Enums in `task.py`
```python
DesignStatus: Pending | Working | Completed
ApprovalStatus: Pending | AdminApproved | Approved | ChangesRequired
ContentForEntity: MKT | PTX | FES | ZONG | JINGDONG | SUPERCELL
```

---

## 🗄️ Repositories (`app/repositories/`)

Database CRUD operations using Motor (async MongoDB driver).

| File | Purpose |
|------|---------|
| `user_repo.py` | User CRUD, `get_by_email()`, `get_names_map()` for ID→name lookup |
| `task_repo.py` | Task CRUD, `list_for_designer()`, `list_pending_admin_approval()`, `list_pending_final_approval()` |
| `task_comment_repo.py` | Create/list comments for a task |
| `task_history_repo.py` | Log and retrieve task history entries |
| `notification_repo.py` | Create/list/mark-read notifications |
| `social_repo.py` | Social connection CRUD, `get_by_platform()` |

---

## 🔀 Routers (`app/routers/`)

API endpoints organized by feature.

| File | Prefix | Purpose |
|------|--------|---------|
| `auth.py` | `/auth` | Login (`/login`), Register (`/register`) |
| `tasks.py` | `/tasks` | CRUD, assign designer, start/complete work, two-layer approval endpoints |
| `task_comments.py` | `/tasks/{id}/comments` | Add and list comments |
| `task_history.py` | `/tasks/{id}/history` | Get task history |
| `notifications.py` | `/notifications` | List, mark read, unread count |
| `users.py` | `/users` | List designers |
| `social.py` | `/social` | OAuth flows, connections, posting |
| `analytics_performance.py` | `/analytics/performance` | Designer & assigner metrics |
| `analytics_bottleneck.py` | `/analytics/bottlenecks` | Overdue, at-risk, stuck tasks |

### Key Task Endpoints
```
POST   /tasks                    - Create task
PATCH  /tasks/{id}               - Admin edit task
POST   /tasks/{id}/assign        - Assign designer
POST   /tasks/{id}/start         - Designer starts work
POST   /tasks/{id}/complete      - Designer completes
POST   /tasks/{id}/admin-approve - Admin approves (layer 1)
POST   /tasks/{id}/final-approve - Approver approves (layer 2)
POST   /tasks/{id}/admin-request-changes    - Admin requests changes
POST   /tasks/{id}/approver-request-changes - Approver requests changes
```

---

## ⚙️ Services (`app/services/`)

Business logic layer between routers and repositories.

| File | Purpose |
|------|---------|
| `auth_service.py` | User registration with password hashing |
| `task_service.py` | **Main orchestrator** - task workflows, notifications, history logging |
| `task_comment_service.py` | Add comments with history tracking |
| `task_history_service.py` | Log history entries |
| `notification_service.py` | Create rich notifications |
| `social_auth_service.py` | OAuth flows for Meta (Instagram/Facebook) & LinkedIn |
| `social_posting_service.py` | Post to Instagram, Facebook, LinkedIn |
| `analytics/` | Analytics calculations |

### Two-Layer Approval Flow (in `task_service.py`)
```
Designer completes → Admin reviews → AdminApproved → Approver reviews → Approved
                  ↓                              ↓
           ChangesRequired              ChangesRequired
                  ↓                              ↓
           Designer fixes ─────────────────────→
```

---

## 🔐 Authentication

- **JWT Bearer tokens** in `Authorization` header
- Token created on login, verified via `get_current_user` dependency
- Roles: `Admin`, `Designer`, `Approver`

---

## 🌐 Social Media Posting

### OAuth Flow
1. Frontend calls `GET /social/auth/{platform}` → gets OAuth URL
2. User authorizes on platform
3. Platform redirects to `GET /social/callback/{platform}`
4. Backend exchanges code for tokens, stores connection

### Posting Flow
1. `POST /social/post` with `image_url`, `caption`, `platforms[]`
2. Service posts to each selected platform
3. Returns success/failure for each

### Environment Variables Required
```env
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_REDIRECT_URI=http://localhost:3000/dashboard/posting/callback/meta

LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:3000/dashboard/posting/callback/linkedin
```

---

## 📊 Analytics Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /analytics/performance/designers` | All designers' completion rates |
| `GET /analytics/performance/assigners` | Task metrics by assigner |
| `GET /analytics/performance/me` | Current designer's stats |
| `GET /analytics/bottlenecks/overdue` | Overdue tasks |
| `GET /analytics/bottlenecks/at-risk` | Tasks due within N days |
| `GET /analytics/bottlenecks/stuck` | Tasks not updated in N days |
| `GET /analytics/bottlenecks/designer-load` | Designers with 5+ active tasks |

---

## 🔧 Common Patterns

### Adding a New Feature
1. Create model in `models/`
2. Create repository in `repositories/`
3. Create service in `services/`
4. Create router in `routers/`
5. Register router in `main.py`

### Role-Based Access
```python
if str(current_user.get("role", "")).lower() != "admin":
    raise HTTPException(status_code=403)
```

### Notifications Pattern
```python
await notification_service.notify(
    user_id=target_user_id,
    type="task_approved",
    message="Your task was approved",
    task_id=task_id,
    actor_name=current_user["full_name"],
    actor_role=current_user["role"],
    action="approved",
    task_title=task["title"]
)
```
