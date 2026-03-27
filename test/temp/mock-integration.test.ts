/**
 * Mock 環境讀寫測試
 * Mock Environment Read/Write Test
 *
 * 測試 MockFs 是否能：
 * 1. 讀取真實目錄的檔案內容
 * 2. 寫入操作不會影響真實檔案
 * 3. 讀取 Mock 中的內容
 *
 * @module test/temp/mock-integration.test.ts
 */

// @noUnusedParameters:false
/// <reference types="bun" />
/// <reference types="node" />

import { describe, expect, it, beforeAll, afterAll, beforeEach } from "bun:test";
import { join, dirname } from "upath2";
import * as fsExtra from "fs-extra";
import { MockFs } from "../lib/mock-fs";

/** 測試用目錄 */
const TEST_DIR = "D:/Users/WebstormProjects/temp/temp-shared";

/** 測試檔案 */
const TEST_FILE = join(TEST_DIR, "test-file.txt");
const TEST_JSON = join(TEST_DIR, "test-config.json");
const TEST_NESTED = join(TEST_DIR, "nested/dir/file.txt");

describe("MockFs 與真實目錄整合測試", () => {
	/** 初始化測試目錄和檔案 */
	beforeAll(() => {
		console.log(`[Test] 初始化測試目錄: ${TEST_DIR}`);

		// 建立測試檔案
		fsExtra.ensureDirSync(TEST_DIR);
		fsExtra.writeFileSync(TEST_FILE, "原始檔案內容 (Original)", "utf-8");
		fsExtra.writeFileSync(TEST_JSON, JSON.stringify({ key: "原始值", nested: { value: 123 } }), "utf-8");
		fsExtra.ensureDirSync(dirname(TEST_NESTED));
		fsExtra.writeFileSync(TEST_NESTED, "巢狀檔案內容", "utf-8");

		console.log(`[Test] 已建立測試檔案`);
		console.log(`  - ${TEST_FILE}`);
		console.log(`  - ${TEST_JSON}`);
		console.log(`  - ${TEST_NESTED}`);
	});

	/** 測試後清理 */
	afterAll(() => {
		console.log(`[Test] 清理測試目錄`);

		// 刪除測試時建立的檔案（保留原始檔案）
		const testMarker = join(TEST_DIR, ".test-marker");
		if (fsExtra.existsSync(testMarker)) {
			fsExtra.removeSync(testMarker);
		}
		const mockMarker = join(TEST_DIR, "mock-output.txt");
		if (fsExtra.existsSync(mockMarker)) {
			fsExtra.removeSync(mockMarker);
		}
		const mockNested = join(TEST_DIR, "mock-nested/output.txt");
		if (fsExtra.existsSync(mockNested)) {
			fsExtra.removeSync(mockNested);
		}
	});

	describe("1. MockFs 可以讀取真實檔案", () => {
		it("應該能讀取真實檔案的內容（作為初始化資料）", () => {
			// 從真實檔案讀取內容
			const realContent = fsExtra.readFileSync(TEST_FILE, "utf-8");
			console.log(`[Test] 真實檔案內容: ${realContent}`);

			// 用 MockFs 初始化（模擬讀取）
			const mockFs = new MockFs({
				enableSafetyCheck: false,
				// 初始化 MockFs 的內容（從真實檔案讀取）
				auditDir: undefined,
			});

			// 手動設定 MockFs 的內容（模擬從真實檔案讀取）
			mockFs.setFiles({
				[TEST_FILE]: realContent,
				[TEST_JSON]: fsExtra.readFileSync(TEST_JSON, "utf-8"),
			});

			// MockFs 應該能讀取這些內容
			const mockContent = mockFs.readFileSync(TEST_FILE, "utf-8");
			expect(mockContent).toBe("原始檔案內容 (Original)");

			const mockJson = mockFs.readJsonSync<{ key: string }>(TEST_JSON);
			expect(mockJson.key).toBe("原始值");
		});

		it("應該能讀取巢狀目錄的檔案", () => {
			const realContent = fsExtra.readFileSync(TEST_NESTED, "utf-8");

			const mockFs = new MockFs({ enableSafetyCheck: false });
			mockFs.setFiles({
				[TEST_NESTED]: realContent,
			});

			const content = mockFs.readFileSync(TEST_NESTED, "utf-8");
			expect(content).toBe("巢狀檔案內容");
		});
	});

	describe("2. MockFs 寫入不會影響真實檔案", () => {
		let mockFs: MockFs;

		beforeEach(() => {
			mockFs = new MockFs({ enableSafetyCheck: false });

			// 初始化 MockFs（從真實檔案讀取）
			mockFs.setFiles({
				[TEST_FILE]: fsExtra.readFileSync(TEST_FILE, "utf-8"),
			});
		});

		it("MockFs 寫入後，真實檔案應該不變", () => {
			// 在 MockFs 中寫入新內容
			mockFs.writeFileSync(TEST_FILE, "Mock 修改後的內容", "utf-8");

			// 驗證 MockFs 能讀到新內容
			expect(mockFs.readFileSync(TEST_FILE, "utf-8")).toBe("Mock 修改後的內容");

			// 讀取真實檔案
			const realContent = fsExtra.readFileSync(TEST_FILE, "utf-8");
			console.log(`[Test] 真實檔案內容（應該仍是原始）: ${realContent}`);

			// 真實檔案應該不受影響
			expect(realContent).toBe("原始檔案內容 (Original)");
		});

		it("MockFs 建立新檔案，真實目錄不應該有這個檔案", () => {
			const newFile = join(TEST_DIR, "mock-only.txt");
			const markerFile = join(TEST_DIR, ".test-marker");

			// 在 MockFs 中建立新檔案
			mockFs.writeFileSync(newFile, "這是 Mock 建立的檔案", "utf-8");
			mockFs.writeFileSync(markerFile, "測試標記", "utf-8");

			// MockFs 能讀到
			expect(mockFs.existsSync(newFile)).toBe(true);
			expect(mockFs.readFileSync(newFile, "utf-8")).toBe("這是 Mock 建立的檔案");

			// 真實檔案系統中不應該有這些檔案
			expect(fsExtra.existsSync(newFile)).toBe(false);
			expect(fsExtra.existsSync(markerFile)).toBe(false);
			console.log(`[Test] 確認：Mock 建立的檔案不會出現在真實檔案系統中`);
		});

		it("MockFs 刪除檔案，真實檔案不應該被刪除", () => {
			// 在 MockFs 中刪除檔案
			mockFs.rmSync(TEST_FILE);

			// MockFs 中不存在
			expect(mockFs.existsSync(TEST_FILE)).toBe(false);

			// 真實檔案仍然存在
			expect(fsExtra.existsSync(TEST_FILE)).toBe(true);
			const realContent = fsExtra.readFileSync(TEST_FILE, "utf-8");
			expect(realContent).toBe("原始檔案內容 (Original)");
			console.log(`[Test] 確認：Mock 刪除的檔案在真實檔案系統中仍然存在`);
		});
	});

	describe("3. MockFs 可以處理任意目錄結構", () => {
		it("MockFs 可以建立任意深度的目錄結構", () => {
			const mockFs = new MockFs({ enableSafetyCheck: false });

			const deepPath = join(TEST_DIR, "deep/nested/directory/structure/file.txt");

			// MockFs 可以寫入任意路徑
			mockFs.writeFileSync(deepPath, "深度路徑內容", "utf-8");

			// MockFs 能讀取
			expect(mockFs.existsSync(deepPath)).toBe(true);
			expect(mockFs.readFileSync(deepPath, "utf-8")).toBe("深度路徑內容");

			// 真實檔案系統中不應該有這個路徑
			expect(fsExtra.existsSync(deepPath)).toBe(false);
			console.log(`[Test] 確認：Mock 可以建立任意深度的目錄結構`);
		});
	});

	describe("4. Audit Mode 可以將 Mock 變更寫入真實目錄", () => {
		it("Audit Mode 寫入後，audit 目錄會有對應檔案", () => {
			// Audit Mode 使用相對路徑：/audit-output.txt
			// 會寫入到 auditDir + /audit-output.txt
			const auditDir = join(TEST_DIR, ".audit");

			// 建立有 Audit Mode 的 MockFs
			const mockFs = new MockFs({
				enableSafetyCheck: false,
				auditDir: auditDir,
				auditEnabled: true,
			});

			// 使用相對路徑（相對於 auditDir 的根目錄）
			const relativePath = "/audit-output.txt";

			// MockFs 寫入（使用相對路徑）
			mockFs.writeFileSync(relativePath, "Audit Mode 輸出的內容", "utf-8");

			// Audit 目錄中應該有這個檔案
			const auditOutputFile = join(auditDir, "audit-output.txt");
			expect(fsExtra.existsSync(auditOutputFile)).toBe(true);
			const content = fsExtra.readFileSync(auditOutputFile, "utf-8");
			expect(content).toBe("Audit Mode 輸出的內容");

			console.log(`[Test] Audit Mode 成功將 Mock 變更寫入 audit 目錄`);
			console.log(`  - Mock 路徑: ${relativePath}`);
			console.log(`  - Audit 路徑: ${auditOutputFile}`);

			// 清理
			fsExtra.removeSync(auditDir);
		});

		it("Audit Mode 可以過濾要寫入的檔案", () => {
			const auditDir = join(TEST_DIR, ".audit-filter");

			// 只 audit .txt 檔案
			const mockFs = new MockFs({
				enableSafetyCheck: false,
				auditDir: auditDir,
				auditEnabled: true,
				auditPatterns: ["**/*.txt"],
			});

			// 寫入相對路徑
			mockFs.writeFileSync("/include.txt", "應該被寫入", "utf-8");
			mockFs.writeFileSync("/data.json", "不應該被寫入", "utf-8");

			// .txt 檔案應該被寫入
			expect(fsExtra.existsSync(join(auditDir, "include.txt"))).toBe(true);
			expect(fsExtra.readFileSync(join(auditDir, "include.txt"), "utf-8")).toBe("應該被寫入");

			// .json 檔案不應該被寫入
			expect(fsExtra.existsSync(join(auditDir, "data.json"))).toBe(false);

			console.log(`[Test] Audit Mode Pattern 過濾功能正常`);

			// 清理
			fsExtra.removeSync(auditDir);
		});

		it("Audit Mode 也可以使用絕對路徑（auditDir + 原始路徑）", () => {
			const auditDir = join(TEST_DIR, ".audit-abs");

			const mockFs = new MockFs({
				enableSafetyCheck: false,
				auditDir: auditDir,
				auditEnabled: true,
			});

			// 絕對路徑會被完整拼接
			const absPath = join(TEST_DIR, "absolute-output.txt");

			// MockFs 寫入絕對路徑
			mockFs.writeFileSync(absPath, "絕對路徑內容", "utf-8");

			// 會寫入到 auditDir + 絕對路徑（這可能不是預期行為）
			// 所以建議使用相對路徑
			console.log(`[Test] 警告：使用絕對路徑時，audit 路徑會是 auditDir + absPath`);

			// 清理
			fsExtra.removeSync(auditDir);
		});
	});

	describe("5. 安全性檢查", () => {
		it("安全模式下不允許操作危險路徑", () => {
			const mockFs = new MockFs({
				enableSafetyCheck: true, // 啟用安全檢查
			});

			// 嘗試寫入危險路徑應該被阻止
			expect(() => {
				mockFs.writeFileSync("/etc/passwd", " malicious ");
			}).toThrow();

			expect(() => {
				mockFs.writeFileSync("C:\\Windows\\System32\\config", " malicious ");
			}).toThrow();

			console.log(`[Test] 安全檢查正常運作`);
		});

		it("外部目錄需要停用安全檢查", () => {
			// 對於外部 temp 目錄，需要停用安全檢查
			const mockFs = new MockFs({
				enableSafetyCheck: false, // 停用安全檢查
			});

			// 可以寫入外部目錄
			expect(() => {
				mockFs.writeFileSync(join(TEST_DIR, "external-test.txt"), "外部測試");
			}).not.toThrow();

			expect(mockFs.existsSync(join(TEST_DIR, "external-test.txt"))).toBe(true);
			expect(mockFs.readFileSync(join(TEST_DIR, "external-test.txt"), "utf-8")).toBe("外部測試");

			// 真實檔案系統不受影響
			expect(fsExtra.existsSync(join(TEST_DIR, "external-test.txt"))).toBe(false);

			console.log(`[Test] 外部目錄 Mock 操作正常（安全檢查已停用）`);
		});
	});
});
