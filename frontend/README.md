# FES Workflow Management - Frontend

A Next.js 14 dashboard for design workflow management with task tracking, two-layer approvals, analytics, notifications, and social media posting.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **State**: React Context (AuthContext)
- **HTTP Client**: Axios
- **Icons**: Lucide React

## Quick Start
```bash
cd frontend
npm install
npm run dev
```

App runs at: `http://localhost:3000`

---

## 📁 Folder Structure

```
frontend/src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Auth pages (login, register)
│   ├── dashboard/          # Protected dashboard pages
│   ├── layout.tsx          # Root layout
│   ├── globals.css         # Global styles + Tailwind
│   └── page.tsx            # Home redirect
├── components/
│   ├── dashboard/          # Dashboard-specific components
│   ├── tasks/              # Task-related components
│   └── ui/                 # Reusable UI components
├── contexts/
│   └── AuthContext.tsx     # Auth state & role management
└── lib/                    # API functions & utilities
```

---

## 📄 Pages (`app/`)

### Auth Pages (`app/(auth)/`)
| File | Route | Purpose |
|------|-------|---------|
| `login/page.tsx` | `/login` | Login form |
| `register/page.tsx` | `/register` | Registration form |

### Dashboard Pages (`app/dashboard/`)
| File | Route | Access | Purpose |
|------|-------|--------|---------|
| `page.tsx` | `/dashboard` | All | Main dashboard with KPIs |
| `layout.tsx` | - | - | Dashboard layout with sidebar |
| `tasks/page.tsx` | `/dashboard/tasks` | All | Task list with create modal |
| `tasks/[taskId]/page.tsx` | `/dashboard/tasks/:id` | All | Task detail view |
| `approvals/page.tsx` | `/dashboard/approvals` | Admin/Approver | Two-layer approval queue |
| `analytics/page.tsx` | `/dashboard/analytics` | Admin | Performance charts |
| `notifications/page.tsx` | `/dashboard/notifications` | All | Notification list |
| `posting/page.tsx` | `/dashboard/posting` | Admin | Social media posting |

---

## 🧩 Components

### Dashboard Components (`components/dashboard/`)
| File | Purpose |
|------|---------|
| `Sidebar.tsx` | Navigation sidebar with role-based menu items |
| `TopBar.tsx` | Page header with title/subtitle |
| `KPICard.tsx` | Stat card with icon |
| `KPISection.tsx` | Grid of KPI cards |
| `RecentTasks.tsx` | Recent tasks table |

### Task Components (`components/tasks/`)
| File | Purpose |
|------|---------|
| `TasksTable.tsx` | Task list table with filters |
| `TaskCard.tsx` | Task preview card |
| `TaskModal.tsx` | Task details in modal |

### UI Components (`components/ui/`)
| File | Purpose |
|------|---------|
| `button.tsx` | Primary/secondary/ghost buttons |
| `input.tsx` | Text input with styling |
| `card.tsx` | Card container with content area |
| `Badge.tsx` | Status badges (approved, pending, working, etc.) |
| `Avatar.tsx` | User avatar with initials |
| `Toast.tsx` | Toast notifications provider |
| `Skeleton.tsx` | Loading skeletons |
| `EmptyState.tsx` | Empty state illustrations |

---

## 🔐 Auth Context (`contexts/AuthContext.tsx`)

Manages authentication state and role-based access.

### Exported Values
```typescript
{
  user: User | null        // Current user object
  isLoading: boolean       // Auth loading state
  isAuthenticated: boolean // Is logged in
  login: (token, userData) => void
  logout: () => void
  isAdmin: boolean         // user.role === 'admin'
  isDesigner: boolean      // user.role === 'designer'
  isApprover: boolean      // user.role === 'approver'
}
```

### Role Normalization
All roles are normalized to lowercase for consistent comparison:
```typescript
const normalizeRole = (role: string) => role.toLowerCase()
```

---

## 📚 API Library (`lib/`)

All API calls are organized by feature.

| File | Purpose |
|------|---------|
| `api.ts` | Axios instance with auth interceptor |
| `auth.ts` | Login, register functions |
| `tasks.ts` | Task CRUD, approval actions, comments, history |
| `users.ts` | Get designers list |
| `notifications.ts` | Get notifications, mark read |
| `analytics.ts` | Designer/assigner performance, bottlenecks |
| `social.ts` | Social connections, OAuth, posting |
| `dashboard.ts` | Dashboard stats |
| `import.ts` | Task import functions |
| `utils.ts` | `cn()` utility for Tailwind class merging |

### Key Types in `tasks.ts`
```typescript
type DesignStatus = 'Pending' | 'Working' | 'Completed'
type ApprovalStatus = 'Pending' | 'AdminApproved' | 'Approved' | 'ChangesRequired'
type ContentForEntity = 'MKT' | 'PTX' | 'FES' | 'ZONG' | 'JINGDONG' | 'SUPERCELL'

interface Task {
  id: string
  title: string
  description: string
  assigned_by_name: string
  designer_name: string
  design_status: DesignStatus
  approval_status: ApprovalStatus
  content_for?: ContentForEntity
  is_urgent: boolean
  deadline?: string
  // ... more fields
}
```

---

## 🎨 Styling

### Tailwind Config
Custom colors and utilities in `tailwind.config.ts`:
- `shadow-soft` - Soft card shadows
- `animate-fade-in` - Fade in animation

### Badge Variants
```typescript
type BadgeVariant = 
  | 'approved'   // green
  | 'pending'    // yellow
  | 'working'    // blue
  | 'completed'  // emerald
  | 'urgent'     // red
```

---

## 🔀 Routing & Access Control

### Sidebar Navigation
Menu items filtered by role:
```typescript
{
  label: 'Posting',
  href: '/dashboard/posting',
  adminOnly: true  // Only admins see this
}

{
  label: 'Approvals',
  href: '/dashboard/approvals',
  adminOnly: true,
  approverAllowed: true  // Admins AND approvers see this
}
```

### Role-Based Rendering
```tsx
const { isAdmin, isDesigner, isApprover } = useAuth()

{isAdmin && <AdminOnlyComponent />}
{(isAdmin || isApprover) && <ApprovalActions />}
```

---

## 📱 Key Workflows

### Two-Layer Approval UI
1. **Admin** sees tasks in Approvals → clicks "Admin Approve" → status becomes `AdminApproved`
2. **Approver** sees AdminApproved tasks → clicks "Final Approve" → status becomes `Approved`
3. Either can "Request Changes" → status becomes `ChangesRequired`
4. Designer completes → status resets to `Pending` (cycle repeats)

### Social Media Posting UI
1. Admin navigates to `/dashboard/posting`
2. Clicks "Connect" on Instagram/Facebook/LinkedIn
3. Completes OAuth flow
4. Enters image URL + caption
5. Selects platforms and clicks "Post"

---

## 🔧 Common Patterns

### Adding a New Page
1. Create `app/dashboard/newpage/page.tsx`
2. Add route to `Sidebar.tsx` navItems
3. Create API functions in `lib/newfeature.ts`

### Loading States
```tsx
const [loading, setLoading] = useState(true)

if (loading) {
  return <SkeletonKPI /> // or SkeletonTable
}
```

### Toast Notifications
```tsx
const { showToast } = useToast()

showToast('success', 'Task created!')
showToast('error', 'Something went wrong')
```

### API Calls with Error Handling
```tsx
try {
  const data = await apiFunction()
  showToast('success', 'Done!')
} catch (err: any) {
  showToast('error', err.response?.data?.detail || 'Error')
}
```

---

## 🌐 Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 📊 Analytics Page Features

- **Summary KPIs**: Total tasks, completed, overall rate, top designer
- **Designer Comparison**: Horizontal bar charts (completed vs pending)
- **Assigner Performance**: Bar charts by admin/assigner
- **Bottleneck Alerts**: Overdue, at-risk, stuck task counts
- **Overloaded Designers**: Designers with 5+ active tasks
