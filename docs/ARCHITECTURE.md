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
origin_country_code
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

MVP 欄位表示：

| Column | Database representation | Domain type | UI / normalization |
| --- | --- | --- | --- |
| `origin_country_code` | required `text`，受 ISO 3166-1 alpha-2 allowlist CHECK 約束 | `OriginCode` | searchable country combobox 顯示國名、提交 country code；不接受任意字串 |
| `region` | nullable `text` | `string \| null` | free-form、trimmed；空字串轉 `null` |
| `process` | required `text`，CHECK：`washed` / `natural` / `honey` / `other` | `ProcessCode` | controlled input；display label 與 stored value 分離 |
| `roast_level` | required `text`，CHECK：`light` / `medium_light` / `medium` / `medium_dark` / `dark` | `RoastLevelCode` | controlled input；display label 與 stored value 分離 |
| `variety` | nullable `text` | `string \| null` | flexible free-form、trimmed；空字串轉 `null` |

Origin catalog 放在 application/domain layer，包含 typed ISO code allowlist 與 display label mapping；MVP 不建立 countries table。Process 與 Roast Level 的 typed readonly catalogs 也放在 domain layer，讓 Coffee CRUD 與 Recommendation 共用同一份 canonical contract。

目前不加入 `process_detail`。`Anaerobic`、`Thermal Shock`、`Co-ferment` 等 descriptor 不進入互斥的 primary `process` catalog；等實際功能需要時再加入 optional free-form 欄位與 migration。

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
Bean Profile + Taste Goal
        ↓
Resolve Supported Brewing Strategy
        ↓
Recipe / Technique + Starting Parameters
        ↓
Recommended Starting Point
```

Recommendation Engine 不以「對所有 Recipe additive scoring，再挑最高分 winner」作為 domain contract。Recipe Template 是實作 Brewing Strategy 的 framework；Engine 的輸出目標是保守、可解釋、可開始驗證的 Brew Plan。

Recommendation domain 可以在既有 application layer 內對齊此模型，不需要改變資料庫 schema、Brew Plan persistence 或 Recommendation UI flow。

---

# 13. Recommendation Inputs

Decision Context：

```text
primaryTasteGoal
secondaryTasteGoal
roastLevel
process
region
originCountry
variety
```

責任與 v1 行為：

- `primaryTasteGoal`：主要 flavor direction，影響必須大於 `secondaryTasteGoal`。
- `secondaryTasteGoal`：optional 次要方向；架構不固定為 `0.5` 或其他永久 numeric multiplier。
- `roastLevel`：只有 reviewed rules 支持時，才可調整保守起始 extraction parameters。
- `process`：neutral，直到 calibrated rules 存在。
- `region`：neutral，直到 calibrated rules 存在。
- `originCountry`：neutral。
- `variety`：neutral。

Neutral attributes 仍應傳入或保留於 Recommendation Context，讓未來版本可在 reviewed knowledge 出現後使用；v1 不得因為欄位存在就推論 Recipe preference。缺少或未支援的關係走 neutral fallback，而不是拒絕產生 Brew Plan。

`process`、`roastLevel` 與 `originCountry` 在進入 Recommendation Engine 前已分別是 canonical `ProcessCode`、`RoastLevelCode` 與 `OriginCode`；Rules 不執行 casing/string normalization。`region` 與 `variety` 維持 trimmed nullable free-form Context。

`brewer: 'v60'` 是固定 compatibility boundary，用來排除不相容 Recipe，不是 ranking signal，也不需要使用者選擇。

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

概念上，output 是「Resolved Brewing Strategy + supporting Recipe / Technique + Starting Parameters」所建立的 Recommended Starting Point。Milestone 4.1 不新增 `brewing_strategy` database column；`recipe_template_id`、Brew Plan snapshot 與 `recommendation_reason` 維持既有 persistence contract。

Reasoning 只能包含實際套用的 rule，並應標示 evidence strength：

- `product_heuristic`：保守產品 heuristic，仍需透過使用結果校準。
- `method_supported` / `domain_supported`：有較強 method 或 domain evidence 支持的行為。
- `neutral_fallback`：缺少 supported relationship 時使用的保守 fallback。

這些是 Recommendation Knowledge / reasoning 的 conceptual labels；Milestone 4.1 不要求 schema migration。未參與決策的 neutral attribute 不得被描述成選擇某個 Recipe 的原因。

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
├── recommend-brew-plan.ts
├── resolve-strategy.ts
├── apply-starting-parameters.ts
├── config.ts
├── rules/
│   ├── roast.ts
│   └── taste-goal.ts
└── types.ts
```

這是 conceptual module boundary，不要求 Milestone 4.1 建立或重新命名檔案。

Rules 應：

- 可測試
- 可解釋
- 可逐步調整
- 能輸出 Reasoning

初始 rules 與 recipe defaults 應採取保守、可解釋的 starting point，不宣稱科學精準或唯一最佳解。

所有仍需校準的 strategy mappings、fallback 與起始參數必須集中在具名、typed、readonly Recommendation Knowledge，例如：

```ts
RECIPE_DEFAULTS
STRATEGY_RULES
ROAST_STARTING_PARAMETER_RULES
NEUTRAL_FALLBACK
```

不得把 magic numbers 或永久 `Taste Goal → Recipe` mapping 分散在 React Components、Server Actions 或 rule branches。Recommendation Knowledge 與 rule composition 都必須有 Unit Tests，驗證相同 input 產生 deterministic output，且 explanation 只描述實際套用的 rules。

Knowledge entry 必須能獨立 review、calibrate 與移除。不得把以下關係當成既定 coffee-domain knowledge：

- Washed → Three Pour
- Natural → One Pour
- Light → 4:6
- Dark → One Pour

既有 `1 / 2 / 3` point magnitudes 沒有 physical 或 sensory meaning，不屬於架構契約。Taste Goal 可以影響 Brewing Strategy，但具體 reviewed mapping 放在 configurable Recommendation Knowledge；沒有支持的 Taste Goal strategy 時使用 `NEUTRAL_FALLBACK`。

Roast Level exact starting values 同樣放在 reviewed configuration，並可獨立校準。Architecture 不把 `Light = 94°C`、`Medium = 92°C`、`Dark = 88°C` 等未 reviewed 數值視為 product truth。

第一版不自動加入未有規格依據的細微 temperature / ratio adjustment。Recipe Template 的 seed `default_ratio`、`default_temperature`、`default_grind_level`、`expected_flavor` 與 steps 是 Plan 起始值；application config 只補上 schema 未包含的 dose 與 target time：

| Recipe | Dose | Target time |
| --- | ---: | ---: |
| Three Pour | 15g | 2:15–2:40 |
| 4:6 | 15g | 3:30–4:00 |
| One Pour | 15g | 2:00–2:30 |

Water Amount 使用 `dose × template default_ratio`，目前三個 official seed 都產生 240g。Recommendation Reason 不顯示虛構 score 或未套用 attribute；它描述 selected strategy、使用的 supporting knowledge、applied starting-parameter adjustments 與 fallback status。

---

# 16. Adjustment Engine

Future conceptual boundary：

```text
Taste Feedback
+ Brew Plan
+ actual Brew Session
+ Dial-in History
        ↓
Desired Adjustment Direction
        ↓
Candidate Adjustment Strategies
        ↓
Ranked Choices
        ↓
User Selection
        ↓
Next Brew Plan
```

原則：

> **標準 Dial-in iteration 一次只改變 ONE 個 primary brewing variable，其他參數在實務可行範圍內維持不變。**

Engine 應先從 feedback 與 actual execution 判斷 desired direction（例如 `increase_extraction`），再產生多個有效 candidate strategies。Dialed 可以排序並推薦其中一個，但 Next Brew Plan 由使用者選擇的 ONE 個 strategy 產生。

跨 layer 使用一致術語：`Desired Adjustment Direction` → `Candidate Adjustment Strategies` → `Recommended Adjustment` / `Ranked Choices` → `Selected Adjustment` → `Next Brew Plan`。

例如：

```text
Desired direction: Increase extraction

Candidate strategies:
1. Grind finer (recommended)
2. Increase water temperature
3. Increase agitation / adjust pour structure

User selection: Grind finer
```

下一杯：

```text
Previous Brew Plan
+
Selected ONE-variable Adjustment
=
New Brew Plan
```

其他參數維持不變。

Future ranking 可以使用 current parameters 與 previous outcomes 作為 Context，例如：

- temperature 已高時，降低「再提高 temperature」的 priority。
- drawdown 已慢時，降低「再磨細」的 priority。

以上是 architectural examples，不是 Milestone 4.1 或 Milestone 5 implementation requirements。

切換 Recipe Template / brewing framework 通常同時改變多個條件，不應表示成標準 one-variable adjustment。Method switching 應建立不同 baseline / Brewing Strategy，再從新 baseline 評估結果。

既有 `adjustment_suggestions` schema 可以持久化目前 recommended / selected suggestion 與 status；候選集合、ranking metadata 與 evidence labels 在 Milestone 4.1 只是 conceptual boundary，不新增 migration。未來實作前需先決定是否需要額外 persistence。

Dial-in Thread 現在以 `Coffee + Taste Goal` 定義。Method switch 是否延續同一 Thread 或建立新 Thread 尚未決定；Architecture 不在此 milestone 靜默改變 identity semantics。

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
- Recommendation Knowledge, neutral fallback, deterministic output, and applied-rule-only reasoning
- Primary Taste Goal influence is greater than Secondary Taste Goal without requiring a fixed multiplier
- Neutral Process / Region / Origin / Variety do not change Recommendation Model v1 output
- Adjustment direction, candidate generation, ranking, and one-variable plan generation
- Recipe / method switching is not treated as a one-variable adjustment
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
