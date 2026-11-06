# Drip — Requirements & Build Plan

> Built for the **Code with Claude: Women in AI Hackathon**.

## 1. Overview

### Goal
Drip is a mobile-first progressive web app that connects women for **coffee chats**. Each member builds a profile that shows her experience (pulled from her resume with Claude) and the topics she wants help with. Drip then suggests the best people to meet. Each chat that actually happens becomes a **"ripple"**: a connection that shows up on both members' profiles and can be celebrated with photos and "cheers."

### Core loop
1. **Sign up** in a 5-step onboarding: basics → resume and experience tags → interests → personality and meeting preferences → account created.
2. **Discover** people in a ranked Feed, swipe right, and send a short personal request with your availability.
3. **Respond:** the recipient can Accept (picking date, time and place, plus an Add to Google Calendar link), choose Not Now, or Decline.
4. **Meet**, then confirm the chat happened. You can post a photo and kind words, which go to your Posts tab and to your ripple partner's Ripple tab.
5. **Celebrate:** others can "cheers" a post. Only the post's author sees the cheers count, and she gets a message for each one.

### In scope (hackathon demo)
- Mocked auth. No real sign-in or password checks; the password is only stored.
- A real Claude API call to analyze the resume.
- 20 seeded demo users, so the Feed has 20 cards.
- A **profile switcher** (dev/demo control) so one browser can act as Person 1, then Person 2, then Person 1 again.
- Add to Google Calendar through a pre-filled calendar link (no OAuth needed).
- An installable PWA whose app shell works offline after the first load.

### Out of scope
- Real authentication, email verification and password security.
- Real-time push notifications and live chat threads. Messages are system messages and request/response items.
- Production hosting, content moderation, and real identity or age checks.
- Two-way Google Calendar sync.

### Tech stack
| Concern | Choice |
|---|---|
| Language | TypeScript (strict) |
| UI | React + MUI |
| Build | Vite (+ `vite-plugin-pwa`) |
| State | Zustand |
| Routing | React Router |
| Database | SQLite (macOS built-in, `sqlite3` 3.43.2, already installed) |
| API server | Node + Express (or Fastify) + `better-sqlite3` |
| AI | Anthropic API (`@anthropic-ai/sdk`), called **only from the server** |
| Resume parsing | PDF sent to Claude as a document; DOCX converted to text with `mammoth`; TXT read directly |

### Architecture decisions
- **Where SQLite lives:** a browser can't open a SQLite file on the Mac directly. A small local Node server in the same repo (`/server`) owns the `drip.db` file and serves a REST API to the React app (`/web`).
- **Where the Claude API key lives:** the key goes in `server/.env` as `ANTHROPIC_API_KEY` and never reaches the browser. The server calls Claude and returns structured JSON.
- **What works offline:** the service worker precaches the app shell, and recent API reads (profile, feed, messages) are cached with a network-first strategy. Resume analysis and sending requests need a network connection, and the UI shows an offline notice when one is missing.
- **Photos and resumes:** uploaded files are stored on disk under `server/uploads/`, and their paths are stored in SQLite.

### Proposed repo layout
```
Drip/
  requirements.md
  server/          # Express + better-sqlite3 + Anthropic SDK
    src/
    db/schema.sql
    db/seed.ts
    uploads/
    .env           # ANTHROPIC_API_KEY (git-ignored)
  web/             # Vite + React + MUI + Zustand + React Router + PWA
    src/
```

### Data model (initial)
- **users**: id, first_name, last_name, email, password (plain text, mock only), zip, birth_year, photo_path, race_culture (free text, optional), is_18_plus, identifies_as_woman, career_stage (`Student | Early career | Mid-career | Senior | Executive | Founder`), resume_path, resume_text, summary, hobbies, best_advice, woman_admired, ask_me_about, meeting_pref (`in_person | zoom | either`), chats_per_month, created_at
- **experience_tags**: user_id, tag
- **interest_tags**: user_id, tag, rank (1–5; rank 1 is the strongest preference)
- **chat_requests**: id, from_user_id, to_user_id, message (≤100 characters), availability (JSON), status (`pending | accepted | not_now | declined | completed | did_not_happen`), rematch_after, created_at
- **meetings**: id, request_id, datetime, location, confirmed_by_from, confirmed_by_to, notes
- **ripples**: user_a_id, user_b_id, meeting_id, created_at (the ripple count is the number of rows that include the user)
- **posts**: id, author_id, ripple_partner_id, meeting_id, photo_path, caption, created_at
- **cheers**: post_id, user_id, created_at (unique per post and user)
- **messages**: id, to_user_id, from_user_id (null for messages from Drip), type (`chat_request | accepted | not_now | declined | cheers | post_meeting_prompt | system`), ref_id, body, read_at, created_at
- **swipes**: user_id, target_user_id, direction (`right | left`), created_at (hides cards already acted on)
- **zip_locations**: zip, lat, lng, city, state (loaded from a public ZIP→lat/long dataset, such as the US Census ZCTA Gazetteer file, for distance calculations)

---

## 2. Build Steps

Build the steps in order. Each step has to pass its **Done when** checks before the next one starts.

---

### Step 0 — Workspace & tooling
**Delivers**
- `web/`, created with Vite's React + TypeScript template, with MUI, Zustand, React Router and `vite-plugin-pwa` installed.
- `server/`, a TypeScript Express app with `better-sqlite3`, `dotenv`, `multer` (uploads), `@anthropic-ai/sdk` and `mammoth`.
- A root script (for example, `npm run dev` using `concurrently`) that starts both. Vite proxies `/api` to the server.
- `.gitignore` (covering `node_modules`, `.env`, `*.db`, `uploads/`) and `git init`.
- `server/.env.example` containing `ANTHROPIC_API_KEY=`.

**Depends on:** nothing.

**Done when**
- `npm run dev` starts both processes without errors.
- The browser shows the React page, and `GET /api/health` returns `{ ok: true }`.
- `npx tsc --noEmit` passes in both packages.

---

### Step 1 — Database schema & seed data
**Delivers**
- `server/db/schema.sql` covering every table in the data model above. It is applied automatically at server start.
- `server/db/seed.ts`, which creates 20 diverse demo users (different ZIP codes near and far, every career stage, a variety of experience and interest tags, filled-in personality fields, and placeholder avatars), plus a few existing ripples and posts so the Ripple tab has content.
- A ZIP→lat/long dataset (for example, the US Census ZCTA Gazetteer file, committed as a CSV under `server/db/`) loaded into `zip_locations`.
- `npm run db:reset` drops, recreates and reseeds the database.

**Depends on:** Step 0.

**Done when**
- `sqlite3 server/drip.db ".tables"` lists every table.
- `sqlite3 server/drip.db "select count(*) from users"` returns 20.
- Every seeded user's ZIP has a row in `zip_locations`.
- `npm run db:reset` can be run twice in a row and produces the same result.

---

### Step 2 — App shell, navigation, theme & mock session
**Delivers**
- An MUI theme with Drip's colors and typography, and a mobile-first layout.
- React Router routes: `/signup/1`–`/signup/5`, `/feed`, `/ripple`, `/messages`, `/profile`, `/profile/:id`.
- A **bottom navigation**, left to right: **Feed, Ripple, Messages, Profile**. It is hidden during sign-up.
- A Zustand `session` store holding `currentUserId`, persisted to localStorage.
- A **demo profile switcher** (a small menu in the app bar) that lists users and changes `currentUserId`.
- A typed API client (`web/src/api.ts`).

**Depends on:** Steps 0–1.

**Done when**
- All four bottom tabs navigate correctly, and a page refresh keeps you on the same tab.
- Switching profiles changes the name shown in the header and survives a refresh.
- Unknown routes show a "not found" page.

---

### Step 3 — Sign-up Step 1: Basic info
**Delivers**
- A form with these fields: First name, Last name, Email, Password (stored only), ZIP code (5 digits), Birth year (dropdown), Profile picture (upload with preview), Race/Culture (optional free text, such as "Indian" or "Nigerian American"), a checkbox for **I am 18 years or older**, and a checkbox for **I identify as a woman**.
- Validation: all fields except Race/Culture are required, the email must be well-formed, the ZIP must be 5 digits, the birth year must agree with 18+, and **both checkboxes must be checked** before **Next** is enabled.
- The draft lives in a Zustand `onboarding` store, so going back and forth never loses input.
- A stepper (1 of 5) at the top of the page.

**Depends on:** Step 2.

**Done when**
- **Next** stays disabled until every field is valid and both checkboxes are checked.
- The photo preview appears right after you pick a file.
- Going to Step 2 and back keeps every value.

---

### Step 4 — Sign-up Step 2: Resume upload & Claude analysis
**Delivers**
- An upload button that accepts `.pdf`, `.doc`, `.docx` and `.txt` files up to 5 MB. Anything else is rejected with a clear message.
- `POST /api/resume/analyze` (multipart). The server extracts the content (PDF goes to Claude as a document block, DOCX goes through `mammoth`, TXT is read directly), calls Claude, and returns validated JSON:
  ```json
  {
    "summary": "2–4 sentence profile summary",
    "experienceTags": ["Product Management", "SQL", "Fundraising"],
    "careerStage": "Mid-career",
    "resumeText": "plain-text copy for the Resume tab"
  }
  ```
  `careerStage` must be one of: Student, Early career, Mid-career, Senior, Executive, Founder. Use `claude-opus-5-5` for this call. Use structured output or tool use to enforce the shape, and validate it on the server (for example, with zod).
- A loading state while the analysis runs, and an error state with a **Retry** button.
- A review screen with:
  - An editable **summary**.
  - **Experience tags** shown as MUI Chips that can be deleted and edited, plus an "Add tag" input.
  - A clear banner: *"These tags describe your **current experience**: what you can offer others. Next, you'll choose what you want to **learn or get help with**."*
  - The **career stage** as a pre-selected dropdown that the user can change.

**Depends on:** Step 3, and the user's Anthropic API key in `server/.env`.

**Done when**
- Uploading a sample PDF, a DOCX and a TXT resume each produces a summary, at least 3 tags and a career stage.
- A `.png` upload is rejected in the UI before any request is sent.
- Tags can be added, deleted and edited, and the changes survive Back/Next.
- The API key never appears in the browser's network traffic or JS bundle (check with DevTools search).
- If the key is removed, the UI shows a friendly error instead of crashing.

---

### Step 5 — Sign-up Step 3: Interests (what you want help with)
**Delivers**
- Up to **5 interest tags**, shown as chips. Suggestions are generated from the user's experience tags and career stage, either through a small Claude call (`claude-sonnet-5-5` or `claude-haiku-5-5`) or a static list, with the static list as the fallback. The user can also add her own.
- Selected interests can be **reordered** (drag, or up/down buttons). The order is stored as `rank`, which feeds the matching in Step 9.
- Copy that sets this apart from Step 2: *"What do you want to explore or get help with?"*

**Depends on:** Step 4.

**Done when**
- A 6th interest can't be added, and a helper message explains the limit.
- Custom interests can be added, and suggestions can be picked with one tap.
- After reordering, the order is still the same when you go Back and Next again.

---

### Step 6 — Sign-up Step 4: Personality & meeting preferences
**Delivers**
- Text fields:
  - *What are some of your hobbies/interests?*
  - *What is the best piece of advice you have given or received?*
  - *A woman you look up to*
  - *Ask me about…*
- Meeting preference: **In person / Zoom / Either**.
- Chats per month: a number input or slider (for example, 1–8), with helper text: *"You can change this any time."*

**Depends on:** Step 5.

**Done when**
- All fields save to the onboarding store and survive navigation.
- The chats-per-month value is limited to its allowed range.

---

### Step 7 — Sign-up Step 5: Create account & Profile page
**Delivers**
- A review of everything entered, then a **Create account** button that calls `POST /api/users`. It writes the user, tags, photo and resume to SQLite and to disk, sets `currentUserId`, and goes to `/profile`.
- The **Profile page**:
  - The photo and name, with a **ripple count** next to them (number of completed coffee chats).
  - The bio underneath: summary, career stage, experience tags, interest tags, and all the Step 4 answers.
  - Two tabs: **Resume** (the resume text, formatted) and **Posts** (this user's post-chat posts, with an empty state).
  - An edit option for chats per month (it is promised as changeable).

**Depends on:** Steps 3–6.

**Done when**
- After you create an account, refreshing the page still shows the profile, because it is loaded from SQLite.
- `sqlite3 server/drip.db "select first_name, career_stage from users order by id desc limit 1"` shows the new user.
- The ripple count shows 0 for a new user and the correct number for seeded users who have ripples.
- The new user appears in the profile switcher.

---

### Step 8 — Feed: cards & swipe
**Delivers**
- `/feed` shows up to **20 cards**, one after another in a **vertical scroll**, with swipe gestures on each card. Each card shows the person's photo, name, career stage, Race/Culture (if she filled it in, so members can find women who share their background), distance in miles, top experience tags and interests, and one fun fact from Step 4.
- **Swipe right** (or a ♥ / "Coffee?" button for desktop) opens the request flow from Step 10. **Swipe left** or **Pass** means "pass" and hides the card.
- Cards the user has swiped on, or has an open request with, are left out of the feed.
- The current user never appears in her own feed.

**Depends on:** Steps 1, 2 and 7. Ranking comes in Step 9; until then the order is arbitrary.

**Done when**
- A new user sees 20 cards.
- Swiping works with touch (Chrome DevTools device mode) and with a mouse or button.
- After a pass, refreshing the page does not bring that card back.

---

### Step 9 — Matching & ranking
**Delivers**
- `GET /api/feed?userId=` returns candidates sorted by a score, with the parts of the score included for debugging. The score combines, in order of weight:
  1. **ZIP proximity**: the distance in miles between the two ZIPs, computed with the haversine formula from `zip_locations`. Closer is better, with the score decaying as distance grows. If a ZIP is missing from the dataset, fall back to the 3-digit prefix, then the state.
  2. **Experience match**: the candidate's *experience* tags overlap with the user's *interest* tags, weighted by interest rank (rank 1 counts most).
  3. **Shared interests and experience**: overlap between the two users' tags.
- Matching ignores case and handles simple synonyms (for example, "PM" and "Product Management") through a normalization map.
- The scoring function is a pure function with unit tests (Vitest).

**Depends on:** Step 8.

**Done when**
- Unit tests pass for these cases: same ZIP beats a far ZIP when the tags are equal; a ZIP 5 miles away beats one 200 miles away; a rank-1 interest match beats a rank-5 match; no overlap gives the lowest score.
- With the seed data, the first card shown to a new user can be explained by the debug score breakdown.

---

### Step 10 — Coffee-chat request (side-by-side screen)
**Delivers**
- Swiping right opens a two-panel view: side by side on desktop or tablet, stacked or tabbed on narrow phones.
  - **Left panel:** (1) common interests and experiences; (2) the projects or experiences this person has that relate to what *you* want to explore. This panel is generated by a **live Claude call** (`claude-sonnet-5-5` for speed) each time the screen opens, using both profiles and the candidate's resume text. It is personalized to the viewer: the same person can be pitched differently to different members. For example, Person A's restorative justice work may be what stands out for one viewer, while her biotechnology experience is what stands out for another. A rule-based fallback shows tag overlap if the call fails.
  - **Right panel:** a message box with a **100-character limit** and a live counter, plus a picker for **general availability** (days of the week × time blocks such as Morning, Lunch, Afternoon, Evening).
- **Send** creates a `chat_requests` row (status `pending`) and a `messages` row for the recipient, then removes the card from the feed.

**Depends on:** Steps 8–9.

**Done when**
- Character 101 can't be typed, and the counter shows `100/100`.
- Opening the same candidate as two different users produces different left-panel highlights that match each viewer's interests.
- **Send** is disabled until there is a message and at least one availability slot.
- After **Send**, the card is gone from the feed, even after a refresh.
- Switching to the recipient shows the request in her Messages tab (completed in Step 11).

---

### Step 11 — Messages: respond to a request
**Delivers**
- `/messages` lists the user's messages, newest first, with unread markers. The list includes requests, acceptances, declines, cheers notifications and prompts from Drip.
- Opening a chat request shows the sender's message, her availability and a link to her profile, plus three actions:
  - **Accept:** a form for the exact **date, time and location** (or a Zoom link if the meeting preference is Zoom). Confirming creates a `meetings` row, sends an "accepted" message with the details to the requester, and shows an **Add to Google Calendar** button.
  - **Not now:** sets the status to `not_now` and `rematch_after` to now + 30 days, and sends the requester a polite `not_now` message, for example: *"Priya is busy right now, so she can't meet this month. Drip will circle back in a month."* The person can come back into the recipient's feed after that date.
  - **Decline:** sets the status to `declined` and sends the requester a polite, pre-written decline message.
- **Add to Google Calendar** opens `https://calendar.google.com/calendar/render?action=TEMPLATE&text=…&dates=…&details=…&location=…` in a new tab.

**Depends on:** Step 10.

**Done when**
- Each of the three actions updates `chat_requests.status` as expected (check with `sqlite3`).
- Accepting with no date, time or location is blocked.
- The calendar link opens Google Calendar with the correct title, time and location already filled in.
- **Not now:** the requester gets the polite "busy" message, the person stays out of the feed, and moving `rematch_after` into the past brings them back.

---

### Step 12 — Requester's view of the response
**Delivers**
- When you switch back to Person 1, her Messages tab shows that Person 2 **accepted**, with the date, time and location and her own **Add to Google Calendar** button. If Person 2 chose Not now, Person 1 sees the polite "busy, Drip will circle back in a month" message. If Person 2 declined, Person 1 sees the polite decline message.

**Depends on:** Step 11.

**Done when**
- The demo path works end to end: Person 1 sends → switch → Person 2 accepts → switch → Person 1 sees the acceptance and a working calendar button.
- The Not now and decline paths also show the correct messages.

---

### Step 13 — Post-meeting workflow
**Delivers**
- After a meeting's start time passes, both users get a **Drip** message. The message is created on read when the meeting time is in the past. A demo button, **Simulate meeting passed**, creates it right away.
- The prompt flow:
  - **Mandatory:** *"Did your coffee chat happen?"* **Yes** or **No**. **No** requires a short explanation, and the request is marked `did_not_happen`.
  - **Yes** marks the meeting complete and creates a **ripple** between the two users, which increases both ripple counts.
  - **Optional (after Yes):** attach a photo and add kind words, then **Post**. The post appears in the author's **Posts** tab and in the ripple partner's **Ripple** tab.

**Depends on:** Steps 11–12.

**Done when**
- **Yes** without a post creates a ripple, and both users' ripple counts go up by 1.
- **No** cannot be submitted with an empty explanation.
- **Yes** with a photo and caption shows the post on the author's Posts tab and in the partner's Ripple feed.
- Answering the prompt twice does not create a duplicate ripple.

---

### Step 14 — Ripple tab & Cheers
**Delivers**
- `/ripple` shows posts (photo, caption, author, date) from the user's ripple connections, including posts about their coffee chats with *other* people, plus any post that tags the user as the ripple partner. Newest posts come first.
- The **Posts** tab on a Profile shows only the posts that user wrote herself.
- A **Cheers 🥂** button on each post. Tapping it toggles the cheers, and a user can cheer a post only once.
- **Privacy:** the cheers total is shown **only to the post's author**, for example on her own Posts tab. Other users see only whether they have cheered the post themselves.
- Each cheers sends the author a message: *"Maya cheered your post 🥂"*.

**Depends on:** Step 13 (and the seeded posts from Step 1).

**Done when**
- As a non-author, no count is visible anywhere, including in the API response (check the network tab).
- As the author, the correct count shows, and a cheers message appears in Messages.
- Tapping Cheers twice does not double-count.

---

### Step 15 — PWA & offline
**Delivers**
- A `vite-plugin-pwa` manifest (name "Drip", icons, theme color, `display: standalone`).
- A service worker that precaches the app shell and uses network-first caching for `GET /api/*` and cache-first caching for images.
- An offline banner. Actions that need a network (upload, send, accept) are disabled with an explanation when offline.

**Depends on:** all earlier steps (this step can be done earlier, but verifying it last is simplest).

**Done when**
- Lighthouse reports the app as installable, and Chrome shows **Install Drip**.
- After one online visit, switching DevTools to **Offline** and reloading still loads the app and the recently viewed profile, feed and messages.
- Running a production build (`npm run build && npm run preview`) passes the same checks.

---

### Step 16 — Demo polish & script
**Delivers**
- Loading skeletons, empty states, error toasts and accessibility basics (labels, focus order, color contrast).
- A **Reset demo** action (calls `db:reset`).
- `DEMO.md`, a click-by-click demo script:
  1. Sign up as a new user with a real resume.
  2. Scroll the feed, swipe right on a top match, write a message and send it.
  3. Switch to Person 2, cheers a post in Ripple, open Messages, and accept with a date, time and place, adding it to Google Calendar.
  4. Switch to Person 1, see the acceptance, and add it to her calendar.
  5. Simulate the meeting passing, confirm Yes, and post a photo. Show the ripple count going up and the post on both tabs.

**Depends on:** Steps 0–15.

**Done when**
- The whole demo script runs from a fresh `db:reset` in under 5 minutes with no console errors.

---

## 3. Decisions (confirmed)
1. **Swipe left** means "pass" and hides the card.
2. **Feed layout** is a vertical scroll of cards, with swipe gestures on each card.
3. **Race/Culture** is optional free text. It shows on the profile and on feed cards so members can find women who share their background. It is not used for matching.
4. **Ripple tab** shows posts by your ripple connections plus posts that tag you as the partner. The Profile **Posts** tab shows only your own posts.
5. **Claude models:** `claude-opus-5-5` for resume analysis; `claude-sonnet-5-5` (or `claude-haiku-5-5`) for interest suggestions and the match panel.
6. **"18+" and "identify as a woman"** are a self-reported pledge, with no verification.
7. **ZIP proximity** uses a ZIP→lat/long dataset and real distance in miles.
8. **The match panel** ("projects of interest") calls Claude live for each viewer–candidate pair, so it is personalized to the viewer.
9. **Not now** politely tells the requester that the person is busy and that Drip will circle back in a month.
10. **API key** lives in `server/.env` as `ANTHROPIC_API_KEY` and is never committed.
11. **Demo ZIP** is 94720 (UC Berkeley). Seed users are spread from the same ZIP out to across the US so distance ranking is visible.
12. **Seed avatars** are illustrated (DiceBear "Personas", CC BY 4.0), generated locally at seed time. Seed resumes are plain text in `server/db/seed-data.json`; no Claude calls happen during seeding.
