# Tuck Shop POS - Premium Desktop UI Design Specification

## 1. Project Overview

**Project Name:** Tuck Shop POS
**Type:** Desktop Application (Electron + React)
**Core Functionality:** Professional Point of Sale system for tuck shops with billing, inventory, analytics, and customer management
**Target Users:** Tuck shop owners, cashiers, inventory managers

## 2. UI/UX Specification

### 2.1 Layout Structure

**Main Layout:**
- Fixed top navbar (height: 64px)
- Collapsible sidebar (width: 260px collapsed: 72px)
- Main content area (fluid, padding: 24px)
- Desktop-first design (minimum 1280px)

**Responsive Breakpoints:**
- Desktop XL: 1920px+
- Desktop: 1280px - 1919px
- Tablet: 768px - 1279px (limited support)

### 2.2 Visual Design

**Color Palette - Dark Mode:**
```
--bg-primary: #0F172A
--bg-secondary: #1E293B
--bg-tertiary: #334155
--accent-primary: #3B82F6
--accent-hover: #2563EB
--success: #22C55E
--warning: #F59E0B
--danger: #EF4444
--text-primary: #F8FAFC
--text-secondary: #94A3B8
--text-muted: #64748B
--border: #334155
--glass: rgba(30, 41, 59, 0.7)
```

**Color Palette - Light Mode:**
```
--bg-primary: #FFFFFF
--bg-secondary: #F8FAFC
--bg-tertiary: #F1F5F9
--accent-primary: #3B82F6
--accent-hover: #2563EB
--success: #22C55E
--warning: #F59E0B
--danger: #EF4444
--text-primary: #0F172A
--text-secondary: #475569
--text-muted: #94A3B8
--border: #E2E8F0
--glass: rgba(255, 255, 255, 0.7)
```

**Typography:**
- Primary Font: Inter (system fallback)
- Headings: Poppins
- Font Sizes:
  - h1: 32px / font-weight: 700
  - h2: 24px / font-weight: 600
  - h3: 20px / font-weight: 600
  - h4: 16px / font-weight: 600
  - body: 14px / font-weight: 400
  - small: 12px / font-weight: 400

**Spacing System:**
- Base unit: 4px
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px

**Visual Effects:**
- Glassmorphism: backdrop-blur-xl, bg-opacity-80
- Card shadows: 0 4px 6px -1px rgba(0, 0, 0, 0.1)
- Hover shadows: 0 10px 15px -3px rgba(0, 0, 0, 0.1)
- Border radius: sm: 6px, md: 12px, lg: 16px, xl: 24px

### 2.3 Components

**Sidebar:**
- Logo section with shop name
- Navigation items with icons (React Icons)
- Active state: accent background with left border
- Hover: subtle background change
- Collapsed mode: icons only with tooltips
- Bottom: user profile + logout
- Sync status indicator

**Navbar:**
- Search bar (expandable)
- Notification bell with badge
- Dark/Light mode toggle
- User avatar dropdown
- Connection status indicator
- Current date/time
- Quick action buttons

**Dashboard Cards:**
- Stat cards with icon, value, label, trend
- Glass effect background
- Animated number counting
- Hover: scale(1.02) + shadow increase

**Product Card:**
- Image placeholder (150x150)
- Product name (truncate 2 lines)
- Price (bold)
- Stock indicator (color coded)
- Add button with animation

**Cart Item:**
- Product thumbnail
- Name + variant
- Quantity controls (+/-)
- Line total
- Remove button

**Tables:**
- Striped rows
- Hover highlight
- Sortable columns
- Pagination
- Search/filter

**Charts (Recharts):**
- Line chart for sales
- Bar chart for revenue
- Pie chart for categories
- Animated on mount
- Tooltips with styling

### 2.4 Animations (Framer Motion)

**Page Transitions:**
- Fade + slide up
- Duration: 300ms
- Stagger children: 50ms

**Sidebar:**
- Collapse: width animation 300ms
- Menu items: stagger reveal

**Cards:**
- Enter: fadeInUp
- Hover: scale + shadow
- Stagger: 100ms delay

**Modals:**
- Backdrop fade
- Scale + fade content
- Exit: reverse

**Loading:**
- Skeleton pulse
- Shimmer effect

## 3. Functionality Specification

### 3.1 Pages/Screens

1. **Login** - PIN entry, glass card, animated background
2. **Dashboard** - Stats widgets, charts, recent orders
3. **POS Billing** - Product grid, cart, payment buttons
4. **Products** - List, add, edit, delete
5. **Categories** - Category management
6. **Inventory** - Stock levels, low stock alerts
7. **Orders** - Order history, details modal
8. **Customers** - CRM-style customer list
9. **Expenses** - Expense tracking
10. **Reports** - Analytics dashboards
11. **Employees** - Staff management
12. **Suppliers** - Supplier list
13. **Analytics** - Advanced charts
14. **Notifications** - Alert center
15. **Settings** - Configuration panels

### 3.2 Core Features (Frontend Only)

- Dark/Light theme toggle (persisted to localStorage)
- Sidebar collapse/expand with persistence
- Product search filtering
- Cart operations (add, remove, quantity, clear)
- Sample data for all views
- Responsive layouts
- Toast notifications
- Loading states

### 3.3 User Interactions

- Click to add product to cart
- Quantity +/- buttons
- Category tab switching
- Sidebar navigation
- Theme toggle
- Notification dismiss
- Modal open/close
- Form inputs

## 4. Acceptance Criteria

### Visual Checkpoints:
- [ ] Dark/Light mode toggles correctly
- [ ] Sidebar collapses smoothly
- [ ] Dashboard shows 6+ stat cards
- [ ] Charts render with animations
- [ ] POS screen has product grid + cart
- [ ] All hover effects work
- [ ] Loading skeletons display
- [ ] Toast notifications appear

### Functional Checkpoints:
- [ ] Navigation between all pages works
- [ ] Cart add/remove works
- [ ] Theme persists on refresh
- [ ] Responsive on 1280px+ screens
- [ ] No console errors
- [ ] Build completes without errors

### Performance:
- [ ] Initial load < 3 seconds
- [ ] Smooth 60fps animations
- [ ] No layout shifts