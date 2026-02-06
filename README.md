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
