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
Adjustment Suggestion
```

## Continue Dial-in

```text
My Coffee
    ↓
Existing Dial-in Thread
    ↓
Previous Feedback
    ↓
Desired Adjustment Direction
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

> **針對同一包 Coffee + 一組 Taste Goal，持續逐杯調整的一連串實驗。**

例如：

```text
Ethiopia Sidama

Dial-in A
Sweet + Clean

Brew #1
★★★
Too Sour

↓ Grind finer

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

例如：

```text
              Plan      Actual

Bloom         00:00     00:00
Water         40g       42g

Second        00:40     00:44
Water         120g      123g

Final         01:20     01:29

Finish        02:20     02:37
```

系統優先自動記錄時間。

Actual Water、Temperature 等需要額外操作的資訊，可以沖完後再補。

---

## 5.9 Taste Feedback

沖煮後記錄結果。

### Quick Feedback

- Overall Rating
- Pretty Good
- Too Sour
- Too Bitter
- Too Weak
- Too Strong
- Astringent

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

---

## 8.4 Complete Brew

完成後：

```text
Brew Complete
 ↓
Quick Taste Feedback
```

Actual Brew Data 與詳細 Sensory Feedback 都可以 Optional 展開。

---

## 8.5 Continue Dial-in

如果上一杯需要調整：

```text
Taste Feedback
 ↓
Desired Adjustment Direction
 ↓
Candidate Adjustment Strategies
 ↓
User chooses ONE
 ↓
Next Brew Plan
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
- Increase agitation / adjust pour structure

User selection:
Grind finer

Grind
Medium-fine
↓
Slightly finer

Everything else unchanged
```

---

# 9. Adjustment Suggestion

Taste Feedback 的結果不是一次性提示。

Adjustment Suggestion 必須持續存在於：

- My Coffee Detail
- Dial-in Thread
- Create Next Brew Plan Flow

標準 Dial-in adjustment 的核心規則是：

> **一次只改變 ONE 個 primary brewing variable，其他參數在實務可行範圍內維持不變。**

目的不是一次猜中最佳答案，而是進行 controlled experiment，讓下一杯能判斷這一項改變是否改善結果。

完整互動概念：

```text
Brew
 ↓
Taste Feedback
 ↓
Desired Adjustment Direction
 ↓
Candidate Adjustment Strategies
 ↓
Dialed ranks and recommends one
 ↓
User selects ONE valid strategy
 ↓
Next Brew Plan
```

Adjustment terminology：

- Desired Adjustment Direction：根據 feedback 判斷下一杯希望移動的方向。
- Candidate Adjustment Strategies：可以朝該方向移動的有效 one-variable choices。
- Recommended Adjustment：Dialed 排名最高、預先建議的 candidate。
- Selected Adjustment：使用者實際選擇、會套用到下一個 Brew Plan 的 candidate。

例如希望 Increase extraction 時，Grind finer、Increase water temperature、Increase agitation / adjust pour structure 都可能是候選。Dialed 可以排序並推薦其中一個，但使用者可以選擇另一個有效策略；Next Brew Plan 只能套用選定的那一項 primary-variable change。

Recipe / method switching 通常同時改變多個沖煮條件，因此不屬於標準 one-variable adjustment。切換 Recipe Template 或 brewing framework 應視為建立不同 baseline / Brewing Strategy，再從該起點繼續學習。

目前 PRODUCT 不決定 method switching 是否必須建立新的 Dial-in Thread。Dial-in Thread 目前以 `Coffee + Taste Goal` 定義，但 method switch 會重設 baseline；這項 identity / continuity 問題保留為待定決策，不得由 implementation 靜默決定。

下一次使用者可以：

### Continue Dial-in

檢視 recommended adjustment 與其他有效候選，選擇 ONE 個 strategy 產生下一個 Brew Plan。

### Brew Again

完全照上一杯。

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
9. Adjustment Suggestion
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
- Adjustment Suggestion
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
