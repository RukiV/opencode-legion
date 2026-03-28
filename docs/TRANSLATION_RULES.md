# 翻譯規定 / Translation Rules

## 術語保留規則

### Shadow 術語不翻譯

在翻譯過程中，**"Shadow"** 一詞應保持原文，不翻譯為中文。

| 原文 | 錯誤翻譯（禁止使用） |
|------|---------------------|
| Shadow | 影子、暗影、陰影、暗、黑影、幽影 |
| Shadow Agent | 影子代理、暗影代理、陰影代理 |
| Shadow Agents | 影子代理、暗影代理、陰影代理 |

#### 原因說明

1. **專案特定術語**：在本專案中，"Shadow" 作為專案的核心概念（如 Shadow Agents、Shadow Army 等），具有特定的技術含義
2. **品牌一致性**：保持原文可確保跨語言的一致性與可識別性
3. **術語準確性**：中文翻譯無法準確表達其在程式碼架構中的語義

#### 翻譯原則

- **Shadow** → 保持原文（如：Shadow Monarch、Shadow Army）
- **Shadow Agent** → 保持原文（單數）
- **Shadow Agents** → 保持原文（複數）
- **Shadow Sub Agent** → 保持原文
- **Shadow Sub Agents** → 保持原文

#### 適用範圍

- 程式碼中的變數名稱、函式名稱、類別名稱
- 專案文件中的章節標題、專有名詞
- 註解中的專案術語
- README 及開發文檔

#### 範例

```typescript
// ✅ Correct / 正確
const shadowMonarch = "Shadow Monarch";
shadowAgents.forEach(agent => agent.invoke());
const shadowAgent = getShadowAgent("beru");
const shadowAgents = listAllShadowAgents();

// ❌ Incorrect - DO NOT translate
// const 影子君主 = "Shadow Monarch";
// 暗影Agents.forEach(agent => agent.invoke());
// 影子代理 = getShadowAgent("beru");
// 暗影代理列表 = listAllShadowAgents();
```

```markdown
# ✅ Correct / 正確
## Shadow Agents 運作機制
## 召喚 Shadow Army
## Shadow Agent 設定

# ❌ Incorrect - DO NOT translate
<!-- ## 影子代理運作機制 -->
<!-- ## 召喚暗影軍團 -->
<!-- ## 暗影代理設定 -->
```

---

## 其他專案術語

如有其他類似需要保持原文的術語，將陸續補充於此文件。
