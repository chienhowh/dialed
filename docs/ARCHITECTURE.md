# Coffee Brewing Product — Architecture

## 1. Architecture Goals

MVP 技術架構優先考慮：

1. 快速迭代
2. Mobile-first
3. PWA-friendly
4. 沖煮 Timer 穩定
5. 核心資料模型可支援未來 Community / Personalization
6. 不為 Future Feature 過度設計
7. Codex / Claude Code 容易理解與維護

---

# 2. Technology Stack

## Frontend / Full-stack Framework

**Next.js App Router + TypeScript**

負責：

- UI
- Routing
- Server Components
- Server Actions / Route Handlers
- Public Recipe / Community pages in future
- PWA shell

Next.js 官方目前提供 Web App Manifest 與 PWA / Service Worker 的正式整合方式。

---

## Styling

**Tailwind CSS**

UI component library 可以後續選：

- shadcn/ui
- 自建 components

MVP 不先建立大型 Design System。

---

## Database

**Supabase PostgreSQL**

原因：

- Relational model 適合 Coffee / Plan / Session / Feedback 關係
- PostgreSQL 易於日後做 Community Search
- Supabase 提供 Auth、Database、RLS
- 不需要另外維護 backend infrastructure

---

## Authentication

**Supabase Auth**

MVP：

- Email + password authentication 為必要功能
- Google OAuth 為 optional，不阻擋 MVP 或 Milestone 2 完成

Auth UX 先保持簡單，不建立複雜的 onboarding 或 account-management flow。

Next.js 使用 cookie-based session。

Supabase 官方目前建議 SSR framework 使用 `@supabase/ssr`，並分開 browser/server clients。

---

## Deployment

**Vercel**

主要：

```text
Git Repository
      ↓
Vercel
      ↓
Preview / Production
```

Vercel 對 Next.js 有原生部署支援，Git push / PR 也可以建立 preview deployment。

---

# 3. High-level Architecture

```text
┌───────────────────────────────┐
│        Next.js PWA            │
│                               │
│ UI / Timer / Brew Flow        │
│ Client State                  │
│ Server Components             │
│ Server Actions                │
└───────────────┬───────────────┘
                │
                ↓
┌───────────────────────────────┐
│           Supabase            │
│                               │
│ Auth                          │
│ PostgreSQL                    │
│ Row Level Security            │
└───────────────────────────────┘
```

Recommendation Engine 第一版放在 application/domain layer。

不需要獨立 service。

---

# 4. Suggested Project Structure

```text
src/
├── app/
│   ├── (auth)/
│   ├── (app)/
│   │   ├── page.tsx
│   │   ├── coffee/
│   │   ├── history/
│   │   └── settings/
│   │
│   ├── brew/
│   └── api/
│
├── components/
│   ├── coffee/
│   ├── brew/
│   ├── feedback/
│   └── ui/
│
├── features/
│   ├── coffee/
│   ├── recommendation/
│   ├── brew-plan/
│   ├── brew-session/
│   ├── feedback/
│   └── dial-in/
│
├── domain/
│   ├── coffee/
│   ├── recipe/
│   ├── brew/
│   └── taste/
│
├── lib/
│   ├── supabase/
│   ├── storage/
│   └── utils/
│
└── types/
```

原則：

> Domain logic 不直接塞在 React Component。

例如：

```text
recommendBrewPlan()
createAdjustmentSuggestion()
calculatePlanDeviation()
```

應放在 domain / feature layer。

---

# 5. Database Model

## profiles

```text
id
display_name
created_at
```

`id` 對應 Supabase Auth user id。

---

## bean_profiles

描述咖啡特徵。

```text
id
user_id
origin_country
region
process
variety
roast_level
producer
farm
altitude
created_at
```

MVP 可以允許 user-created data。

MVP 的 `bean_profiles` 屬於建立它的使用者，`user_id` 對應 Supabase Auth user id。這避免 user-created Bean Profile 在 Community sharing boundary 建立前意外公開。

未來 Community 成熟後，再考慮 canonical bean data / deduplication。

---

## coffees

代表 My Coffee。

```text
id
user_id
bean_profile_id

roaster
product_name
roast_date
purchase_date
purchase_place
notes

status
created_at
updated_at
```

`status`：

```text
active
finished
archived
```

---

# 6. Recipe Model

## recipe_templates

```text
id
name
brewer_type
method_type

description

default_ratio
default_temperature
default_grind_level

expected_flavor

source
is_public

created_at
```

`source`：

```text
official
user
community
```

MVP 主要使用 `official`。

MVP Active Official Recipe Templates：

```text
Three Pour
4:6
One Pour
```

MVP 的 application-level Brewer 固定為 standard `v60` pour-over。`brewer_type` 保留為 Recipe Compatibility discriminator，但不建立 equipment table、user equipment profile、brewer capability 或 brewer selection flow。

這個 scalar boundary 讓未來可以加入其他 Brewer，而不需要提前建立通用器材模型。

`Immersion` 是 Future Recipe Type，不建立 MVP seed record，不出現在 selectable catalog，也不參與 MVP Recommendation Engine。未來啟用時再定義相容 Brewer 與硬體需求。

---

## recipe_steps

```text
id
recipe_template_id

step_order
step_type

start_time
duration
target_water

note
```

MVP `step_type`：

```text
pour
wait
```

Future `Immersion` Recipe Type 可以再加入：

```text
steep
release
```

---

# 7. Dial-in Model

## dial_in_threads

代表：

> 同一包 Coffee + 一個 Taste Goal 的調整流程。

```text
id
user_id
coffee_id

primary_taste_goal
secondary_taste_goal

status

created_at
updated_at
```

`status`：

```text
active
completed
abandoned
```

同一包 Coffee 可以存在多個 Dial-in Thread。

---

# 8. Brew Plan

## brew_plans

```text
id
user_id
coffee_id
dial_in_thread_id

recipe_template_id

coffee_dose
water_amount
ratio
water_temperature
grind_level

target_brew_time_min
target_brew_time_max

expected_flavor
recommendation_source
recommendation_reason

parent_plan_id
based_on_session_id

created_at
```

`recipe_template_id` 可以 nullable，以支援未來完全自訂 Plan。

---

## brew_plan_steps

```text
id
brew_plan_id

step_order
step_type

start_time
duration
target_water

note
```

建立 Brew Plan 時應複製 Template Steps。

原因：

> Recipe Template 未來修改，不應改變過去的 Brew Plan。

因此 Brew Plan 是當時 Recipe 的 snapshot。

---

# 9. Brew Session

## brew_sessions

```text
id (UUID, client-generated before brewing starts)
user_id
brew_plan_id

started_at
finished_at

actual_coffee_dose
actual_water_temperature
actual_water_amount
actual_brew_time

status
notes

created_at
```

`status`：

```text
brewing
completed
aborted
```

---

## brew_session_steps

```text
id
brew_session_id
brew_plan_step_id

actual_start_time
actual_end_time
actual_water

created_at
```

`(brew_session_id, brew_plan_step_id)` 必須有 unique constraint，讓同一個 planned step 的 offline retry 可以安全 upsert，而不會建立重複 step record。

---

# 10. Taste Feedback

## taste_feedback

```text
id
user_id
brew_session_id

overall_rating

too_sour
too_bitter
too_weak
too_strong
astringent
pretty_good

sweetness
acidity
body
clarity
juiciness
complexity

flavor_tags text[]

notes

created_at
```

數值感官資料 MVP 可以使用：

```text
1–5
```

---

MVP 的 Flavor Tags 使用 PostgreSQL `text[]` 儲存在 `taste_feedback.flavor_tags`。

暫時不建立獨立 tag table；未來只有在 canonical tags、跨語言 metadata 或更複雜 query 需求出現時才正規化。

---

# 11. Adjustment Suggestion

## adjustment_suggestions

```text
id
user_id

based_on_session_id
dial_in_thread_id

parameter
previous_value
suggested_value
direction

reason
status

created_at
```

`parameter` 例如：

```text
grind
temperature
ratio
water
brew_time
```

`status`：

```text
pending
accepted
ignored
superseded
```

這讓 Suggestion 不會只存在 UI 一瞬間。

---

# 12. Recommendation Engine

MVP：

**Rule-based**

入口：

```ts
recommendBrewPlan({
  beanProfile,
  brewer: 'v60',
  primaryTasteGoal,
  secondaryTasteGoal,
})
```

流程：

```text
Input
 ↓
Filter Compatible MVP Catalog Recipes
 ↓
Score Recipe Templates
 ↓
Select Starting Recipe
 ↓
Apply Parameter Adjustments
 ↓
Generate Brew Plan
```

---

# 13. Recommendation Inputs

Primary：

```text
region
process
roastLevel
primaryTasteGoal
secondaryTasteGoal
```

MVP 的優先順序為：

```text
region
process
roastLevel
tasteGoal
```

`region` 可以為空。缺少 Region 時應使用其他已知輸入提供較保守的 fallback，而不是拒絕產生 Brew Plan。

`brewer: 'v60'` 是固定的 compatibility boundary，用來排除不相容的 Recipe，不參與 MVP rule scoring，也不需要使用者選擇。

Secondary：

```text
variety
```

Future：

```text
roaster
personalHistory
communityData
grinder
```

---

# 14. Recommendation Output

```ts
{
  recipeTemplateId,
  coffeeDose,
  waterAmount,
  ratio,
  temperature,
  grindLevel,
  steps,
  targetBrewTime,
  expectedFlavor,
  reasoning,
  source
}
```

`source`：

```text
official_rule
community
personal_history
ai
manual
```

MVP：

```text
official_rule
manual
```

---

# 15. Rule Engine Design

不要把 Recommendation Rules 寫死在 React Component。

例如：

```text
features/recommendation/
├── recommend-recipe.ts
├── adjust-plan.ts
├── config.ts
├── rules/
│   ├── roast.ts
│   ├── process.ts
│   ├── region.ts
│   └── taste-goal.ts
└── types.ts
```

Rules 應：

- 可測試
- 可解釋
- 可逐步調整
- 能輸出 Reasoning

初始 rules 與 recipe defaults 應採取保守、可解釋的 starting point，不宣稱科學精準或唯一最佳解。

所有仍需校準的參數與權重必須集中在具名、typed、readonly configuration constants，例如：

```ts
RECIPE_DEFAULTS
REGION_RULE_WEIGHTS
PROCESS_RULE_WEIGHTS
ROAST_RULE_WEIGHTS
TASTE_GOAL_RULE_WEIGHTS
```

不得把 magic numbers 分散在 React Components、Server Actions 或各個 rule branches。Configuration 與 rule composition 都必須有 Unit Tests，並驗證相同 input 會產生 deterministic output 與可讀的 reasoning。

例如：

```text
Sweet + Clean
+
Washed
+
Light Roast

→ Three Pour score +X
```

具體權重不在 Architecture 階段決定。

---

# 16. Adjustment Engine

入口：

```ts
createAdjustmentSuggestion({
  brewPlan,
  brewSession,
  tasteFeedback,
})
```

原則：

> **一次優先調整一個主要變因。**

例如：

```text
Too Sour
+
Sweetness lower than target

→ grind slightly finer
```

下一杯：

```text
Previous Brew Plan
+
Accepted Adjustment
=
New Brew Plan
```

其他參數維持不變。

---

# 17. Brew Timer Architecture

Timer 是 MVP 最需要注意的 client-side feature。

不要依賴：

```ts
setInterval(() => elapsed += 1)
```

作為唯一時間來源。

應使用：

```text
startedAt timestamp
+
current timestamp
=
elapsed time
```

避免：

- Browser throttling
- Screen switching
- Timer drift

---

# 18. Active Brew Persistence

開始 Brew Session 後，把 active brew 狀態同步保存到 local storage。

MVP 只維護一筆 recoverable local brew record。它可以處於：

```text
active
completed_pending_sync
```

至少保存：

```text
brewSessionId
brewPlan
startedAt
currentStep
recordedStepTimes
```

目的：

- accidental refresh
- PWA 被切到背景
- browser tab reload

重新進入 Brew Screen 時可以恢復 Session。

Supabase 是長期資料 Source of Truth。

Local persistence 是 active session recovery。

Local record 只有在 Supabase 確認保存成功後才可以清除。若 completed session 尚未同步，不建立通用 queue 或允許 local record 被另一杯離線 Brew 覆寫。

---

# 19. Offline Strategy

MVP 不追求：

> 整個產品完整 offline-first。

優先做到：

> **正在沖咖啡時，不應因暫時斷網而失去 Timer / Session。**

因此：

### Offline Must Work

- Active timer
- Current Brew Plan
- Step progression
- Local session recording

### Online Preferred

- Create new Coffee
- Generate new recommendation
- History sync
- Account management

完成 Brew 後如果 offline：

```text
Local completed session
 ↓
Network restored
 ↓
Sync Supabase
```

同步必須 idempotent：

- Brew Session 在開始時產生 stable client UUID
- retry 使用相同 UUID 與 payload
- Server mutation 使用 insert-on-conflict / upsert semantics
- 重複的 reconnect、refresh 或 retry 不得建立重複 Session / Session Steps

完整 IndexedDB offline database 可以在需要時再加入。

MVP active session 使用單一 local-storage record，不建立 IndexedDB、一般化 sync queue 或完整 offline database。

---

# 20. PWA

使用：

```text
app/manifest.ts
public/sw.js
```

主要 PWA 目的：

- Add to Home Screen
- Standalone presentation
- Cache basic shell/assets
- Improve Brew experience

Next.js 官方目前直接支援 `manifest.ts`，也有 PWA / Service Worker 官方指南。

MVP 不依賴 Push Notification。

---

# 21. Server vs Client Responsibility

## Server

適合：

- Authenticated data fetch
- Database mutation
- Recommendation generation
- Adjustment generation
- History
- Coffee CRUD

## Client

適合：

- Brew Timer
- Active Session state
- Step interaction
- Quick Feedback interaction
- temporary offline recovery

核心原則：

> Timer 不應依賴 round trip 到 server。

---

# 22. Supabase Security

所有 user-owned tables 使用：

**Row Level Security**

基本原則：

```text
user_id = auth.uid()
```

User-owned：

- profiles (`id = auth.uid()`)
- bean_profiles
- coffees
- dial_in_threads
- brew_plans
- brew_sessions
- taste_feedback
- adjustment_suggestions

User-owned child tables 透過 parent ownership policy 保護：

- brew_plan_steps → brew_plans
- brew_session_steps → brew_sessions

Official Recipe tables 為 public read、migration / service-role write：

- recipe_templates
- recipe_steps

Community 資料的 public policy 未來另外設計。

Supabase Auth 與 Data API 可以配合 RLS 控制 row-level access。

---

# 23. Public vs Private Data

MVP 預設：

```text
My Coffee          private
Brew Plan          private
Brew Session       private
Taste Feedback     private
Dial-in            private
```

Official Recipe：

```text
public read
admin write
```

未來 Community Sharing 必須由使用者 explicit opt-in。

---

# 24. Community Evolution

Future：

```text
Private Brew Plan
       ↓
User chooses Share
       ↓
Public Community Plan
```

Community 不直接暴露完整私人 Brew Session。

公開資料應建立明確 sharing boundary。

---

# 25. Future AI Boundary

AI 不直接寫入核心歷史資料。

推薦流程：

```text
Application Context
       ↓
AI Recommendation
       ↓
Structured Suggestion
       ↓
User Accepts
       ↓
Create Brew Plan
```

所有 AI output 都必須轉成正式 Brew Plan 才進入使用流程。

這樣 AI 可以替換，而不污染 Domain Model。

---

# 26. Testing Strategy

## Unit Tests

優先：

- Recommendation Rules
- MVP recommendation candidates include only Three Pour, 4:6, and One Pour
- Recommendation configuration constants and deterministic tie-breaking
- Adjustment Rules
- Plan generation
- Plan deviation calculation
- Timer calculations

## Integration Tests

- Create Coffee
- Email authentication and user-owned RLS boundaries
- Generate Plan
- Start Brew
- Complete Brew
- Idempotent completed-session retry without duplicate Session / Session Steps
- Save Feedback
- Continue Dial-in

## E2E

核心 Happy Path：

```text
Add Coffee
→ Brew This Coffee
→ Taste Goal
→ Brew Plan
→ Start
→ Complete
→ Feedback
→ Adjustment
→ Continue Dial-in
```

---

# 27. MVP Architecture Principle

不要提前加入：

- Microservices
- Event bus
- Queue
- Vector Database
- AI infrastructure
- Dedicated recommendation backend
- Complex state-management framework
- Full offline database
- Native app

當需求真的需要，再加入。

---

# 28. Source of Truth

Repository：

```text
docs/
├── PRODUCT.md
└── ARCHITECTURE.md
```

作用：

```text
PRODUCT.md
→ What / Why

ARCHITECTURE.md
→ How
```

Agent-specific：

```text
AGENTS.md
CLAUDE.md
```

兩份文件應要求 Agent：

1. 開始大型 Feature 前先閱讀 PRODUCT + ARCHITECTURE
2. 不自行改變 Product Decision
3. 若 Architecture 與實際 Codebase 衝突，先提出
4. 每次實作遵循現有 Domain Model
5. 完成後跑 typecheck / lint / tests
