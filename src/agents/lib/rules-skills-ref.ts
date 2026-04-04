/**
 * Rules & Skills 索引參考
 * Rules & Skills Index Reference
 *
 * 提供 rules 與 skills 的名稱與簡介，供 agents 查閱
 * Provides rules and skills names with descriptions for agents to reference
 *
 * 用法 / Usage:
 * 在 prompts 中引用此常數：Reference this constant in prompts:
 * import { RULES_SKILLS_INDEX } from './lib/rules-skills-ref';
 */

export const RULES_SKILLS_INDEX = `## 📚 Rules & Skills Index

### Rules (in system prompt OR read by name)
Rules 可以透過名稱讀取或已被注入到 system prompt：
- **typescript-naming-convention** - Type naming rules (I* for interfaces, Enum* for enums)
- **comment-format-rules** - Comment format rules (block comments, bilingual)
- **test-file-best-practices** - Test file organization
- **unimplemented-code-handling-rules** - Handle code limitations
- **module-execution-rules** - How to execute .ts files
- **agents-ts-execution-rules** - Agent execution rules
- **js-git-friendly-coding-style** - Git-friendly code style guide
- **context7-mcp** - Library/framework documentation lookup

### Skills (load with skill tool)
Use skill tool to load and get detailed guidance:
- **js-git-friendly-coding-style**
  → Git-friendly code style (Tab indentation, Allman braces)
  → Reduces diff noise, better merging
  
- **analyze-code-commenter**
  → Add bilingual comments (Chinese + English)
  → Proper block/single-line usage
  → JSDoc with logic separation
  
- **code-refactoring-expert**
  → Safe refactoring patterns
  → Backward compatibility
  → Incremental changes

- **typescript-unimplemented-handler**
  → Handle TypeScript limitations
  → Preserve as comments with explanation
  → Future implementation notes

- **browser-automation** - Browser automation
- **context7-mcp** - Documentation lookup
- **nodejs-readme-updater** - README updates
- **readme-updater** - Documentation review
- **skill-creator** - Create new skills
- **skill-installer** - Install skills
- **slides** - Presentation decks
- **spreadsheets** - Spreadsheet workbooks
- **webstorm-mcp** - WebStorm integration

⚡ QUICK REFERENCE:
- For code style: skill(name: "js-git-friendly-coding-style")
- For comments: skill(name: "analyze-code-commenter")
- For refactoring: skill(name: "code-refactoring-expert")
- For TS limits: skill(name: "typescript-unimplemented-handler")

⚠️ Rules may be outdated. Skills are loaded fresh. Prefer loaded skill when in doubt.` as const;

/**
 * Rules & Skills 短版索引（用於footer/驗證場景）
 * Short index for footer/verification scenarios
 */
export const RULES_SKILLS_SHORT = `## 📚 Rules & Skills (Quick Ref)
Rules: typescript-naming-convention, comment-format-rules, test-file-best-practices, unimplemented-code-handling-rules
Skills: js-git-friendly-coding-style, analyze-code-commenter, code-refactoring-expert, typescript-unimplemented-handler
Load: skill(name: "skill-name") — skill may override outdated rules` as const;