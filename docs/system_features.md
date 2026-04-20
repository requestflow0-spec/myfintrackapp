# FinTrack Pro: Implemented System Features & Architecture

This document provides an extended overview of everything that has been implemented in the FinTrack Pro application, including its core functionalities, application structure, data modeling, and underlying technology stack.

## 1. Core Financial Features

### 1.1 Multi-Profile Management
- **Seamless Switching:** Users can own and manage multiple financial profiles within a single authenticated account.
- **Profile Context:** Integrated via React Context (`ProfileContext.tsx`), ensuring that all data fetched and displayed targets the currently active profile.
- **Customizable Properties:** Profiles persist the user's preferred currency globally and maintain a list of custom, user-defined expense categories.

### 1.2 Income Management
- **Detailed Origin Logging:** Tracks income entries with robust granular specifics: source (e.g., job, business), client details, date received, and descriptions.
- **Add / Edit / Delete:** Built-in modal components within `src/app/(app)/income` for adding and maintaining active and historical income streams.

### 1.3 Expense Tracking
- **Expense Categorization:** Detailed tracking of outgoing finances categorized by custom or system-default tags.
- **Metadata Support:** Tracks amount, item/service details, transaction date, and the frequency of the expense (daily, monthly, annually).
- **Custom Categories:** Ability to generate and store personalized expense categories per profile which dynamically sync across form inputs.

### 1.4 Savings & Goal Management
- **Account Aggregation:** Users log individual savings platforms or accounts.
- **Goal Visualization:** Each savings account tracks its `currentAmount` against a targeted `goalAmount`, allowing users to monitor their progression toward investment or emergency fund goals.

### 1.5 Debt Tracking
- **Lifecycle Management:** Dedicated debt logging records the `initialAmount`, `currentBalance`, `interestRate`, `minimumPayment`, and `dueDate`.
- **Progress Tracking:** Tracks how much of a debt is remaining versus what was originally borrowed, helping to visualize payoff trajectories.

### 1.6 Global Transaction Ledger
- **Master Ledger:** A transactional layer that sits on top of specific assets (Income/Expenses). Tracks all exact transactional movements.
- **Transaction Specifiers:** Records amounts, payment modes, recipients/senders, categorization, and related internal references (e.g., linked IncomeId or ExpenseId).

### 1.7 Reporting & Dashboards
- **Visual Dashboards:** An interactive home dashboard rendering total balance summaries, recent transactions, and categorical breakdowns.
- **Chart Implementations:** Utilizes `recharts` to render visual data (Income vs. Expense over time, Profit/Loss calculation).

## 2. Technical Stack and Architecture

### 2.1 Framework & Core Tools
- **Next.js 15:** Utilizing the modern App Router (`src/app`) for structurally sound dynamic routing and API handling.
- **React 19:** Utilizing edge React features for concurrent rendering and hook-based functional components.
- **TypeScript:** Fully typed codebase enforcing strict object models (as seen in `src/lib/types.ts`) ensuring error-free standard operations.

### 2.2 Database and Backend Services
- **Firebase / Firestore:** NoSQL cloud db used to structure collections by Profile IDs.
- **Client Hooks Wrapper:** Custom abstractions for robust real-time synchronization (`use-collection.tsx`, `use-doc.tsx`) implementing seamless listener attachments to Firestore.
- **Authentication Wrapper:** `FirebaseErrorListener` and non-blocking robust update contexts for state durability.

### 2.3 User Interface & Design System
- **Tailwind CSS:** Comprehensive utility-first atomic CSS for responsive web layouts.
- **Shadcn/UI & Radix Primitives:** Accessible, robust, and unstyled semantic components (Dialogs, Accords, Dropdowns, Date Pickers etc.) that shape the UI.
- **Styling:** Adheres to the established blueprint of a deep sky blue / light grayish-blue corporate, professional interface with robust Dark/Light mode context capabilities via `next-themes`.

### 2.4 Generative AI Integration
- **GenKit AI:** Native internal scaffolding (`@genkit-ai/google-genai`) prepared to harness LLM models natively within the Next.js process block for financial insights.

## 3. Data Schema Configuration (`src/lib/types.ts`)
The application defines six foundational data entities connected relationally via a `profileId`:
1. `UserProfile`
2. `Income` 
3. `Expense`
4. `SavingsAccount`
5. `Debt`
6. `Transaction`

Each operates independently but converges on the central dashboard/reports mechanism to present an accurate financial snapshot per `profileId`.
