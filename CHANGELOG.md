# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.1.25](https://github.com/bluelovers/opencode-arise/compare/@bluelovers/opencode-arise@0.1.24...@bluelovers/opencode-arise@0.1.25) (2026-04-03)



### ✨　Features

* **config:** 重構 provider 類型並新增快取統計與免費模型功能 ([02d3702](https://github.com/bluelovers/opencode-arise/commit/02d3702c23665b3c661c2f9c1a1533e2cad79add))
* **event-handler:** 為事件處理器增加日誌輸出並報告模型名稱 ([87913c3](https://github.com/bluelovers/opencode-arise/commit/87913c34bf682f222d56aff1daf5d2ae91970c99))
* **tools:** ARISE_GIT_SUMMARY 新增 cwd 參數支援指定目標目錄 ([82cc99e](https://github.com/bluelovers/opencode-arise/commit/82cc99e00751ecdd14fa1a4d88b17a237dbd7ccf))
* **types:** 新增 EnumOpenCodeEventType 列舉並替換字串值 ([4db2af2](https://github.com/bluelovers/opencode-arise/commit/4db2af20a8c1c6d8fd28ca599053d00b1e760e6e))


### 📦　Code Refactoring

* **config:** 重構 provider 歷史記錄結構並分離 session cache ([135b36a](https://github.com/bluelovers/opencode-arise/commit/135b36a389283b945f825137426e2bcdc18a8e67))
* **tools:** 依 EnumAriseTools 命名重命名工具檔案並更新所有引用 ([e61b44f](https://github.com/bluelovers/opencode-arise/commit/e61b44fada6cf0804cd65165faaacc3da7d52556))
* **utils:** 將 git-summary 輸出改為 markdown code block 格式 ([ac82b3d](https://github.com/bluelovers/opencode-arise/commit/ac82b3d86281c2e6f6ee3af6e2856ac5423bfcd1))


### 🚨　Tests

* **api:** 新增 API 供應商測試資料 fixture 檔案 ([f30cf02](https://github.com/bluelovers/opencode-arise/commit/f30cf02e91b07e41eb4a86e635b7346764aa0704))



## [0.1.24](https://github.com/bluelovers/opencode-arise/compare/@bluelovers/opencode-arise@0.1.23...@bluelovers/opencode-arise@0.1.24) (2026-04-03)


### BREAKING CHANGES

* **config:** ProvidersCache 介面重新命名為 IProvidersCache



### ✨　Features

* **config:** 新增 model cache 歷史記錄功能 ([54aeb6c](https://github.com/bluelovers/opencode-arise/commit/54aeb6cfe49522c9e98aef78b6dcfd1c4324f899))


### 📦　Code Refactoring

* **agents:** 使用 composePrompt 重構 Shadow Agents prompts 結構 ([2f7b512](https://github.com/bluelovers/opencode-arise/commit/2f7b512811ba0c9da2d576fdafbbc1957ef5e8bf))
* **agents:** 使用 composePrompt 重構 TANK_PROMPT 為結構化格式 ([cce30aa](https://github.com/bluelovers/opencode-arise/commit/cce30aa19ceb5c6fffddbd6bd65276cc27bee6b7))
* **agents:** 使用 composePrompt 重構 Shadow Agents prompts 結構 ([0dc7d4a](https://github.com/bluelovers/opencode-arise/commit/0dc7d4a711d868686cdbde7e3c2ed5a5b2d03c13))
* **tools:** 新增除錯日誌追蹤背景任務與代理召喚流程 ([b1dea49](https://github.com/bluelovers/opencode-arise/commit/b1dea49ac7f688cd80713e8981ef5b690c050d6a))


### ♻️　Chores

* **agents:** 新增測試說明註解提示如何產生 prompt 快照 ([66f7f61](https://github.com/bluelovers/opencode-arise/commit/66f7f618c8352e725e06b07a4d6d61ec5eeed7b4))



## [0.1.23](https://github.com/bluelovers/opencode-arise/compare/@bluelovers/opencode-arise@0.1.21...@bluelovers/opencode-arise@0.1.23) (2026-04-02)



### ✨　Features

* **agents:** 新增 Esil Radiru 聊天模式代理與權限 enum ([a583051](https://github.com/bluelovers/opencode-arise/commit/a5830514eb3c156b4750938d94277ce03d7462e2))


### 📦　Code Refactoring

* **agents:** 強化 Bellion prompt 為策略架構規劃專家定位 ([a2ec55c](https://github.com/bluelovers/opencode-arise/commit/a2ec55cb8b7f7dcd76c678b8279ce07cd8461ab0))



## [0.1.21](https://github.com/bluelovers/opencode-arise/compare/@bluelovers/opencode-arise@0.1.20...@bluelovers/opencode-arise@0.1.21) (2026-04-02)



### ✨　Features

* auto-resume 增加通知與日誌輸出，todo-enforcer 增加日誌 ([17870d7](https://github.com/bluelovers/opencode-arise/commit/17870d7fcdb490d29792e8eed4cb33722045c1b2))
* **tools:** 新增 arise_git_summary 工具 ([0ad1f9c](https://github.com/bluelovers/opencode-arise/commit/0ad1f9c30bf1fdd8d65776d6af13d379311e4a01))


### 📦　Code Refactoring

* **agents:** 集中管理 Shadow Agent prompts 並優化 Beru 提示詞 ([2c13e3b](https://github.com/bluelovers/opencode-arise/commit/2c13e3b7a837374ca264633047f412eea0f6b202))


### 📚　Documentation

* 更新 Zod 規則、AGENTS.md 與工作流程文件 ([bfa51ab](https://github.com/bluelovers/opencode-arise/commit/bfa51ab1765461940adebb344455a0852ca858e9))


### 🚨　Tests

* **high-load:** 新增 Provider/rate-limited 錯誤偵測測試並重構為 fixtures ([75e898f](https://github.com/bluelovers/opencode-arise/commit/75e898f7ad7fde143cb27fab2c2af5a403f09016))


### ♻️　Chores

* Number of recent commits to show (default: 10) ([452709a](https://github.com/bluelovers/opencode-arise/commit/452709adbfc407dec9424e07ed9660c29f69f32f))



## [0.1.20](https://github.com/bluelovers/opencode-arise/compare/@bluelovers/opencode-arise@0.1.18...@bluelovers/opencode-arise@0.1.20) (2026-04-01)


### BREAKING CHANGES

* **types:** 集中管理常量并增强模型处理



### ✨　Features

* **config:** 调整schema格式并添加安全提示默认值 ([6e65988](https://github.com/bluelovers/opencode-arise/commit/6e65988864f0e2f2d3fd7e06d66d649bd46a59fd))
* **debug:** 增强强制日志输出并重构选项处理 ([9ae8e16](https://github.com/bluelovers/opencode-arise/commit/9ae8e1639da6bf23f21ded211aaa2782ec4467a0))
* **debug:** 添加启动版本日志与强制输出功能 ([dde6e56](https://github.com/bluelovers/opencode-arise/commit/dde6e5627e7160e7ff24804d586031a66757f24d))
* **tools:** 检测高负载错误并增加重试延迟 ([1d4beca](https://github.com/bluelovers/opencode-arise/commit/1d4becaa6b8ae5906d769e2fded084476cd5c8f8))


### 📦　Code Refactoring

* **config:** 统一JSON Schema属性与Zod链式调用顺序 ([90aec06](https://github.com/bluelovers/opencode-arise/commit/90aec0658c1fd2d735b6b35f9f0cea8bb86374ab))
* **enums:** 以 EnumLogLevel 統一取代 EnumAriseMsgLogLevel ([bd242fb](https://github.com/bluelovers/opencode-arise/commit/bd242fb7f881686df43eefd3140cda61c8cdf4af))
* **enums:** 以 enum 取代字串字面值，提升型別安全 ([7d2b4d4](https://github.com/bluelovers/opencode-arise/commit/7d2b4d420a036b73d3936e1946842c6089f093b9))
* **types:** 集中管理常量并更新导入路径 ([cd6b1e2](https://github.com/bluelovers/opencode-arise/commit/cd6b1e27836ac4fcf93b9e2cbb6c8a024e4299ce))
* **types:** 集中管理常量并增强模型处理 ([000925c](https://github.com/bluelovers/opencode-arise/commit/000925ca6a169d2edb113bef72deaddb8d0571aa))
* **zod:** 新增 Zod 语法链结顺序规则并重构类型守卫 ([646ba75](https://github.com/bluelovers/opencode-arise/commit/646ba75335a30c8bcd6c7ddd66548c30ecc5b51d))


### 📚　Documentation

* 記錄暗影召喚方式對比並更新工具描述 ([5e428d7](https://github.com/bluelovers/opencode-arise/commit/5e428d7ba004aa145deb3859ef600b62c7d73486))
* **agents:** 改进工具描述以提高清晰度和准确性 ([a190a79](https://github.com/bluelovers/opencode-arise/commit/a190a792950f89b6f24e6e56fea219a15b8861e0))


### 🔖　Miscellaneous

* . ([0b35e6b](https://github.com/bluelovers/opencode-arise/commit/0b35e6b9a1f700daf2f3fdf3e360307a11c622fc))



## [0.1.18](https://github.com/bluelovers/opencode-arise/compare/@bluelovers/opencode-arise@0.1.16...@bluelovers/opencode-arise@0.1.18) (2026-03-31)



### ✨　Features

* **auto-resume:** 新增 safety_prompt 安全檢查提示功能 ([2914743](https://github.com/bluelovers/opencode-arise/commit/2914743145d7355b51167031dfa98bbd8ea39b95))


### 📦　Code Refactoring

* 新增 EnumReasoningEffort 並使用 BackgroundTaskStatus 替换字串 ([6230f2f](https://github.com/bluelovers/opencode-arise/commit/6230f2f9a55940f9e00285b02f9c60f6fcfd7fc6))
* **arise-message:** 使用 utility functions 統一訊息格式化 ([c0e81ab](https://github.com/bluelovers/opencode-arise/commit/c0e81ab7dd99ad85ab6a04f4679d43305eaaa5da))
* **background-manager:** 移除 getter 參數，改為公開 API 方法 ([38bc89b](https://github.com/bluelovers/opencode-arise/commit/38bc89be90c7abe1e8f1ad9f19c7a4ddb1e040cf))
* **background-manager:** 重構 BackgroundTaskStatus 為 enum 並更新 shouldAutoResume 註解 ([19447ef](https://github.com/bluelovers/opencode-arise/commit/19447efde0b3dc7daf337ff73322783f138570aa))
* **background-manager:** 使用 getters.ts 的 getAutoResumeConfig 取代自訂實作 ([c3c30c6](https://github.com/bluelovers/opencode-arise/commit/c3c30c6ba75c5916f4b6b7008dd5767eb06901d4))
* **config:** update import path for zod-defaults module ([060a310](https://github.com/bluelovers/opencode-arise/commit/060a31042ba28b6666dd4a3a96bcf7b43b2b3012))


### 🛠　Build System

* **deps:** 更新依赖并添加工具脚本 ([e893770](https://github.com/bluelovers/opencode-arise/commit/e8937703d5e0aad85d488b97b15237fed0f6c19f))



## [0.1.16](https://github.com/bluelovers/opencode-arise/compare/@bluelovers/opencode-arise@0.1.15...@bluelovers/opencode-arise@0.1.16) (2026-03-31)



### ✨　Features

* **auto-resume:** 添加运行时控制参数以支持动态配置 ([f0bd3ff](https://github.com/bluelovers/opencode-arise/commit/f0bd3ff80c94057e0e73c087fbc1460bbcb5465a))
* **debug:** 添加调试控制模块与运行时工具 ([3f5bf5b](https://github.com/bluelovers/opencode-arise/commit/3f5bf5b357d58fc3820c0fdcb2fee87475379766))
* **msg:** 支持数组输入的消息格式化函数 ([52edbd2](https://github.com/bluelovers/opencode-arise/commit/52edbd2515025e897e93c7f70195037596b117db))
* **zod:** add zod schema helper utilities ([e5a0b36](https://github.com/bluelovers/opencode-arise/commit/e5a0b36ef583cac6e497af96199b3fac4b492f71))


### 📦　Code Refactoring

* **background-manager:** 添加详细的调试日志以支持自动恢复和任务生命周期跟踪 ([d41a576](https://github.com/bluelovers/opencode-arise/commit/d41a5765e8463eb6fd9fdaf11b607f584ba224f1))
* **config:** 更新导入路径以反映模块重新定位 ([d841a81](https://github.com/bluelovers/opencode-arise/commit/d841a810d200160b9727f05b01f003f0aaf1e662))
* **debug:** 统一日志记录方式，使用延迟执行优化性能 ([1907925](https://github.com/bluelovers/opencode-arise/commit/1907925312f9046b852d07f69548ee1eb088d0c0))
* **logging:** 改进日志输出，添加颜色与格式优化 ([0733a03](https://github.com/bluelovers/opencode-arise/commit/0733a03e315ab2bb56da23531306a209c1b785d9))
* **msg:** 统一消息前缀与格式化函数使用 ([6776e61](https://github.com/bluelovers/opencode-arise/commit/6776e612df1a63b0c1b631194c8a2234b463797e))
* **src:** 重構檔案結構，刪除 re-export 並移動檔案至適當目錄 ([28ab207](https://github.com/bluelovers/opencode-arise/commit/28ab20791aa2f024bdea15d244508cb92612253d))


### 📚　Documentation

* **background-manager:** 添加配置读取机制流程文档 ([0c33d6a](https://github.com/bluelovers/opencode-arise/commit/0c33d6a21ed8c71d625750d5ae4eaea4a5e181d2))
* **repo:** 添加中文README文档 ([4cecee2](https://github.com/bluelovers/opencode-arise/commit/4cecee211da9c4bb8251ca2b44c231531701bda2))



## [0.1.15](https://github.com/bluelovers/opencode-arise/compare/@bluelovers/opencode-arise@0.1.14...@bluelovers/opencode-arise@0.1.15) (2026-03-29)



### ✨　Features

* **cli:** 添加版本命令到cli ([f4c5452](https://github.com/bluelovers/opencode-arise/commit/f4c5452d4be9eda96673e934aee50bd1d1f6e973))



## [0.1.14](https://github.com/bluelovers/opencode-arise/compare/@bluelovers/opencode-arise@0.1.13...@bluelovers/opencode-arise@0.1.14) (2026-03-29)



### ✨　Features

* **config:** add JSON schema generation and auto‑resume support ([9984a31](https://github.com/bluelovers/opencode-arise/commit/9984a31b5f1a5e7eab0ca494680a6985a896cb2c))


### 📦　Code Refactoring

* **config:** 提取配置获取逻辑到独立模块 ([26beaa3](https://github.com/bluelovers/opencode-arise/commit/26beaa3c6b352d5febc5e1b98fc261f128add951))
* **config:** 自动生成配置默认值 ([1de3147](https://github.com/bluelovers/opencode-arise/commit/1de3147c79c981631fa250fe6755d903f287f0d1))
* **config:** improve type safety and add schema export tests ([d6f87d9](https://github.com/bluelovers/opencode-arise/commit/d6f87d9bc781659b73a22be37854937f008d78fa))
* **config:** improve type safety and cleanup ([cbd28ab](https://github.com/bluelovers/opencode-arise/commit/cbd28abd3df743fc9665287a6e133e9c5c65dc61))
* **zod:** 重组工具模块并整合类型守卫 ([b0b7e28](https://github.com/bluelovers/opencode-arise/commit/b0b7e282f043614811681780cfdcb3a05ee5f49c))


### 📚　Documentation

* 新增翻譯規定，保持 Shadow 術語原文不翻譯 ([d1b433a](https://github.com/bluelovers/opencode-arise/commit/d1b433ab39a2f479781720092b570b12a2694282))
* **agents:** 完善re-export规则与TS2459处理流程 ([ec1fb5c](https://github.com/bluelovers/opencode-arise/commit/ec1fb5c2b8ff11f39a4a78c375c29495809e4dcd))


### 🚨　Tests

* **zod:** add unified tests and dataset for zod defaults ([09ecbd1](https://github.com/bluelovers/opencode-arise/commit/09ecbd17ac72e83f24c9bef07dfaacfc4791280a))



## [0.1.13](https://github.com/bluelovers/opencode-arise/compare/@bluelovers/opencode-arise@0.1.12...@bluelovers/opencode-arise@0.1.13) (2026-03-28)



### ✨　Features

* **banner:** 在橫幅中顯示版本號 ([c60a80d](https://github.com/bluelovers/opencode-arise/commit/c60a80d8e6dcaaca29de065ed91e24e7cc4fb838))



## [0.1.12](https://github.com/moinulmoin/opencode-arise/compare/@bluelovers/opencode-arise@0.1.11...@bluelovers/opencode-arise@0.1.12) (2026-03-28)



### ✨　Features

* **schema:** 為 Zod schema 添加 .meta() 描述與 title ([119dea9](https://github.com/moinulmoin/opencode-arise/commit/119dea932bcaecffdc5859af94cb230f1571f64b))


### 📦　Code Refactoring

* **config:** 重構 DeepMerge 函式並新增 deepMerge3 ([7598a8c](https://github.com/moinulmoin/opencode-arise/commit/7598a8ccc474a4d3d1e6b3993aaa8837070d97ad))
* **schema:** 將 deepMerge3 選項改為 enableDeepMerge ([2dac4bc](https://github.com/moinulmoin/opencode-arise/commit/2dac4bca2ebe9da3c94e3054d2f111e5b178d293))



## [0.1.11](https://github.com/moinulmoin/opencode-arise/compare/@bluelovers/opencode-arise@0.1.10...@bluelovers/opencode-arise@0.1.11) (2026-03-28)


### BREAKING CHANGES

* **plugin:** 提取配置与事件处理逻辑至独立模块



### 🐛　Bug Fixes

* 將 AUTO 常數修正回 AUTO_MODEL ([a4bc32f](https://github.com/moinulmoin/opencode-arise/commit/a4bc32f0a4e9a48e0dc6eaaa748914db640a4b80))
* **constant:** 將 AUTO 值從 <auto> 改為 AUTO ([cc56538](https://github.com/moinulmoin/opencode-arise/commit/cc56538d2e8a6339038bddfbf758535d21bb5419))


### ✨　Features

* **model:** 支援 opencode-arise.json 中的模型配置 ([547e2e9](https://github.com/moinulmoin/opencode-arise/commit/547e2e9f8c275aadb1c0acfc44a04e40c0a93361))
* **test:** add mock file system environment for safe testing ([8d6b1f0](https://github.com/moinulmoin/opencode-arise/commit/8d6b1f072fe8dbe78899743d39964a579032e672))


### 📦　Code Refactoring

* **constants:** 移除 re-export 並更新引用 ([6858d83](https://github.com/moinulmoin/opencode-arise/commit/6858d83d369e77335c9a8aa96f6db1dae0231792))
* **constants:** 將 DEFAULT_MODEL 和 AUTO_MODEL 移至獨立的常數檔案 ([4cdefaa](https://github.com/moinulmoin/opencode-arise/commit/4cdefaa4644c18b9f3999cffc302bc07638e27c6))
* **model-resolver:** 標記 getEffectiveModel 為已棄用 ([7398913](https://github.com/moinulmoin/opencode-arise/commit/739891341d7d88a0847da5d241e730d8ff4cbd0c))
* **model-resolver:** 使用工具函式取代 === AUTO_MODEL 直接比較 ([abd03e2](https://github.com/moinulmoin/opencode-arise/commit/abd03e23fac15287b4e35cc0a362d1ac33c94f9e))
* **model-resolver:** 重構模型解析邏輯並更新 <auto> 為 AUTO ([e682c93](https://github.com/moinulmoin/opencode-arise/commit/e682c93690955856caa0388025df0a766355f6e7))
* **plugin:** add session event enum and update handler to use it ([d50ea5d](https://github.com/moinulmoin/opencode-arise/commit/d50ea5d77033e1256a63fca43b60301b5ae17268))
* **plugin:** 提取配置与事件处理逻辑至独立模块 ([e07804e](https://github.com/moinulmoin/opencode-arise/commit/e07804ecabc3a00ba3d0d56c675ea0d4e8bd9288))
* **types, plugin:** 重构类型系统并优化事件处理器 ([a9d399c](https://github.com/moinulmoin/opencode-arise/commit/a9d399c5089414d6b56d16359fa80d0949e2702a)), closes [#123](https://github.com/moinulmoin/opencode-arise/issues/123)
* **utils:** 建立 arise-message 工具模組並重構訊息格式化 ([6abfb5c](https://github.com/moinulmoin/opencode-arise/commit/6abfb5c52aad9dbd73d9686fae4ab0a103ce8592))


### 📚　Documentation

* **AGENTS:** 新增 JavaScript Git-Friendly Code Style 規則說明 ([981b444](https://github.com/moinulmoin/opencode-arise/commit/981b444333e1a741e5dd35382cef2821b04b72dd))


### 🚨　Tests

* add mock integration test for real directory scenarios ([cc20b8b](https://github.com/moinulmoin/opencode-arise/commit/cc20b8b203f792225ca1a7edd9aa1aeaca40311f))


### 🛠　Build System

* **deps:** 添加测试相关的依赖项 ([cac2e80](https://github.com/moinulmoin/opencode-arise/commit/cac2e80e8013993785ae07485e3e3a6ca081c0c4))



## [0.1.10](https://github.com/moinulmoin/opencode-arise/compare/@bluelovers/opencode-arise@0.1.9...@bluelovers/opencode-arise@0.1.10) (2026-03-26)



### 🐛　Bug Fixes

* **queue-utils:** 修復 parallelLimit 併發控制邏輯 ([c8e78eb](https://github.com/moinulmoin/opencode-arise/commit/c8e78eb62e9bf9fd190cf9100f6fb4b96a4763cd))


### ✨　Features

* **background:** 新增 auto-resume 功能與手動重試工具 ([191c7fc](https://github.com/moinulmoin/opencode-arise/commit/191c7fc6f242c4516fb834f44a8977b522e10dc1))
* **config:** 新增 configMergeDeep 深層合併工具函數 ([9b4c57c](https://github.com/moinulmoin/opencode-arise/commit/9b4c57cfda1b0803a0acd22ac46c6e1fb5590194))


### 📦　Code Refactoring

* **enums:** 整合所有枚舉至 types/enums.ts 並清理 re-export 檔案 ([8d0e4aa](https://github.com/moinulmoin/opencode-arise/commit/8d0e4aa5032c89eb5bf67bd80db312a6828cb5e3))
* **enums:** 更新引用至 enums.ts 並建立 shadow-names.ts 做為 re-export ([b2c8536](https://github.com/moinulmoin/opencode-arise/commit/b2c853689db017e542db75b66b008d223cdefdbc))
* **enums:** 將 shadow-names.ts 更名為 types/enums.ts ([9285714](https://github.com/moinulmoin/opencode-arise/commit/9285714f8712bd7d383378ba1be6b184c89f4ad8))
* **enums:** 整合 EnumOpencodeAgentMode 與 EnumOpencodeAgentPermission 至 shadow-names.ts ([909df99](https://github.com/moinulmoin/opencode-arise/commit/909df99efa83692d9d5387543b4985f4bdf222f2))
* **shadows:** 整合 SHADOW_DESCRIPTIONS 與 ARISE_TOOLS 至 shadows.ts ([a0ab2b6](https://github.com/moinulmoin/opencode-arise/commit/a0ab2b61cd4fa58ae75e049dd71fbcddd77675d4))
* **terms:** 更新術語 shadow soldier/soldier/shadow → shadow agent ([e3d6f3e](https://github.com/moinulmoin/opencode-arise/commit/e3d6f3ebaf70345acb0e14a0ad84a98b2e04fa21))


### 📚　Documentation

* **tools:** 新增 list-models.md 文件並更新相關 [@see](https://github.com/see) 參照 ([efca297](https://github.com/moinulmoin/opencode-arise/commit/efca297cb6a40e5b11e4cff84684d4122040959a))


### 🔖　Miscellaneous

* 新增會話恢復與佇列處理工具函數 ([53a9cc9](https://github.com/moinulmoin/opencode-arise/commit/53a9cc9ca389793dece7eecb3d94103aea2f8394))



## 0.1.9 (2026-03-22)


### BREAKING CHANGES

* 更新 AGENTS.md 配置文件與程式碼規範
* re-enable bun
* **tools:** centralize Arise tool definitions and refactor tool creation
* **test:** migrate from bun:test to Jest testing framework
* **config:** 新增 background.poll_interval 可配置輪詢間隔
* **utils:** rename Bun shim to FakeBun to prevent runtime conflicts
* **utils:** 移除 CONFIG_FILENAME 的匯入，若有使用請改從 config/paths 模組匯入
* **config:** extract home directory logic to dedicated function



### 🐛　Bug Fixes

* **config:** extract home directory logic to dedicated function ([8dc5340](https://github.com/moinulmoin/opencode-arise/commit/8dc5340832484ac22380bd55d6cc05123dc9097e))


### ✨　Features

* **config:** 新增 Providers 快取功能 ([9c8808e](https://github.com/moinulmoin/opencode-arise/commit/9c8808e0ac2575df52ea287420c9b6e2ce884142))
* **config:** 新增驗證命令並重構訊息處理工具 ([9c7690a](https://github.com/moinulmoin/opencode-arise/commit/9c7690a8e1777f474ce468d0aa5ba03c2b5451be))
* **config:** 重構插件檢測邏輯並新增 hasPlugin 函式 ([16cceb0](https://github.com/moinulmoin/opencode-arise/commit/16cceb005a6c8d352a1d3277e1172151d4a3c037))
* **config:** 新增 shadow agents 自動模型繼承功能 ([7c8505e](https://github.com/moinulmoin/opencode-arise/commit/7c8505eb00f22325dcd94b698be7c925577ee4ec))
* **config:** 新增重試延遲機制支援背景輪詢 ([6f2af4a](https://github.com/moinulmoin/opencode-arise/commit/6f2af4a6a20378ae320adb75f90ce26ac82617fb))
* **tools:** 新增 list-models 工具 ([9d8a99f](https://github.com/moinulmoin/opencode-arise/commit/9d8a99fac93e1977f25f152a4f9ee142e6e97047))
* **tools:** 允許在呼叫子代理時指定模型 ([76d4846](https://github.com/moinulmoin/opencode-arise/commit/76d4846a38c1a89b094db262ef86e71d76b958d5))
* **utils:** 建立 JSONC 讀寫器統一底層模組 ([74ad9e0](https://github.com/moinulmoin/opencode-arise/commit/74ad9e0a5dfb36007cd41a77ff93d0e153366b5c))


### 📦　Code Refactoring

* 抽離重複邏輯並建立 hook-names 模組 ([4f8773f](https://github.com/moinulmoin/opencode-arise/commit/4f8773fc3bc18023a15b43b6dc9159ffdbe13230))
* re-enable bun ([ac573c2](https://github.com/moinulmoin/opencode-arise/commit/ac573c261c4bd3c10af8946d7ef37f8bdb4ecf1a))
* **agents:** 強化 Shadow Agent 型別系統與命名規範 ([d46951e](https://github.com/moinulmoin/opencode-arise/commit/d46951e8d94d2a2b69ecf668553ad558f5f082e7))
* **config:** 重構插件檢測邏輯，抽離為通用工具函數 ([9ff2514](https://github.com/moinulmoin/opencode-arise/commit/9ff25144f40f68b756877f294612d5c5e3e6bd04))
* **config:** 新增 agent 特定的 poll_interval 支援 ([80994f9](https://github.com/moinulmoin/opencode-arise/commit/80994f9bf9122af1b9f6f94dc332d18fb3d342d2))
* **config:** 新增 background.poll_interval 可配置輪詢間隔 ([afa7c20](https://github.com/moinulmoin/opencode-arise/commit/afa7c20013395a8609ca2701609fc0736af100b7))
* **config:** extract default config creation logic to paths module ([1cb5c92](https://github.com/moinulmoin/opencode-arise/commit/1cb5c92d35dcac4892b49332df64812b0b25195d))
* **config:** extract configuration path logic to dedicated module ([57886b4](https://github.com/moinulmoin/opencode-arise/commit/57886b4720402f7c12a300cb62d067f5ffc8a658))
* **test:** 重構整合測試使用 ALL_ARISE_TOOLS ([8c60067](https://github.com/moinulmoin/opencode-arise/commit/8c6006757e0e4d84fec8fdd50623028f8f429b76))
* **test:** 抽離 parseJsonc 函數至共用模組 ([33010bd](https://github.com/moinulmoin/opencode-arise/commit/33010bd105187e5c13d28bd8346593f5e60c1cc7))
* **test:** 使用 __TEST_TEMP 統一測試路徑管理 ([c83e9ac](https://github.com/moinulmoin/opencode-arise/commit/c83e9acd284893f581020610e7dd49682ba47de2))
* **test:** migrate from bun:test to Jest testing framework ([9c6e544](https://github.com/moinulmoin/opencode-arise/commit/9c6e544deee045f6dd1c2f231094241031aa5083))
* **tools:** 重構工具建立函數使用 getAriseToolsConfigEntry ([717dae5](https://github.com/moinulmoin/opencode-arise/commit/717dae53bf1be62e8d8f61f56aa4b0694279f5e4))
* **tools:** 抽離模型解析邏輯為獨立工具函數 ([64a3770](https://github.com/moinulmoin/opencode-arise/commit/64a3770b461b7ec9e75ac9ffa0635cc4bd1b8113))
* **tools:** centralize Arise tool definitions and refactor tool creation ([9b4cee1](https://github.com/moinulmoin/opencode-arise/commit/9b4cee11973b3cd45d233e3fba979d0bc2d0e6ad))
* **utils:** 调整 bun-shim 模块导出结构 ([bce8418](https://github.com/moinulmoin/opencode-arise/commit/bce8418f50e613e0a379475eb77d92ecf4b001e4))
* **utils:** rename Bun shim to FakeBun to prevent runtime conflicts ([0469793](https://github.com/moinulmoin/opencode-arise/commit/04697931b6a99fb1193f5415736a97bea4b04a8f))
* **utils:** add Bun API shim for cross-platform file operations ([b577412](https://github.com/moinulmoin/opencode-arise/commit/b577412ecc08bcc90b975e7157fb092ce49639e7))


### 📚　Documentation

* 增進 AGENTS.md 規範 - 優化測試流程說明、命名技能與程式碼註解原則 ([a2c3b4d](https://github.com/moinulmoin/opencode-arise/commit/a2c3b4d34ec19045b68be75198a09324522e4627))
* 更新 AGENTS.md 配置文件與程式碼規範 ([b73f196](https://github.com/moinulmoin/opencode-arise/commit/b73f1969c0a6f8026547ef98a0e593dce4db3d60))
* **src:** 新增並更新主程式雙語註解 (繁體中文 + English) ([640787b](https://github.com/moinulmoin/opencode-arise/commit/640787bae2bef57bf1bc35ecce77a24506a5bd6c))
* **test:** 新增 Bun Test BUGs 文檔與 NO_COLOR 環境變數修復 ([b5f49c9](https://github.com/moinulmoin/opencode-arise/commit/b5f49c93ff873196b0fc8c7e9babf087cda7264b))
* **test:** 新增並更新測試程式雙語註解 (繁體中文 + English) ([da31ada](https://github.com/moinulmoin/opencode-arise/commit/da31adac8b1980d5277c1a1b2de04e4f2512cf7d))
* **types:** 新增 IValueNotPartial 與 ILazyConfigGetterValue 雙語註解 ([6f5e1ea](https://github.com/moinulmoin/opencode-arise/commit/6f5e1ea88a6abc4f3b6d79f489f9379e529c4776))


### 🚨　Tests

* **config:** simplify config path tests for safety and add testing guidelines ([74b363c](https://github.com/moinulmoin/opencode-arise/commit/74b363c6eff1d2a65081883cacd5bc6ea7e1d41c))
* **toMatchInlineSnapshot:** 新增 toMatchInlineSnapshot 壞字面量 BUG 測試 ([b6db427](https://github.com/moinulmoin/opencode-arise/commit/b6db4279f39619ead20a676556b86c7c8dc4cab3))
* **toMatchObject:** 新增 toMatchObject 與 expect.any() BUG 測試 ([5c12834](https://github.com/moinulmoin/opencode-arise/commit/5c1283481967bdf9b842c623d2e7e427eb463582))
* **tools:** 新增 AriseTools 枚舉完整性驗證測試 ([c1e6539](https://github.com/moinulmoin/opencode-arise/commit/c1e6539602f26437fba0e9cd060618835c5435f8))
* **utils:** add comprehensive unit tests for utility functions ([290497d](https://github.com/moinulmoin/opencode-arise/commit/290497d0eff8e4a8670064d0659086486bfdf983))


### 🛠　Build System

* 切換套件管理器從 Bun 至 pnpm 並更新相關配置 ([de4a00f](https://github.com/moinulmoin/opencode-arise/commit/de4a00fe40e1416ada619120b111965b4b4b1c3f))


### ♻️　Chores

* **config:** 新增發布自動化腳本並優化專案配置結構 ([cd3d04b](https://github.com/moinulmoin/opencode-arise/commit/cd3d04beaaf185593b45916cb01510ae5e106610))
* **config:** update TypeScript configuration and type checking setup ([a693dd4](https://github.com/moinulmoin/opencode-arise/commit/a693dd47c15bea5818469ddf0bbdd059b547e138))
* **deps:** 更新 pnpm-lock.yaml ([94902bc](https://github.com/moinulmoin/opencode-arise/commit/94902bc9701aa0f683b0f0600ddfca25258b9070))


### 🔖　Miscellaneous

* . ([97ed983](https://github.com/moinulmoin/opencode-arise/commit/97ed983df0786bee075e3fc5faf4528bd6d57db3))

## 0.1.6 "📚　Documentation" (2026-01-26)



### 🐛　Bug Fixes

* **agents:** update shadow models to user-specified providers ([7a5da91](https://github.com/moinulmoin/opencode-arise/commit/7a5da91f95676f11b3a8349e7c429a758e3d119c))


### 📚　Documentation

* update model table and bump to v0.1.6 ([1c1b405](https://github.com/moinulmoin/opencode-arise/commit/1c1b405146c4cfbed0dd9ac1c49aed5a6f84bf22))

## 0.1.5 "🐛　Bug Fixes" (2026-01-12)



### 🐛　Bug Fixes

* use NPM_TOKEN for publish (OIDC not working) ([d0fb56d](https://github.com/moinulmoin/opencode-arise/commit/d0fb56d1618762fb167184501958157e6d77f3c1))
* exclude cover images from npm package (1.4MB → 98KB) ([1738f19](https://github.com/moinulmoin/opencode-arise/commit/1738f192d0ecfd95151bab214bb926232c037c13))

## 0.1.4 "🐛　Bug Fixes" (2026-01-12)



### 🐛　Bug Fixes

* remove token env for pure OIDC Trusted Publishing ([af6007c](https://github.com/moinulmoin/opencode-arise/commit/af6007c8d333efb824ceb2fc70906cf7d81bdddf))
* CI build order and npm publish token fallback ([b87f97c](https://github.com/moinulmoin/opencode-arise/commit/b87f97c575cae4bfc279558a4c8400a75a183402))

## 0.1.3 "🚨　Tests" (2026-01-12)



### 🚨　Tests

* add comprehensive test suite (68 tests) ([c65c592](https://github.com/moinulmoin/opencode-arise/commit/c65c592bf8df49cd68e4e2869f514d867194edd0))

## 0.1.2 "🐛　Bug Fixes" (2026-01-12)



### 🐛　Bug Fixes

* only default export plugin function for npm packages ([6cb18e4](https://github.com/moinulmoin/opencode-arise/commit/6cb18e4eb87845c822b11999d95e2d2ff42cfb83))


### ⚙️　Continuous Integration

* switch to npm Trusted Publishing (OIDC), remove token ([091b003](https://github.com/moinulmoin/opencode-arise/commit/091b00354781a109235522506d32c52ad574bee4))

## 0.1.1 "♻️　Chores" (2026-01-12)



### 🐛　Bug Fixes

* robust JSONC parser for complex config files ([0deedec](https://github.com/moinulmoin/opencode-arise/commit/0deedec36d2c4dcd722a7ae92aee6686cb5db628))


### ♻️　Chores

* bump version to 0.1.1 ([a04fb41](https://github.com/moinulmoin/opencode-arise/commit/a04fb414e8c6d8072e6b066b427ed2e467a6804c))

# 0.1.0 "📚　Documentation" (2026-01-11)



### 🐛　Bug Fixes

* update to latest action versions and improve SDK usage ([8358bb4](https://github.com/moinulmoin/opencode-arise/commit/8358bb47abebd26c5a0a59b9ef9de7ff5d2c23f0))


### ✨　Features

* initial release v0.1.0 ([3b15206](https://github.com/moinulmoin/opencode-arise/commit/3b15206df26ffae0ee68439d3d61fcc56e9846db))


### 📚　Documentation

* comprehensive README with usage examples and configuration ([a9ef639](https://github.com/moinulmoin/opencode-arise/commit/a9ef63921e4901828149e921d45e67a18b621ff0))



# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.5] - 2025-01-12

### Fixed

- Exclude cover images from npm package (1.4 MB → 98 KB)
- Only include `assets/arise-banner.txt`, not full assets folder

## [0.1.4] - 2025-01-12

### Fixed

- CI workflow: Build before test (fixes build.test.ts requiring dist/)
- Release workflow: Pure OIDC Trusted Publishing

## [0.1.3] - 2025-01-12

### Added

- Comprehensive test suite (68 tests) covering:
  - Module exports validation (prevents export bugs)
  - Build output verification
  - Plugin integration tests
  - All custom tools and hooks
  - Config schema validation
  - JSONC parser edge cases

### Fixed

- Test for banner ASCII art spacing

## [0.1.2] - 2025-01-12

### Fixed

- **Critical**: Remove named exports that OpenCode was incorrectly treating as plugin instances
- Only default export the plugin function now

## [0.1.1] - 2025-01-12

### Fixed

- CLI installer now handles complex JSONC config files with URLs, escaped quotes, and multi-line comments
- Better error messages when config parsing fails

## [0.1.0] - 2025-01-11

### Added

- Initial release of opencode-arise
- Shadow Army agents:
  - `monarch` - Primary orchestrator (Sung Jinwoo)
  - `beru` - Fast codebase scout (Ant King)
  - `igris` - Precise implementation (Loyal Knight)
  - `bellion` - Strategic planning (Grand Marshal)
  - `tusk` - UI/UX specialist
  - `tank` - External research
  - `shadow-sovereign` - Deep reasoning (Full Power)
- Custom tools for shadow delegation:
  - `arise_summon` - Invoke shadows sync/async
  - `arise_background` - Launch parallel background tasks
  - `arise_background_output` - Get background task results
  - `arise_background_status` - List background tasks
  - `arise_background_cancel` - Cancel running tasks
- Hooks:
  - `arise-banner` - Session start toast
  - `output-shaper` - Quality-safe output truncation
  - `compaction-preserver` - Preserve critical context
  - `todo-enforcer` - Incomplete TODO reminders
- CLI installer (`bunx opencode-arise install`)
- Configuration system with project/global config support
