# Coffee Brewing Product

## 1. Product Vision

幫助手沖咖啡玩家解決一個常見問題：

> **拿到一支新的咖啡豆時，我不知道該怎麼沖，才能更接近今天自己想喝的味道。**

產品不只是沖煮計時器或咖啡紀錄工具，而是透過：

**咖啡豆特徵 + 當次期望風味**

選擇一個有依據的 Brewing Strategy，再以適合的 Recipe / Technique 與保守起始參數提供一個合理的 Brew Plan，並透過每次實際沖煮與 Taste Feedback，協助使用者逐杯調整。

長期希望系統能理解：

- 不同 Bean Profile 如何影響保守起始參數
- 不同 Brewing Strategy 與 Recipe-specific controls 對風味的可能影響
- 類似咖啡豆的其他玩家如何沖
- 使用者自己的風味偏好
- 同一支咖啡過去如何逐杯調整
- 哪些調整真的讓使用者更喜歡

最終提供個人化 Brewing Recommendation。

---

# 2. Product Principle

產品的核心不是：

> 記錄我今天怎麼沖咖啡。

而是：

> **幫助我決定今天這支豆該怎麼沖，並讓下一杯比上一杯更接近我想要的味道。**

Taste Goal 是「當次沖煮意圖」，不是 Coffee Bean 的固定屬性。

同一包咖啡今天可能想喝：

> Sweet + Clean

明天可能想喝：

> Juicy + Bright

因此不同 Taste Goal 可以形成不同的 Dial-in Thread。

---

# 3. Target User

主要使用者：

- 已有基本手沖經驗
- 會購買不同產區、處理法、品種的咖啡豆
- 願意調整研磨、水溫、粉水比、注水方式
- 希望記錄並比較沖煮結果
- 拿到新豆時偶爾不知道從哪種 Recipe 開始
- 希望逐杯找到自己喜歡的沖法

MVP 不以完全沒有手沖經驗的新手為主要 Target User。

---

# 4. Core Product Loop

## New Brew

```text
選擇 My Coffee
        ↓
今天想喝什麼風味？
Taste Goal
        ↓
Recommended Starting Point
        ↓
Generate Brew Plan
        ↓
Guided Brew
        ↓
Brew Session
        ↓
Taste Feedback
        ↓
Adjustment Decision
```

## Continue Dial-in

```text
My Coffee
    ↓
Existing Dial-in Thread
    ↓
Previous Feedback
    ↓
Inferred Adjustment Direction(s)
    ↓
User Selects ONE Direction
    ↓
Candidate Adjustment Strategies
    ↓
User Selects ONE
    ↓
Next Brew Plan
    ↓
Brew Session
    ↓
Taste Feedback
```

使用者永遠可以選擇：

1. 開始一個新的 Taste Goal
2. 延續目前 Dial-in
3. 完全照上一杯再沖一次

---

# 5. Core Domain Concepts

## 5.1 Bean Profile

描述咖啡豆本身的特徵。

Core：

- Country / Origin
- Region
- Process
- Roast Level

Optional：

- Variety
- Farm / Producer
- Altitude
- Other origin information

主要用途：

- Recommendation Context
- Community Matching
- Similar Bean Search
- Preference Analytics

Bean Profile 為 Recommendation 提供起始 Context，不代表某一類 Coffee 必須使用特定 Recipe。Recommendation Model v1 中，只有 Roast Level 可以在有 reviewed rule 支持時影響保守起始 extraction parameters；Process、Region、Origin 與 Variety 均保持 neutral。這些 neutral attributes 仍保留作為 Context，並供未來校準後的 Recommendation version 使用。

MVP Bean Profile 欄位契約：

- `Origin` 必填；使用 ISO 3166-1 alpha-2 country code 作為 canonical stored/domain value，例如 `ET`、`KE`、`CO`、`PA`、`TW`。UI 顯示可搜尋的人類可讀國名，不把顯示名稱存入資料庫。
- `Region` 選填；維持 trimmed、nullable 的 free-form text，不建立 Region taxonomy。
- `Process` 必填；primary process 僅使用 `washed`、`natural`、`honey`、`other` canonical values。`Anaerobic`、`Thermal Shock`、`Co-ferment` 這類可與 primary process 共存的 descriptor 不作為互斥 Process 選項。
- `Roast Level` 必填；使用 `light`、`medium_light`、`medium`、`medium_dark`、`dark` canonical values。UI 分別顯示 `Light`、`Medium Light`、`Medium`、`Medium Dark`、`Dark`。
- `Variety` 選填；維持 trimmed、nullable 的 flexible free-form text，需支援 `74158`、`SL28`、`Gesha`、`SL28 / SL34` 等值。

Canonical stored values 與 display labels 必須分離。Recommendation Engine 直接使用 canonical values，不在 rule evaluation 階段處理 casing 或字串正規化。

Process detail 在 MVP 暫不新增欄位；待有實際 Recommendation 或 Coffee metadata 使用情境時，再定義 optional free-form descriptor，避免提前建立不完整的處理法 taxonomy。

---

## 5.2 My Coffee

代表：

> **使用者目前手上的一包咖啡。**

包含：

- Bean Profile
- Roaster
- Product Name
- Roast Date
- Purchase Place
- Purchase Date
- Notes

Bean Profile 回答：

> 這是什麼樣的咖啡？

My Coffee 回答：

> 我現在實際正在喝哪一包？

Roaster / Product Name 是額外 Context，不作為 Community Matching 的唯一 identity。

---

## 5.3 Recipe Template

Recipe 是可重複使用的沖煮方法模板，也是實作 Brewing Strategy 的沖煮 framework。

Recipe Template 不是 Recommendation Engine 的最終目的，也不代表系統已證明它是某支 Coffee 的最佳沖法。它提供可執行的 technique、defaults 與 steps，讓選定的 Brewing Strategy 能產生 Recommended Starting Point。

MVP Active Official Recipe Templates：

- Three Pour
- 4:6
- One Pour

MVP 只支援 standard `V60` pour-over，不提供 Equipment Profile、器材管理、Brewer Capability 或其他 Brewer 選擇。

`Immersion` 延後為 Future Recipe Type。它不屬於 active MVP catalog，不可選擇，也不可由 MVP Recommendation Engine 推薦。

Recipe Template 仍需保留 Brewer Compatibility，讓未來可以加入其他 Brewer，而不需要改變 Brew Plan / Brew Session 的核心模型。

Recipe 定義：

- Brewing logic
- Suggested ratio
- Suggested temperature
- Suggested grind direction
- Brewing steps
- Expected flavor direction

Recipe 不代表某一杯的具體執行參數。

---

## 5.4 Taste Goal

代表：

> **「今天這一杯，我想把這支豆沖成什麼方向？」**

MVP：

- Sweet
- Bright
- Clean
- Full Body
- Juicy
- Balanced
- Complex

使用方式：

```text
Primary Taste Goal
+
Optional Secondary Taste Goal
```

例如：

- Sweet + Clean
- Juicy + Bright
- Complex + Sweet

Taste Goal 屬於 Brew Plan / Dial-in Thread。

**不屬於 My Coffee。**

Primary Taste Goal 必須比 Secondary Taste Goal 更能影響 Brewing Strategy；產品契約不指定固定數字 multiplier。

Taste Goal 定義使用者想前往的 flavor direction，不直接等同某個 Recipe。PRODUCT 不建立 `Sweet → Recipe X`、`Bright → Recipe Y`、`Clean → Recipe Z` 等永久 mapping；只有經 reviewed evidence 支持的具體對應，才能進入可配置的 Recommendation Knowledge。缺少支持時使用保守、neutral fallback。

---

## 5.5 Brewing Strategy

代表：

> **Dialed 準備如何朝當次 Taste Goal 前進。**

概念流程：

```text
Bean Profile + Taste Goal
        ↓
Brewing Strategy
        ↓
Recipe / Technique + Starting Parameters
        ↓
Recommended Starting Point
```

Brewing Strategy 可以使用特定 Recipe 真正支援的 controls，但不得為了讓推薦結果看起來多樣，就虛構 Taste Goal、Process、Region、Origin 或 Variety 與 Recipe 的關係。

---

## 5.6 Dial-in Thread

代表：

> **針對同一包 Coffee + 一組 Taste Goal，持續逐杯調整的一組實驗。**

一個 Brew attempt 對應一個 Brew Session。同一 Plan 可以產生多個 attempts；一個 Thread 也可能因不同 Session 的 adjustment 產生多個 Plan branches。因此 Thread 是可依時間閱讀的實驗群組，不是資料庫強制的單一路徑，也不存在唯一 authoritative current Plan。

例如：

```text
Ethiopia Sidama

Dial-in A
Sweet + Clean

Brew #1
★★★
Too Sour

↓ Likely direction: increase extraction
↓ Candidate adjustments
↓ User selected: grind finer

Brew #2
★★★★

↓ Temperature -1°C

Brew #3
★★★★★
```

同一包 Coffee 可以同時存在：

```text
Dial-in A
Sweet + Clean

Dial-in B
Juicy + Bright

Dial-in C
Complex
```

---

## 5.7 Brew Plan

代表：

> **這一杯打算怎麼沖。**

來源：

```text
My Coffee
+
Taste Goal
+
V60 Brewing Context
+
Brewing Strategy
+
Recipe Template
+
Recommendation Knowledge
```

包含：

- Coffee Dose
- Water Amount
- Ratio
- Water Temperature
- Grind Level
- Brewing Steps
- Target Brew Time
- Expected Flavor
- Recommendation Reason

在第一個 Brew Session 開始前，使用者可以編輯這份 Brew Plan。開始後該 Plan 會鎖定，後續執行資料只寫入 Brew Session，不回寫或重解釋原始 Plan。

來源可能為：

- Official Rule
- Manual
- Previous Brew Adjustment
- Community Plan
- Personal History
- AI Recommendation

---

## 5.8 Brew Session

代表：

> **這一杯實際怎麼沖。**

Brew Plan = Planned Data

Brew Session = Actual Data

Brew Session 的 session-level `started_at`、`finished_at` 與 `actual_brew_time` 由實際執行 lifecycle 產生。以下 per-step actual timing/water 是未來有真正 measurement / correction source 時可保存的資料形狀，不由 Guided Brew 的 `NEXT` 推測：

```text
              Plan      Actual

Bloom         00:00     00:00
Water         40g       42g

Second        00:40     00:44
Water         120g      123g

Final         01:20     01:29

Finish        02:20     02:37
```

Milestone 8.3 不把手動切換畫面的時刻宣告成 actual step transition，也不把 Plan cumulative target water 寫成 actual poured water。

Actual Water、Temperature 等需要額外操作的資訊，可由 future correction flow 在沖完後補記；Milestone 6 不包含此功能。

---

## 5.9 Taste Feedback

沖煮後記錄結果。

### Quick Feedback

- Pretty Good
- Too Sour
- Too Bitter
- Too Weak
- Too Strong
- Astringent

Quick Feedback 支援 multi-select；例如 `Too Sour + Too Weak`、`Too Bitter + Astringent` 都有效。Milestone 6 至少需要選擇一項 Quick Feedback，讓每次 submission 都有明確的 hold 或 adjustment interpretation outcome。

`Pretty Good` 與所有 negative Quick Feedback 互斥，但仍可搭配 Overall Rating、Detailed Sensory Feedback、Flavor Tags 與 Notes。

Overall Rating 為 optional 的 1–5 preference rating，並不屬於 Quick Feedback selection。

### Detailed Sensory Feedback

Optional：

- Sweetness
- Acidity
- Body
- Clarity
- Juiciness
- Complexity

### Flavor Notes

Optional：

- Floral
- Citrus
- Berry
- Tropical Fruit
- Stone Fruit
- Nutty
- Chocolate
- Caramel
- Tea-like
- Custom Tags
- Notes

必須區分：

> **「這杯具有什麼風味」**

與：

> **「我喜不喜歡這杯」**

Submitted Taste Feedback 是 completed cup 的 historical observation snapshot。MVP 不提供 submission 後的 edit 或 delete UI，也不建立 feedback versioning / superseding。

---

## 5.10 Adjustment Decision

代表：

> **使用者在下一次 Dial-in iteration 想優先改善什麼，以及最後選擇哪一項 one-variable change。**

必須區分三個 concepts：

- `TasteFeedback`：使用者對 completed cup 的觀察。
- `AdjustmentDecision`：Dialed 當時提出哪些 likely directions，以及使用者選擇先改善哪個方向。
- `AdjustmentCandidate`：可以朝 selected direction 移動的一項具體 brewing-variable change。

完整概念流程：

```text
Completed Brew Session
→ Taste Feedback
→ Interpret Feedback
→ Inferred Adjustment Direction(s)
→ User selects ONE direction if needed
→ Candidate Adjustments
→ Dialed recommends one candidate
→ User selects ONE candidate
→ Persist Adjustment Decision
→ End Milestone 6
```

Generating the Next Brew Plan 屬於 Milestone 7。

Approved Adjustment Directions：

```text
increase_extraction
decrease_extraction
increase_strength
decrease_strength
reduce_astringency
hold
```

`uncertain` 可以是 interpretation 無法產生可靠方向時的 outcome，但不是 user-selected Adjustment Direction。

`adjustmentDirection` 與 `candidateChangeDirection` 必須使用不同欄位／術語。例如 `increase_extraction` 是 adjustment direction；`finer` 或 `higher` 是 candidate change direction。

目前的保守 interpretation guidance：

- Too Sour → likely `increase_extraction`
- Too Bitter → likely `decrease_extraction`
- Too Weak → `increase_strength`
- Too Strong → `decrease_strength`
- Astringent → `reduce_astringency`
- Pretty Good → `hold`

以上是可能的下一步方向，不是 extraction diagnosis。產品不得宣稱 sour 必然代表 under-extracted、bitter 必然代表 over-extracted、weak／strong 等同 extraction 狀態，或 astringency 只是 over-extraction。

若 multiple Quick Feedback signals 產生多個 valid directions，產品必須詢問：

> **What should we improve first?**

使用者只選一個 direction；系統不得把多個方向合併為同一輪的多參數調整。

`Pretty Good` 產生 explicit persisted hold decision。Hold 沒有 Adjustment Candidate，用來區分「刻意維持不變」與「尚未完成 adjustment flow」。

Candidate Catalog v1：

| Selected direction | Recommended candidate | Alternative candidate | Outcome |
| --- | --- | --- | --- |
| `increase_extraction` | `grind` / `finer` | `temperature` / `higher` | candidate selection |
| `decrease_extraction` | `grind` / `coarser` | `temperature` / `lower` | candidate selection |
| `increase_strength` | `water` / `lower` | — | candidate selection |
| `decrease_strength` | `water` / `higher` | — | candidate selection |
| `reduce_astringency` | — | — | `unsupported` decision |
| `hold` | — | — | `held` decision |

Strength adjustment 固定 coffee dose，以 water amount 作為 primary variable，ratio 由 dose 與 water 推導；M6 只保存 `water / lower` 或 `water / higher` 的 intent，exact water delta 與新 ratio 由 Milestone 7 resolve。

Candidate Snapshot v1 只保存 `parameter`、`changeDirection`、`evidenceClassification` 與 `reason`，不保存 `previousValue`、`suggestedValue` 或 resolved magnitude。目前 executable candidates 的 evidence classification 都是 `product_heuristic`；`neutral_fallback` 不是 adjustment candidate evidence。

`reduce_astringency` 在 Candidate Catalog v1 尚無 reviewed executable candidate，但 direction 本身仍有效，因此保存 terminal `unsupported` decision。這不同於 `uncertain` interpretation，也不同於 `hold`。

---

# 6. Recommendation Engine

MVP 不需要 AI。

使用 Rule-based Recommendation。

```text
Bean Profile + Taste Goal
        ↓
Brewing Strategy
        ↓
Recipe / Technique + Starting Parameters
        ↓
Recommended Starting Point
```

Recommendation 不是「替 Recipe 打分並挑出 winner」。Recipe Template 是實作 Strategy 的 framework，而不是 Recommendation 的最終目的。

各項 Context 的責任：

- Taste Goal：定義使用者這一杯希望前往的 flavor direction。
- Brewing Strategy：定義 Dialed 如何嘗試往該方向移動；只有在 Recipe 確實支援時，才使用 recipe-specific controls。
- Bean Profile：協助建立合理起點，不推論某類 Coffee 必須使用某個 Recipe。

Recommendation Model v1 對 Bean Profile attributes 的規則：

- Roast Level：只有在 reviewed rules 支持時，才可以影響保守起始 extraction parameters。
- Process：neutral，直到存在 calibrated rules。
- Region：neutral，直到存在 calibrated rules。
- Origin：neutral。
- Variety：neutral。

Neutral attributes 仍保留於 Context，並可供未來 Recommendation versions 使用；缺少支持的關係必須採用 transparent neutral fallback，不得發明 rule。

Taste Goal 對 Strategy 的影響必須遵守：

- Primary Taste Goal 的影響大於 Secondary Taste Goal。
- PRODUCT 不要求 `0.5` 或其他固定 numeric multiplier。
- PRODUCT 不永久 hard-code Taste Goal → Recipe mapping。
- Reviewed mappings 與 exact parameter values 屬於可獨立校準的 Recommendation Knowledge，而不是 product truth。

MVP 的 Brewer 固定為 `V60`，只作為 Recipe Compatibility Constraint，不是需要使用者選擇或加權的 Recommendation Input。

推薦結果應定位為：

> **Recommended Starting Point**

它是保守、可解釋且可開始驗證的起點，不宣稱是 optimal、best 或唯一正確 Recipe。

Recommendation explanation 只描述實際套用的 rules。若規則屬於產品 heuristic，而不是較強的 method/domain-supported behavior，說明必須清楚區分；neutral attribute 沒有參與決策時，不得把它包裝成推薦理由。

Roast Level 可以影響保守起始 extraction parameters，但 PRODUCT 不指定 `Light = 94°C`、`Medium = 92°C`、`Dark = 88°C` 等未 reviewed exact values。具體數值必須存在於 reviewed、configurable 且可獨立校準的 Recommendation Knowledge。

Current Context：

- Roast Level
- Primary Taste Goal
- Optional Secondary Taste Goal
- Region（neutral）
- Process（neutral）
- Origin（neutral）
- Variety（neutral）
- V60 Compatibility Constraint

Future Context：

- Grinder
- Roaster
- Personal History
- Community Data
- Previous Brew Sessions

---

# 7. Recipe Steps

Recipe Template 需要支援：

- Pour
- Wait

Future `Immersion` Recipe Type 才需要：

- Steep
- Release

主要使用累積目標水量：

```text
00:00 → 40g
00:40 → 120g
01:20 → 240g
```

而不是要求使用者心算：

```text
+40g
+80g
+120g
```

---

# 8. MVP User Flow

## 8.1 Add Coffee

```text
Home
 ↓
Add Coffee
 ↓
Bean Profile + My Coffee
 ↓
Save
 ↓
My Coffee Detail
```

**新增 Coffee 時不詢問 Taste Goal。**

---

## 8.2 Start New Brew

```text
My Coffee
 ↓
Brew This Coffee
 ↓
Select Taste Goal
 ↓
Recommendation + Brew Plan
 ↓
Start Brewing
```

---

## 8.3 Guided Brew

畫面主要顯示：

- Total Timer
- Current Step
- Target Water
- Next Step
- NEXT

避免沖煮過程中要求大量輸入。

Total Timer 是 Brew Session-level timer，從同一 Session 的 original `started_at` 與現在時間推導，不以 incrementing counter 作 source of truth。Refresh、background 或重新進入同一 device-local active brew 時，保留同一 Plan、Session ID、`started_at` 與 current presentation step，因此不建立第二個 Session，也不重設 timer。

Current Step 顯示 `Step N of total`、Pour／Wait type、簡短 instruction 與 Plan target。Pour 顯示 persisted Brew Plan step 的 cumulative target water；Wait 顯示 duration guidance。Next Step preview 顯示下一步時間與 target，final step 顯示 `Finish brew`。

`NEXT` 只手動前進 local presentation step，一次一格；不自動依 timer 前進、不 mutation Plan、不建立或同步新 Session、不寫 `brew_session_steps`，也不把按鍵時間或 Plan water target 當成 actual telemetry。M8 不要求沖煮中輸入 actual water。

Final step 使用 `Finish Brew`。完成操作以同一 stable Session ID idempotently 寫入 `finished_at`、`actual_brew_time` 與 `completed` status，再前往該 exact Session 的 Taste Feedback route。一次 Plan execution 等於一個 Brew Session；同一 Plan 的下一次 Brew Again 是另一個 Session。

---

## 8.4 Complete Brew

完成同一個 M8.3 Brew Session 後，直接在該 exact Session 的 Feedback route 合併顯示完成狀態與回饋，不加入多餘的 Continue confirmation，也不再次 complete Session：

```text
Brew Complete
 ↓
Quick Taste Feedback
 ↓
existing Decision / adjustment flow
```

Quick Taste Feedback 沿用 Milestone 6 vocabulary，並且至少選擇一項即可送出；Overall Rating 仍 optional。詳細 Sensory Feedback、Flavor Tags 與 Notes 收合在 optional disclosure，預設關閉。收合只屬於 presentation state，不能清除已輸入的值，也不成為 persisted domain state。

Feedback 必須綁定這個 completed Session。Retry 沿用既有 conflict-safe historical snapshot persistence；已有 Feedback 時顯示既有 Decision／adjustment recovery 狀態，不重新呈現空白表單。這個流程不建立第二個 Session、不 clone 或 mutation Brew Plan，並保留 History 與 Coffee Detail 的既有 recovery links。

Milestone 6 不提供 Actual Brew correction。Milestone 5 的 session-level dose、water 與 temperature fields 目前由 Brew Plan 初始化，不視為 independently measured deviations；Milestone 8.3 不再建立 per-step actual timing/water。Correction 保留為 future/backlog。

---

## 8.5 Continue Dial-in

如果上一杯需要調整：

```text
Taste Feedback
 ↓
Inferred Adjustment Direction(s)
 ↓
User chooses ONE direction if needed
 ↓
Candidate Adjustment Strategies
 ↓
Dialed recommends one candidate
 ↓
User chooses ONE candidate
 ↓
Persist Adjustment Decision
 ↓
End Milestone 6
```

例如：

```text
Previous:
Too Sour
Sweetness Low

Desired direction:
Increase extraction

Candidate strategies:
- Grind finer
- Increase water temperature

User selection:
Grind finer

Selected intent:
Grind finer

Adjustment Decision status:
Pending
```

Candidate Catalog v1 只允許 grind、temperature 與 water intent。Agitation、pour structure、brew time、recipe、dose、ratio 與其他 parameters 都不是 executable MVP candidates。這個 milestone 不核准 exact grind amount、temperature delta、water delta、brew-time threshold 或 context-ranking threshold；magnitude resolution 屬於 Milestone 7。

Strength direction 固定 dose：`increase_strength` 使用 lower water，`decrease_strength` 使用 higher water，ratio 是衍生值而不是獨立 candidate parameter。

---

# 9. Adjustment Decision

Taste Feedback 不直接轉換為 brewing-variable command。中間必須先產生 likely Adjustment Direction，必要時讓使用者決定優先改善方向，再產生 candidates。

Adjustment Decision 必須持續存在於：

- My Coffee Detail
- Dial-in Thread
- Milestone 7 Create Next Brew Plan Flow

標準 Dial-in adjustment 的核心規則是：

> **一次只改變 ONE 個 primary brewing variable，其他參數在實務可行範圍內維持不變。**

目的不是一次猜中最佳答案，而是進行 controlled experiment，讓下一杯能判斷這一項改變是否改善結果。

完整互動概念：

```text
Brew
 ↓
Taste Feedback
 ↓
Inferred Adjustment Direction(s)
 ↓
User selects ONE direction if needed
 ↓
Candidate Adjustment Strategies
 ↓
Dialed ranks and recommends one
 ↓
User selects ONE valid strategy
 ↓
Persist Adjustment Decision
 ↓
End Milestone 6
```

Adjustment terminology：

- Inferred Adjustment Directions：根據 feedback 提出的 likely directions；是 guidance，不是 diagnosis。
- Selected Adjustment Direction：使用者在這輪選擇優先改善的 ONE direction。
- Candidate Adjustment Strategies：可以朝該方向移動的有效 one-variable choices。
- Recommended Adjustment：Dialed 排名最高、預先建議的 candidate。
- Selected Adjustment：使用者實際選擇、由 Milestone 7 套用到下一個 Brew Plan 的 candidate。

例如希望 Increase extraction 時，Candidate Catalog v1 提供 Grind finer（recommended）與 Increase water temperature（alternative）。Dialed 預選 recommended candidate，但使用者可以選擇另一個 valid candidate；Milestone 7 的 Next Brew Plan 只能套用選定的那一項 primary-variable change。

Historical Adjustment Decision 必須 snapshot：

- 當時呈現的 inferred directions
- selected direction
- interpretation / rule version
- Dialed recommended candidate
- user-selected candidate
- candidate evidence / knowledge version
- lifecycle status

不需要持久化所有未選 alternatives。

Candidate snapshots 保存 change intent，而不是上一個值或下一個 exact value。M7 才根據 selected candidate 與當時 Plan resolve magnitude。

有 executable candidate 的 non-hold decision 在 Milestone 6 結束時為 `pending`；Milestone 7 產生 Next Brew Plan 後轉為 `applied`。Hold decision 使用 terminal `held`，不建立 fake no-op candidate；有效 direction 若尚無 reviewed executable candidate，使用 terminal `unsupported`。

## 9.1 Milestone 7 v1 Adjustment Magnitude

Milestone 7 使用 `adjustment-magnitude-v1` 將 persisted `selected_candidate` intent 解析成 exact Next Brew Plan value；它不重跑 Feedback Interpretation、Candidate ranking 或 starting-point Recommendation Engine。

Canonical qualitative grind scale 依序為：

```text
fine → medium-fine → medium → medium-coarse → coarse
```

- `grind / finer` 向 `fine` 移動剛好一個相鄰 level。
- `grind / coarser` 向 `coarse` 移動剛好一個相鄰 level。
- 只有 exact canonical value 可以自動調整；任意文字、`fine + finer` 與 `coarse + coarser` 都不可套用。
- 不推測 grinder clicks、不做 fuzzy matching，也不自動改選 alternative candidate。

Temperature magnitude 固定為：

- `temperature / higher` → `+1°C`
- `temperature / lower` → `-1°C`

Strength magnitude 固定 coffee dose，使用 source Plan persisted ratio 作 baseline：

- `water / lower` → `ratio - 1.0`
- `water / higher` → `ratio + 1.0`
- `new water = coffee dose × new ratio`，並持久化 new ratio 與 new water。

這個規則不把全產品的 ratio 改成 derived field；它只定義 M7 water adjustment。若 source water 與 ratio 已不一致，M7 不回寫或修復 historical source Plan，而是仍以 stored ratio 計算 new ratio、以 stored water 作 cumulative Pour target rescaling baseline。

Water adjustment 將所有 Pour step 的 absolute cumulative `target_water` 乘以 `new water / old water`，各 target 先 round 到 `0.1g`，最後一個 Pour 再強制等於 new total water。Wait step、step order/type、timing、duration、notes 與 Recipe structure 不變。

任何 selected Candidate 若無法產生 distinct、合法的新值，resolution 必須失敗：不建立 Plan、不建立 steps、不 clamp、不切換 Candidate，Decision 保持 `pending`。

成功時從 previous Brew Plan snapshot 建立同一 Dial-in Thread 內的新 Plan，設定 `parent_plan_id` 與 `based_on_session_id`，並使用 `previous_brew_adjustment` recommendation source。Generated Plan 在第一個 Brew Session 前仍可編輯；明確手動編輯沿用既有 `manual` source 行為。若使用者在第一杯前編輯，MVP history 保存 selected adjustment intent 與最終 persisted Plan，不另存或重建 edit 前的 exact generated values。

Feedback terminal page 是 Milestone 7 的入口。Persisted pending Decision 顯示 primary `Continue Dial-in` 與既有 `Done`；Continue 套用 selected candidate 後導向 generated Brew Plan review，不自動開始 Brew Session。Applied Decision 再次載入時顯示 `View Brew Plan`，並使用 `applied_brew_plan_id` 導向同一個既有 Plan，不重新 resolve 或建立另一個 Plan。Held 與 unsupported Decision 不顯示 Continue。

Expected magnitude boundary／compatibility failure 留在 terminal page，以 friendly explanation 呈現，Decision 保持 pending。Unexpected server failure 可重試；UI pending state 會停用重複送出，而 correctness 仍由 atomic RPC idempotency 保證。

Recipe / method switching 通常同時改變多個沖煮條件，因此不屬於標準 one-variable adjustment。切換 Recipe Template 或 brewing framework 應視為建立不同 baseline / Brewing Strategy，再從該起點繼續學習。

目前 PRODUCT 不決定 method switching 是否必須建立新的 Dial-in Thread。Dial-in Thread 目前以 `Coffee + Taste Goal` 定義，但 method switch 會重設 baseline；這項 identity / continuity 問題保留為待定決策，不得由 implementation 靜默決定。

下一次使用者可以：

### Continue Dial-in

Milestone 7 讀取 pending decision，使用已選定的 ONE candidate 產生下一個 Brew Plan。

### Brew Again

完全照上一杯：重用同一份 immutable Brew Plan，建立新的 Brew Session。Brew Again 不複製一份相同 Plan。

## Milestone 8 Brew History

History 的主要結構是 `Coffee → Dial-in Thread → Brew attempts`，其中一個 Brew attempt 就是一個 Brew Session。Thread 內 attempts 依 `started_at` oldest-to-newest 呈現，`Brew #N` 只是在該 Thread 內即時計算的閱讀順序，不持久化，也不代表 parent-child lineage。同一 immutable Plan 被重複沖煮時，每個 Session 都是獨立 attempt，可標示 `Same plan as previous brew`，但各自的 Feedback 與 Decision 不得合併。

Coffee 與 Thread 依 child records 推導出的 latest activity newest-first 排序，不使用 `dial_in_threads.updated_at` 或 `dial_in_threads.status` 宣告 UX current state。沒有 Session 的初始 Plan 或 adjustment Plan 以獨立的 `Brew Plan ready`／`Next brew ready` 顯示，不建立假的 attempt。

每個 attempt 顯示 persisted Brew Plan snapshot 的 dose、water、ratio、temperature、grind 與 target time；歷史 recipe 行為與 steps 也只能來自 Plan snapshot，不可用目前 Recipe Template 重建。`brew_plans.recipe_template_id` 可以 bulk-load 目前可存取的 template name 作為 identity label，但這不是 brew-time name/version snapshot；無法解析時回退為 `Brew Plan`。目前 official Recipe Templates 對一般 client 沒有 insert/update policy，但 History correctness 仍不依賴 template immutability。

Session 只呈現真正 persisted 的 actual duration 等 measured data，不把 Guided Brew 初始化的 dose、water 或 temperature 稱為 actual。Feedback 顯示 quick feedback、optional rating、sensory、flavor tags 與 notes。Adjustment history 顯示 recommended candidate、selected candidate、Decision status 與 causal applied Plan link，不揭露 raw JSON、knowledge version 或 evidence classification。

若 applied Plan 後來被手動編輯而 `recommendation_source = manual`，History 顯示 `Adjusted plan was edited before brewing`；產品只保證 selected adjustment intent 與最終 persisted Plan，不推測 edit 前 generated exact values。Branching 仍以 `applied_brew_plan_id` 與 `based_on_session_id` 綁回正確 source Session，時間軸不暗示 fake linear chain。

History 沿用既有 recovery actions：Give Feedback、Choose Adjustment、Continue Dial-in、Review Next Brew 與 Review Brew Plan。DB-only `brewing` 只顯示 `Brew in progress`，不推測可 Resume；aborted attempt 顯示 `Stopped` 且不提供 Feedback。Completed、held、unsupported 與適當的 aborted attempt 可使用 `Brew Again` 回到同一 `/brew/{planId}` review，再由既有 Start Brewing flow 為同一 Plan 建立新的 Session；History 本身不 mutation、不 clone Plan、不建立 Thread，也不重跑 Recommendation。

### Try Another Direction

重新選 Taste Goal，開始新的 Dial-in Thread。

---

# 10. Main Screens

MVP：

1. Home
2. My Coffee List
3. Add / Edit Coffee
4. My Coffee Detail
5. Taste Goal
6. Brew Plan
7. Guided Brew
8. Brew Complete / Feedback
9. Adjustment Decision
10. Brew History

Bottom Navigation 初期：

```text
Home
Coffee
History
```

Brew 是 Action，不是 Navigation Destination。

Settings / Profile 放置於 secondary navigation。

---

# 11. Home

Home 核心問題：

> **今天要沖哪包咖啡？**

主要顯示：

```text
My Coffee

Ethiopia Sidama
[Brew]

Kenya Nyeri
[Brew]
```

另外顯示未完成的 Dial-in：

```text
Continue Dial-in

Ethiopia Sidama
Sweet + Clean

Last Brew ★★★
Too Sour

Next:
Grind slightly finer

[Continue]
```

Continue Dial-in 是快速入口，但不強迫使用者延續昨天的 Taste Goal。

Home 保持 Coffee-first，只為每個有待處理工作的 Thread 顯示一個 compact recovery shortcut。若同一 Thread 還有其他 actionable items，Home 必須指出尚有其他工作並導向 Coffee Detail；不在 Home 複製完整 Thread history。

---

# 12. My Coffee Detail

主要內容：

- Bean Information
- Brew This Coffee
- Active Dial-in Threads
- Best Brews
- Brew History

例如：

```text
Ethiopia Sidama
Washed · 74158 · Light

[Brew This Coffee]

Current Dial-in

Sweet + Clean
Last ★★★
Next: Grind finer

[Continue]

Best Brews

Sweet + Clean ★★★★★
Juicy + Bright ★★★★
```

Coffee Detail 是單一 Coffee 的 canonical recovery hub。`Current Dial-ins` 由 Plan、Session、Feedback 與 Decision 的 persisted facts 推導，可同時呈現多個 actionable items，並以既有 Brew Plan／Feedback routes 恢復流程；卡片本身不直接套用 adjustment。Thread 的 `status` 與 `updated_at` 不作為 current action truth。

---

# 13. P0 — MVP

必须：

- My Coffee management
- Bean Profile
- Taste Goal
- Recipe Templates
- Rule-based Recommendation
- Brew Plan generation
- Guided Brew Timer
- Plan vs Actual timing
- Quick Taste Feedback
- Detailed Feedback optional
- Brew History
- Brew Again
- Adjustment Decision
- Dial-in Thread
- V60-only brewing support
- Email authentication

---

# 14. P1

### Better Recipe Management

- Custom Recipe
- Favorite Recipe
- Recipe Editing
- Recipe Sharing

### Better Dial-in

- Compare Brew #1 / #2 / #3
- Goal Achievement
- Favorite Brew
- Adjustment History

### Preference Analytics

分析：

- Origin
- Region
- Process
- Roast
- Sensory Preference

---

# 15. Future — Community

Community 優先定位為：

> **Community Knowledge Base**

而不是 Social Network。

使用 Bean Profile 找類似玩家的 Brew Plans。

匹配方式逐步放寬：

```text
Highly Relevant

Region
+ Variety
+ Process
+ Roast
```

↓

```text
Similar

Region
+ Process
+ Roast
```

↓

```text
Broader Reference

Origin
+ Process
+ Roast
```

Roaster 為額外 Ranking Signal。

可以依：

- Similar Bean
- Same Taste Goal
- Highest Rated
- Most Brewed
- Similar Taste Profile

排序。

Community Brew Plan：

```text
View
 ↓
Use This Plan
 ↓
Create My Brew Plan
```

MVP Community 不做：

- Feed
- Follow
- DM
- Social Network mechanics

---

# 16. Future — Personalization

累積足夠資料後建立 Taste Profile。

Recommendation 演進：

```text
Generic Rules
 ↓
Community Data
 ↓
Personal History
 ↓
Personalized Recommendation
```

---

# 17. Future — AI Brewing Coach

AI 不屬於 MVP。

AI 未來取得：

- Bean Profile
- Taste Goal
- Brew Plan
- Actual Brew Session
- Taste Feedback
- Dial-in History
- Personal Taste Profile
- Community Data

然後回答：

> 根據這支豆過去幾杯的結果與你的偏好，下一杯應該怎麼調？

AI 的價值不是 Random Recipe Generator。

而是：

> **Context-aware Personalized Brewing Coach**

---

# 18. Future

- Recipe Sharing URL
- Preference Sharing
- Multilingual Coffee Preference Card
- Bluetooth Scale
- Automatic Weight Tracking
- Flow Rate
- Brew Curve
- Immersion Recipe Template
- Native App if hardware integration becomes important

---

# 19. Out of Scope — MVP

暫時不做：

- AI
- Social Feed
- Follow / DM
- Bluetooth Scale
- Flow Rate
- Grinder precise click mapping
- Radar Chart
- Multilingual ordering mode
- Native iOS / Android
- Equipment Profile / Equipment Management
- Brewers other than V60
- General-purpose offline database

第一版產品形式：

> **Responsive Web + PWA**

---

# 20. MVP Success Question

最重要的驗證不是：

> 使用者願不願意記錄咖啡？

而是：

> **使用者準備沖一支豆時，是否願意告訴產品今天想喝什麼風味，使用推薦 Brew Plan，並在沖完後回來調整下一杯？**

核心成功 Loop：

```text
Choose Coffee
→ Taste Goal
→ Brew Plan
→ Brew
→ Feedback
→ Adjust
→ Brew Again
```
