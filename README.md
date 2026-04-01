# takeYourInterview.ai

React + Vite frontend for AI interview setup, live voice simulation, scoring report, credits, coupons, and payments.

## Tech Stack

- Core: `React 19`, `Vite 7`
- Styling: `Tailwind CSS 4`, custom CSS
- State: `Redux Toolkit`, `react-redux`
- Routing: `react-router-dom`
- Forms/Validation: `formik`, `zod`
- API Client: `axios`
- Auth UI Provider: `Firebase Auth` (Google popup)
- Motion/UI: `motion`, `react-icons`, `@heroicons/react`
- Data Visualization: `recharts`, `react-circular-progressbar`
- Report Export: `jspdf`, `jspdf-autotable`
- Payment Checkout: `Razorpay JS SDK` (script in `index.html`)

## Folder Structure

```text
client/
├─ public/
├─ src/
│  ├─ assets/
│  ├─ components/
│  ├─ pages/
│  ├─ redux/
│  ├─ utils/
│  ├─ App.jsx
│  └─ main.jsx
├─ index.html
├─ vite.config.js
├─ vercel.json
└─ package.json
```

## Scripts

- `npm run dev` - start Vite dev server
- `npm run build` - production build

## Environment Variables

Create `client/.env`:

```env
VITE_FIREBASE_APIKEY=<firebase-web-api-key>
VITE_RAZORPAY_KEY_ID=<razorpay-publishable-key>
```

Used by:

- `src/utils/firebase.js` -> `VITE_FIREBASE_APIKEY`
- `src/pages/Pricing.jsx` -> `VITE_RAZORPAY_KEY_ID`

## Frontend Routing

Defined in `src/App.jsx`:

- `/` -> Home
- `/auth` -> Auth page
- `/interview` -> 3-step interview flow
- `/history` -> Interview history list
- `/pricing` -> Credits plans + coupon + payment
- `/add-coupon` -> Admin coupon creation
- `/report/:id` -> Persisted report view

## State Management

Redux store (`src/redux/store.js`) includes:

- `user` slice:
  - `userData` for logged-in user
  - set through `setUserData(...)`
- `theme` slice:
  - `darkmode` persisted in `localStorage`
  - toggled from Navbar

On app load, `App.jsx` calls `GET /api/user/current-user` and hydrates `userData`.

## API Integration (Frontend Side)

All calls use relative `/api/*` paths.

### Auth/User Calls

- `POST /api/user` -> signup
- `POST /api/auth/login` -> login
- `POST /api/auth/google` -> Google auth after Firebase popup
- `GET /api/auth/logout` -> logout
- `GET /api/user/current-user` -> session bootstrap

### Interview Calls

- `POST /api/interview/resume` -> resume analysis (`multipart/form-data`)
- `POST /api/interview/generate-questions` -> create interview session
- `POST /api/interview/submit-answer` -> submit answer + get feedback
- `POST /api/interview/finish` -> finalize report
- `GET /api/interview/get-interview` -> history list
- `GET /api/interview/report/:id` -> load full report

### Coupon/Payment Calls

- `GET /api/coupon` -> list active coupons
- `POST /api/coupon` -> create coupon (admin)
- `POST /api/coupon/verify` -> redeem coupon
- `POST /api/payment/order` -> create Razorpay order
- `POST /api/payment/verify` -> verify payment and update credits

## Interview UX Architecture

### Step 1: Setup (`Step1SetUp`)

- Collects:
  - `role`
  - `experience`
  - `mode` (`Technical` or `HR`)
- Optional resume upload (`PDF`)
- Resume analysis auto-fills role/experience/projects/skills
- Starts full-screen mode before interview starts

### Step 2: Live Interview (`Step2Interview`)

- Plays AI interviewer avatar (`male/female` video based on selected system voice)
- Uses browser Speech Synthesis for AI speech
- Uses Web Speech Recognition for live transcript capture
- Timer per question from backend `timeLimit`
- Auto-submit when timer reaches 0
- Submits answer and reads AI feedback aloud

### Step 3: Report (`Step3Report`)

- Shows:
  - final score
  - confidence/communication/correctness
  - trend chart (question-wise scores)
  - per-question feedback
- Exportable PDF report using `jsPDF` + `autoTable`

## Authentication Flow (Client Perspective)

1. User logs in via:
   - Google popup (`Firebase`) or
   - email/password form
2. Backend sets `token` cookie
3. Protected backend calls include `{ withCredentials: true }`
4. Navbar and route actions react to `userData` state
5. Admin-only UI:
   - `Add Coupon` page (role check in frontend)

## Credits and Payments (Client Perspective)

Pricing page defines three plans:

- `Free`: `100` credits
- `Starter Pack`: `₹100`, `150` credits
- `Pro Pack`: `₹500`, `650` credits

Flow:

1. Create order via backend
2. Open Razorpay checkout using `window.Razorpay`
3. Send Razorpay response to backend verify endpoint
4. Update Redux user credits from verify response

Coupon popup also supports:

- viewing active coupons (`GET /api/coupon`)
- applying a code (`POST /api/coupon/verify`)

## Networking and Deployment Behavior

### Dev Proxy (`vite.config.js`)

`/api` requests are proxied to:

- `http://takeyourinterview-ags-1-682670051.ap-south-1.elb.amazonaws.com`

### Vercel (`vercel.json`)

`/api/:path*` rewrites to:

- `http://takeyourinterview-ags-1-682670051.ap-south-1.elb.amazonaws.com/api/:path*`

### Razorpay Script

`index.html` loads:

- `https://checkout.razorpay.com/v1/checkout.js`

## Local Run

1. Install deps:
   - `npm install`
2. Configure `.env`
3. Start:
   - `npm run dev`
4. App runs by default at:
   - `http://localhost:5173`

## Notes

- This frontend assumes backend cookie-based auth and CORS credentials support.
- Many API calls already include `{ withCredentials: true }` for authenticated endpoints.
- Interview voice features depend on browser support for:
  - `SpeechSynthesis`
  - `SpeechRecognition` / `webkitSpeechRecognition`
