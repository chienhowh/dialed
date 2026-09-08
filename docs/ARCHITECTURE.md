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

第一個 Brew Session 建立後，應用層禁止再編輯該 Brew Plan 與 `brew_plan_steps`。Guided Brew 永遠讀取這份 persisted snapshot；Recipe Template 的後續變更不參與 active 或 completed Session 的執行。

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

Milestone 6 submission 必須至少選擇一項 Quick Feedback。Negative signals 可以 multi-select；`pretty_good` 與 `too_sour`、`too_bitter`、`too_weak`、`too_strong`、`astringent` 全部互斥。`pretty_good` 仍可與 overall rating、sensory ratings、flavor tags 和 notes 同時保存。

Taste Feedback 只能屬於 owned、completed Brew Session，且每個 Session 最多一筆。Submitted feedback 是 historical observation snapshot；MVP repository 使用 conflict-safe insert-and-fetch，不提供 update / delete application path，也不建立 versioning。

Milestone 6 不提供 Actual Brew correction。現有 session dose、water、temperature 與 pour-water values 是由 Brew Plan 初始化的 defaults，不能當作 independently measured deviations 參與 adjustment ranking。

---

# 11. Adjustment Decision

## Domain boundary

```text
TasteFeedback
→ Feedback Interpretation
→ inferred Adjustment Direction(s)
→ user selects ONE direction if needed
→ AdjustmentCandidate choices
→ Dialed recommends one candidate
→ user selects ONE candidate
→ persisted AdjustmentDecision
→ end Milestone 6
```

三個 concepts 不可合併：

- `TasteFeedback` 保存使用者觀察到的 cup result。
- `AdjustmentDecision` snapshot Dialed 當時的 interpretation、使用者想先改善的方向、recommended candidate 與 selected candidate。
- `AdjustmentCandidate` 是朝 selected direction 移動的一個具體 brewing-variable change。

`adjustmentDirection` approved values：

```text
increase_extraction
decrease_extraction
increase_strength
decrease_strength
reduce_astringency
hold
```

`uncertain` 只可以是 interpretation 無法提出可靠 direction 時的 outcome，不是 user-selected Adjustment Direction，也不寫入 inferred direction snapshot。

`candidateChangeDirection` 是另一個 field，例如 `finer`、`higher` 或 `lower`。不可用一個 ambiguous `direction` 同時承載兩種語意。

## Conservative interpretation

目前 approved directional guidance：

```text
Too Sour    → likely increase_extraction
Too Bitter  → likely decrease_extraction
Too Weak    → increase_strength
Too Strong  → decrease_strength
Astringent  → reduce_astringency
Pretty Good → hold
```

這些是 possible next directions，不是 diagnosis。Multiple negative signals 可以產生 multiple inferred directions；使用者必須回答「What should we improve first?」，選擇 ONE direction。系統不得合併成 multi-parameter adjustment。

`hold` 是 explicit persisted decision，沒有 recommended 或 selected candidate。這使 intentional no-change 與 incomplete adjustment flow 保持不同。

## Milestone 6 database design

既有 internal prototype `adjustment_suggestions` 一筆只能描述一項 concrete parameter change，無法在 recommended 與 selected 不同時保存兩者，也無法保存 inferred directions、selected adjustment direction 或 interpretation version。最小 clean design 是以 `adjustment_decisions` 取代它，不建立 separate candidate rows，也不持久化 unselected alternatives。

### `adjustment_decisions`

```text
id uuid primary key default gen_random_uuid()
user_id uuid not null
taste_feedback_id uuid not null unique

inferred_directions text[] not null
selected_direction text not null
interpretation_version text not null

recommended_candidate jsonb
selected_candidate jsonb
candidate_knowledge_version text

status text not null
applied_brew_plan_id uuid null
created_at timestamptz not null default timezone('utc', now())
```

Session 與 Dial-in Thread 不在 decision row 重複儲存。它們由 immutable relationship chain 取得：

```text
adjustment_decisions.taste_feedback_id
→ taste_feedback.brew_session_id
→ brew_sessions.brew_plan_id
→ brew_plans.dial_in_thread_id
```

這仍保留 Feedback、Session 與 Thread relationship，同時從結構上避免同一 owner 把 Session A 的 decision 錯接到 Thread B。`taste_feedback` 增加 `unique (id, user_id)`，decision 使用 `(taste_feedback_id, user_id)` composite ownership FK。

`adjustment_decisions.user_id` reference `auth.users (id) on delete cascade`；`(taste_feedback_id, user_id)` reference `taste_feedback (id, user_id) on delete cascade`。不新增 direct Session / Thread foreign keys。

`inferred_directions` 至少一項，只允許 approved Adjustment Direction values，並且 `selected_direction = any(inferred_directions)`。Application parser 另外 canonicalize order 並拒絕 duplicate array entries。

`interpretation_version` 是 historical snapshot contract；不可用最新 rules 重算過去呈現給使用者的 directions。

Decision `status`：

```text
pending
applied
held
unsupported
```

Constraints 保證：

- `selected_direction = 'hold'` → `inferred_directions = array['hold']`、`status = 'held'`，且兩個 candidate columns 與 `candidate_knowledge_version` 都是 null。
- `status in ('pending', 'applied')` → selected direction 不是 `hold`、inferred directions 不包含 `hold`，且 recommended／selected candidate 與 candidate knowledge version 全部 non-null。
- `status = 'unsupported'` → selected direction 不是 `hold`、inferred directions 不包含 `hold`，兩個 candidate columns 都是 null，而 candidate knowledge version non-null。
- `status = 'applied'` iff `applied_brew_plan_id` non-null；其他狀態的 pointer 必須是 null。該欄位以 ownership-safe composite FK 指向同一使用者的 `brew_plans`，並以 unique constraint 保證一個 plan 不會被多個 decision 宣告為套用結果。
- Milestone 6 只建立 `pending`、`held` 或 `unsupported`；Milestone 7 套用 selected candidate 並原子建立 Next Brew Plan 後，才可同時寫入 `applied_brew_plan_id` 並把 `pending` 改為 `applied`。

`reduce_astringency` 在 Candidate Catalog v1 建立 `unsupported` decision；這表示 interpretation 有有效 direction，但 catalog 尚無 reviewed executable candidate。

### Candidate Catalog v1

| Selected direction | Recommended | Alternative |
| --- | --- | --- |
| `increase_extraction` | `grind` / `finer` | `temperature` / `higher` |
| `decrease_extraction` | `grind` / `coarser` | `temperature` / `lower` |
| `increase_strength` | `water` / `lower` | — |
| `decrease_strength` | `water` / `higher` | — |
| `reduce_astringency` | unsupported | — |
| `hold` | no candidate | — |

Strength adjustments 固定 coffee dose，以 water amount 作為 primary variable；ratio 是由 dose 與 water 推導的值。M6 不 resolve exact water delta 或 next ratio。

### Candidate snapshot JSONB

`recommended_candidate` 與 `selected_candidate` 使用相同的 typed shape：

```ts
type AdjustmentCandidateSnapshot = {
  parameter: "grind" | "temperature" | "water";
  changeDirection: "finer" | "coarser" | "higher" | "lower";
  evidenceClassification: "product_heuristic";
  reason: string;
};
```

Database CHECK 驗證 JSONB 是 object、四個且只有四個 required keys、primitive types、non-empty reason、approved parameter / changeDirection allowlists、structurally valid parameter-direction pairs，以及 `product_heuristic` evidence。Direction → candidate eligibility 與 exact magnitude 是 typed domain logic；database 不複製整份 Candidate Catalog。

Candidate Snapshot 保存 intent，不保存 `previousValue`、`suggestedValue` 或 resolved magnitude。Milestone 7 才從 selected intent 與 previous Brew Plan resolve exact value。

JSONB 比 duplicated `recommended_*` / `selected_*` columns 更適合這兩份小型 immutable snapshots，也避免為不需持久化的 alternatives 建立 candidate rows。MVP 仍可使用 `selected_candidate ->> 'parameter'` 查詢；目前不需要 GIN index。

Recommended 與 selected snapshot 即使相同也都保存；若使用者選擇 alternative，兩者自然保留不同內容。

### Constraints, indexes, and RLS

Proposed migration：

1. 在 `taste_feedback` 增加 Quick Feedback required CHECK、Pretty Good exclusivity CHECK，以及 `unique (id, user_id)`。
2. 將 feedback insert RLS `with check` 擴充為 owned Session 且 `brew_sessions.status = 'completed'`；repository 在 M6.2 同時驗證 completed status。
3. 建立 `adjustment_decisions`、上述 CHECK constraints、`unique (taste_feedback_id)` 與 composite ownership FK。
4. 建立 `(user_id, status, created_at desc)` index；Feedback、Session、Thread traversal 使用現有 FK／history indexes。
5. 對 `adjustment_decisions` 啟用 RLS，依既有 convention 提供 owner-only select / insert / update / delete policies；M6.2 application 不提供 historical snapshot update / delete path。Milestone 7 transition semantics 仍須由 conditional repository update 定義。
6. Feedback application layer 不提供 update / delete；既有 owner policies 可以暫時保留，product immutability 先由 repository/UI 保證。

Idempotency：Feedback 以 `brew_session_id`、Decision 以 `taste_feedback_id` 作 conflict key，使用 insert-on-conflict-do-nothing 再 fetch。Retry 不更新已存在的 historical snapshots。

Milestone 6 terminal result 的 `Done` 導向 related Coffee Detail。這沿用現有 route 並保留 coffee context，不為 M6 新增 Dial-in history route。

不需要 trigger。Cross-row completed-session 規則由 RLS `exists` 與 repository validation 雙層保護；status transition 由 Milestone 7 conditional update 保護。

### Existing prototype treatment

Repository 目前沒有 `adjustment_suggestions` application writes，seed 也沒有持久資料；database tests 中的 rows 都在 rollback transaction。Migration 執行前仍必須檢查 target environment row count：

- 若為零，直接 drop `adjustment_suggestions` 後建立 `adjustment_decisions`。
- 若非零，停止 migration 並先匯出／制定 backfill policy；舊 rows 缺少 feedback、inferred directions、recommended-vs-selected 與 rule version，不能無損推導新 decision。

Generated `src/types/database.ts` 必須在 migration 套用後更新：移除 `adjustment_suggestions` type 並加入 `adjustment_decisions` 與 JSON candidate fields。

這是最小 clean model，因為只新增一個 decision table、保留既有 feedback table、不建立 alternatives table，也不引入 workflow engine、event sourcing 或 next-plan infrastructure。

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

Milestone 6 / 7 boundary：

```text
Taste Feedback
+ Brew Plan
+ actual Brew Session
+ Dial-in History
        ↓
Inferred Adjustment Direction(s)
        ↓
User Direction Selection if needed
        ↓
Candidate Adjustment Strategies
        ↓
Ranked Choices
        ↓
User Selection
        ↓
Persist pending Adjustment Decision (Milestone 6)
        ↓
Next Brew Plan
        ↓
Mark Decision applied (Milestone 7)
```

原則：

> **標準 Dial-in iteration 一次只改變 ONE 個 primary brewing variable，其他參數在實務可行範圍內維持不變。**

Engine 應先從 feedback 產生 likely direction guidance（例如 `increase_extraction`），必要時讓使用者從 multiple inferred directions 選擇 ONE，再產生多個有效 candidate strategies。Dialed 可以排序並推薦其中一個，但 selected candidate 由使用者決定。Milestone 6 保存 decision；Next Brew Plan 由 Milestone 7 產生。

跨 layer 使用一致術語：`Inferred Adjustment Directions` → `Selected Adjustment Direction` → `Candidate Adjustment Strategies` → `Recommended Adjustment` / `Ranked Choices` → `Selected Adjustment` → `Next Brew Plan`。

例如：

```text
Selected direction: Increase extraction

Candidate strategies:
1. Grind finer (recommended)
2. Increase water temperature

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

Future reviewed ranking 可以使用 current parameters 與 previous outcomes 作為 Context，例如：

- temperature 已高時，降低「再提高 temperature」的 priority。
- drawdown 已慢時，降低「再磨細」的 priority。

以上只是 architectural examples，不是 approved Milestone 6 candidate knowledge。Actual-value correction 完成前，由 Brew Plan 初始化的 Session fields 不得當作 measured deviation。

切換 Recipe Template / brewing framework 通常同時改變多個條件，不應表示成標準 one-variable adjustment。Method switching 應建立不同 baseline / Brewing Strategy，再從新 baseline 評估結果。

Milestone 6 只 snapshot recommended 與 selected candidate intent，不持久化其他 alternatives。Candidate Catalog v1 使用 grind finer/coarser、temperature higher/lower，以及固定 dose 下的 water lower/higher；不包含 agitation、pour、brew time、recipe、dose 或 ratio candidates。Exact magnitude 與 context thresholds 屬於 Milestone 7。

Dial-in Thread 現在以 `Coffee + Taste Goal` 定義。Method switch 是否延續同一 Thread 或建立新 Thread 尚未決定；Architecture 不在此 milestone 靜默改變 identity semantics。

## Milestone 7 v1 magnitude resolution

Exact adjustment policy 使用獨立 version `adjustment-magnitude-v1`，不可與 `feedback-interpretation-v1` 或 `candidate-catalog-v1` 混用。Pure typed resolver 只接受 `candidate-catalog-v1` 的 persisted `selected_candidate`；unknown version、unknown candidate 與 expected boundaries 都回傳 typed non-applied outcome，不以 generic exception 表示。

Magnitude rules：

- Grind 使用 ordered catalog `fine → medium-fine → medium → medium-coarse → coarse`，每次只移動一個相鄰 level。DB 欄位維持 text；unmapped text 或 catalog boundary 不可套用。
- Temperature higher/lower 固定 `+1°C` / `-1°C`，並遵守既有 integer `1–100°C` bounds。
- Water lower/higher 固定以 stored source ratio `-1.0` / `+1.0`，coffee dose 不變，`newWater = dose × newRatio` round 到 Brew Plan 的兩位小數 precision。Source Plan water/ratio 若已不一致，不修改歷史資料。
- Water step 使用 `newWater / oldWater` proportional scaling；每個 Pour cumulative target round 到 `0.1g`，final Pour 強制等於 new total。Wait step 與 recipe structure 全部照抄。

Ratio 與 rescaled Pour targets 是 water primary change 的 derived consistency values，不計為第二個 primary variable。

## Next Plan snapshot and atomic apply

Next Plan 必須 clone previous `brew_plans` 與 `brew_plan_steps` snapshot，不查詢 current `recipe_steps` 或重跑 Recommendation Engine。新 Plan 保留 owner、Coffee、Dial-in Thread、Recipe Template reference、dose、target time、expected flavor、reason 與所有 unrelated parameters；設定 `parent_plan_id = source Plan`、`based_on_session_id = completed source Session`，並使用 `previous_brew_adjustment` provenance。Step rows 使用新 IDs。

`adjustment_decisions.applied_brew_plan_id` 是 Decision → generated Plan 的唯一 canonical relationship，使用 `(applied_brew_plan_id, user_id)` ownership-safe FK。Lifecycle invariant：只有 `applied` 可以且必須有 applied Plan；`pending`、`held`、`unsupported` 必須為 null。

Application 先載入 immutable Decision → Feedback → completed Session → source Plan chain，使用 pure resolver 產生 validated payload。PostgreSQL `apply_adjustment_decision` RPC 再從 locked Decision 重新解析同一 source chain、只允許 selected candidate 對應的 mutation shape，並在一個 transaction 內建立 Plan、clone steps、更新 `status = 'applied'` 與 applied Plan ID。

RPC 以 `auth.uid()` 驗證 owner，並對 Decision 使用 row lock。若 Decision 已 applied，直接回傳既有 Plan ID；同一 Decision 的 retry 或 concurrent requests 因此不會建立第二個 Plan。任何 validation 或 write failure 都 rollback，Decision 維持 pending，且不存在 partial Plan／steps。

Authenticated client 只可 select 與 insert initial `pending`／`held`／`unsupported` Decision；不保留 direct update/delete privilege。`pending → applied` 與 `applied_brew_plan_id` 寫入只能經過 atomic `SECURITY DEFINER` RPC，避免 client 繞過 source-chain validation 或把任意 owned Plan 宣告為套用結果。Service role 保留既有受信任的管理權限。

Magnitude version 不另建 DB column：Decision 保存 candidate version與 intent，source／generated Plan snapshots 保存 before/after exact values，足以重建本次結果；RPC contract 仍要求 caller 明確傳入 supported magnitude version。

## Milestone 7 Continue Dial-in application flow

Feedback route 依序載入 completed Session、Taste Feedback 與 persisted Adjustment Decision，並直接依 Decision status render；既有 Decision 不重新執行 interpretation 或 candidate selection。`pending` 且具有 selected candidate 時顯示 Continue，`applied` 使用 persisted `applied_brew_plan_id`，`held`／`unsupported` 維持 terminal state。

Client form 只提交 bound `decisionId`，使用 local action pending state 防止同一畫面重複送出。Server action 將 input 視為 untrusted、驗證 identifier，呼叫 authenticated `applyAdjustmentDecision`，成功後 redirect 至 `/brew/{generatedPlanId}`。Stale pending render 若已由另一 request 套用，底層 idempotent RPC 回傳同一 Plan，action 仍視為成功。

Typed magnitude failure 在 application presentation layer 轉為 user-facing copy並留在原頁；resolver 與 repository 不包含 UI strings。Permanent current-state failure 停用 immediate retry，unexpected infrastructure failure 顯示 generic retryable error。Non-owner／missing Decision 沿用 not-found boundary。

## Milestone 8.1 Dial-in Thread read model and recovery

`features/dial-in-history` 提供 owner-scoped read model。Repository 先載入 Threads，再以 ID sets bulk load Coffees、Plans、Sessions、Feedback 與 Decisions；query 數量不隨 Thread 或 attempt 數量線性增加。Raw database rows 先轉成 typed source records，再由 pure assembly layer 建立 Thread summaries、Brew attempts 與 actionable items，React 不自行推導 relationship state。

一個 Brew attempt 對應一個 Brew Session，同一 Plan 的多個 Sessions 保持為不同 attempts。Applied Decision 以 `applied_brew_plan_id` 連到 generated Plan；`based_on_session_id` 保留產生該 Plan 的 attempt causality。Presentation 可以依時間排序，但不得把 branching Thread 宣告成單一 Plan chain。

Actionable items 依 persisted facts 推導：無 Session 的 Plan 是 `ready_to_brew`；completed Session 無 Feedback 是 `needs_feedback`；Feedback 無 Decision 是 `needs_adjustment_decision`；pending Decision 是 `pending_adjustment`；applied Decision 指向且尚無 Session 的 Plan 是 `next_plan_ready`。同一 Thread 保留所有 items。Recovery presentation priority 是 needs feedback、needs adjustment decision、pending adjustment、next Plan ready、ready to brew；相同 priority 再依 action activity time 與 stable ID 排序。這是 UX priority，不是 domain causality。

Latest completed attempt 依 `finished_at desc`、`started_at desc`、`id desc` 判定；Plan creation 依 `created_at desc`、`id desc`。Thread activity 從 child timestamps 推導，不使用 `dial_in_threads.updated_at`。`dial_in_threads.status` 也不驅動主要 recovery UI；held／unsupported／aborted 只產生 presentation terminal summary，不觸發 Thread mutation。

DB `brewing` Session 本身不足以證明可恢復。Guided Brew progress 仍以現有 device-local active-brew record 為準；M8.1 server read model 只可顯示 non-actionable `Brew in progress` summary，不產生 Resume CTA。M8.1 不新增 migration、view、RPC、index、Thread route、lifecycle field 或 `current_plan_id`。

## Milestone 8.2 History presentation model

M8.2 延伸相同 `features/dial-in-history` aggregate，不建立第二套 History repository。Repository 仍先 owner-scope Threads，再用 ID sets bulk-load related Coffees、Plans、Sessions、Feedback 與 Decisions；所有 referenced Recipe Template IDs 另以單一集合 query 載入 display names，query count 不會隨 Plan 數量線性增加。Template ID 不存在、因 RLS 不可見或 label query 無法完成時只使用 `Brew Plan` fallback，不影響 persisted Plan snapshot 的呈現。

`HistoryCoffeeGroup`、`HistoryThread` 與 `HistoryAttempt` 由 pure presentation builder 產生。Coffee/Thread 依 derived activity descending；Thread 內 Session 依 `started_at ascending, session id ascending` 編號為 presentation-only `Brew #N`。相鄰 attempts 若使用同一 Plan 可以加註 same-plan，但 chronology 不建立 lineage；Decision → applied Plan 必須同時符合 persisted `applied_brew_plan_id` 與 generated Plan 的 `based_on_session_id`，因此 branching attempt 不會錯接。

History Plan parameters 只讀 `brew_plans` snapshot。Recipe Template query 僅將目前可存取的 `name` 當 identity label，不用 template defaults 或 `recipe_steps` 重建 dose、water、ratio、temperature、grind、target time、pour structure 或 timing，也不宣稱它是 brew-time template version。Current schema 對 anon/authenticated 只有 public Recipe Template SELECT policy，沒有 client insert/update policy；即使如此，historical behavior correctness 仍依賴 Brew Plan／Brew Plan Steps snapshots。

History recovery navigation 直接使用 M8.1 derived actionable items。`Brew Again` 是 presentation-only link 到 source `/brew/{planId}`；既有 Guided Brew start flow 以新 UUID 建立新 Session，重用同一 Plan 與 Thread。History route 不執行 mutation。Unstarted Plans 保持獨立 plan cards；DB-only brewing attempt 無 Resume CTA；applied manual Plan 只顯示 final persisted parameters 與 manual-edit provenance，不重建 pre-edit values。

M8.2 不新增 migration、view、RPC、index、sequence、Thread lifecycle field、dedicated Thread route、branch tree、Best Brews 或 analytics。

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
- adjustment_decisions

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
