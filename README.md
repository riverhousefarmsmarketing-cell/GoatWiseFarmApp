# 🐐 GoatWise Web Dashboard

Web-based dashboard for GoatWise farm management, built with Next.js 14 and deployed on Vercel.

## 🔗 Related Projects

- [GoatWise Mobile](../goatwise-mobile) - React Native mobile app

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Styling |
| **Supabase** | Backend (shared with mobile) |
| **TanStack Query** | Data fetching & caching |
| **Zustand** | State management |
| **Chart.js** | Data visualization |
| **Vercel** | Deployment |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase project (same as mobile app)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Add your Supabase credentials to .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # Protected dashboard routes
│   │   ├── herd/           # Animal management
│   │   ├── health/         # Health records
│   │   ├── breeding/       # Breeding management
│   │   ├── milk/           # Milk production
│   │   └── finances/       # Financial tracking
│   ├── login/              # Authentication
│   └── signup/
├── components/             # React components
│   ├── ui/                 # Base UI components
│   ├── layout/             # Layout components
│   └── dashboard/          # Dashboard-specific
├── hooks/                  # Custom React hooks
│   ├── useAuth.tsx         # Authentication
│   ├── useAnimals.ts       # Animal data
│   ├── useMilk.ts          # Milk records
│   ├── useBreeding.ts      # Breeding records
│   └── useHealth.ts        # Health records
├── lib/                    # Utilities
│   ├── supabase.ts         # Supabase client
│   └── utils.ts            # Helper functions
└── types/                  # TypeScript types
    └── database.ts         # Supabase types
```

## 🔐 Authentication

The dashboard uses Supabase Auth, shared with the mobile app:

- Email/password authentication
- Session persistence
- Protected routes via middleware

## 👥 Shared Farms, Roles & Approvals

Several people can log in to one farm (migrations 019–021).

| Role | Can do |
|------|--------|
| **Owner** | Everything, including inviting managers, changing roles and removing people |
| **Manager** | Everything except role changes and removing people; approves deletions, posts updates, makes assignments, invites workers |
| **Worker** | Adds and edits every kind of record; deleting files a request for approval |

- **Invites**: Team page → *Invite someone* creates a one-time link (`/join/<token>`, 14 days). New people sign up from it and land in the farm; people with a login accept it and can switch between farms in the sidebar.
- **Change history**: a database trigger logs every insert, update and delete (who, when, old and new values) to `audit_log`. See *Change History* and each animal's *History* tab. Clients cannot write to or edit the log.
- **Delete approval**: only owners and managers can delete. App screens call `deleteOrRequest()` (`src/lib/deleteRecord.ts`), which deletes for managers and files a `deletion_requests` row for workers. Decisions are made on *Approvals*.
- **Farm updates & assignments**: `farm_posts` (with read receipts) and `assignments` (multiple assignees, due dates, optional repeat; completing a repeating task creates the next one).
- **Complimentary farms**: `farms.complimentary` marks a farm that must never be charged once billing exists. It can only be set from the database, e.g. `update farms set complimentary = true where id = '…';`
- **Data access**: every farm table has a `farm_id` (defaulting to the caller's current farm) and RLS of `farm_id = current_farm_id()`. `user_id` now means *created by*. Queries should not filter by `user_id`.

Database tests for all of this: `PGHOST=… PGPORT=… supabase/tests/run.sh` (needs a local Postgres).

## 🌾 Care Plans, Chores & Minerals

Migration 022 adds the following:

- **Care plans** (`care_plans`): feeding, watering and special instructions for a **group**, **pasture** or **herd**.
  - Each plan has times of day, optional weekdays, an optional yearly season (`MM-DD` to `MM-DD`, which may run over New Year), and can be paused.
  - Group plans follow the group as it moves between pastures. Pasture plans stay with the pasture.
  - Owners and managers write plans; everyone can read them. Existing `feed_schedules` were copied in.
- **Chores** (`chore_completions`): each feeding or watering time becomes a chore for the day (see `src/lib/chores.ts`, unit-tested in `tests/chores.test.ts`).
  - Anyone on the farm ticks a chore off, with an optional note.
  - The person who ticked it, or a manager, can undo it.
  - One check-off per plan, day and time.
- **Minerals** (`mineral_refills`): which loose mineral went into which pasture, how much, when, and who did it.
  - Minerals are `feed_types` with category `mineral`.
  - An optional `check_every_days` flags pastures that are due.
  - Deleting a refill follows the normal approval rules.

- **Restock list** (`restock_requests`, migration 023): anyone flags an item as low or out (optionally linked to a feed type or mineral), marks it ordered, or marks it restocked.
  - Each step is stamped with who and when by a trigger, and the stamps can't be edited from the app.
  - Only owners and managers can delete finished entries.

All of these are farm-scoped and recorded in the change history.

## 🩺 Animal Health, Notifications & Offline

Migrations 024–029 add the following.

**Health**

- **Medicine cabinet** (`medicines`, `medicine_lots`): default doses, withdrawal periods, lots with expiry dates and amounts left. Health records can link the lot that was used.
- **Treatment courses** (`treatment_courses`, `course_doses`): every scheduled dose is ticked off or skipped, stamped with who and when.
  - Starting a course writes one health record, dated the course's last day, so the existing withdrawal tracking covers the whole course.
  - Stopping early moves that record to the last dose actually given.
- **Herd health schedule** (`health_protocols`): rules that repeat at an interval, at set ages, or once a year. Which animals are due is worked out in `src/lib/healthSchedule.ts` (unit tested). Recording a rule writes health records with `protocol_id`.
- **Watch list / sick pen**: `animals.care_status` (stamped who and when).
- **Concerns** (`concern_reports`): anyone reports a problem; owners and managers acknowledge and resolve it.
- **Lab tests** (`lab_tests`), and **death records** on the animal itself.

**Farm**

- **Money is owner/manager only.**
- **Emergency page**: contacts, address, and where medicine and supplies are kept.

**Notifications (migration 029)**

- **In-app**: the bell and the Notifications page work with no setup.
- **Time-based alerts** (late doses, late chores, overdue assignments) are created every 10 minutes by `generate_due_notifications()` via `pg_cron`. Turn it on in Supabase → Database → Extensions, then re-run the scheduling block at the end of migration 029.
- **Phone and browser push**: set these in the hosting environment, then redeploy.
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PUBLIC_KEY` (same value), and `VAPID_PRIVATE_KEY`. Generate them with `npx web-push generate-vapid-keys`.
  - `VAPID_SUBJECT`, e.g. `mailto:you@yourfarm.com`.
  - `SUPABASE_SERVICE_ROLE_KEY`. Server only, never `NEXT_PUBLIC_`.
  - `CRON_SECRET`, any long random string.
- **Scheduled push**: to also push the time-based alerts (not just ones triggered by someone's action), call `GET /api/notifications/dispatch` with `Authorization: Bearer <CRON_SECRET>` every 10 minutes. Use Vercel Cron on a plan that allows it, or Supabase `pg_cron` + `pg_net`.
- **iPhone**: notifications need GoatWise added to the home screen first (Share → Add to Home Screen).

**Poor signal (offline)**

- The service worker (`public/sw.js`) keeps the app's pages, so it opens with no connection.
- The last loaded data is kept on the device for 3 days, and cleared on sign-out.
- Ticking chores and doses, flagging restock items, logging minerals and reporting concerns (without a photo) are saved on the device and sent when the connection returns (`src/lib/offline.ts`, unit tested). Each row carries its own id, so retries never duplicate.

## 📊 Features

### Dashboard
- Overview stats (total animals, milk production, upcoming kiddings)
- Alert banner for follow-ups and withdrawals
- Quick action buttons

### Herd Management
- View all animals with filtering
- Add/edit/delete animals
- Animal detail pages

### Milk Production
- Record daily milking sessions
- 7-day production chart
- Top producers leaderboard
- Track discarded milk

### Health Records
- Log vaccinations, dewormings, treatments
- FAMACHA and body condition scoring
- Follow-up reminders
- Withdrawal period tracking

### Breeding
- Record breeding events
- Pregnancy tracking with due dates
- Kidding records

## 🚢 Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/goatwise-web)

1. Connect your GitHub repository
2. Add environment variables in Vercel dashboard
3. Deploy!

### Manual Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🔄 Data Sync

The web dashboard connects to the same Supabase backend as the mobile app:

- Changes made on web appear on mobile (and vice versa)
- Real-time updates via Supabase subscriptions
- Row Level Security ensures data isolation

## 📱 Mobile Companion

For offline-capable mobile access, use the [GoatWise Mobile App](../goatwise-mobile):

- Works offline with local database
- Syncs with Supabase when online
- Same account, same data

## 🧪 Development

```bash
# Run development server
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Run tests
npm test
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

---

**Part of the GoatWise Farm Management Suite** 🐐
