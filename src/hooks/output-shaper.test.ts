import { createOutputShaperHook } from "./output-shaper";
import { createDefaultConfig } from "../config/schema";

/**
 * OutputShaperHook 測試
 * OutputShaperHook tests
 *
 * 測試輸出截斷和錯誤保留邏輯
 * Tests output truncation and error preservation logic
 */
describe("OutputShaperHook", () => {
  const shaper = createOutputShaperHook(createDefaultConfig());

  /**
   * 測試 1: 短輸出不截斷
   * Test 1: Short output not truncated
   *
   * 小於 maxChars 的輸出應該保持不變
   * Outputs smaller than maxChars should remain unchanged
   */
  test("does not truncate short output", async () => {
    const output = "Hello, world!";
    const result = await shaper.shapeOutput("test", output);
    expect(result).toBe(output);
  });

  /**
   * 測試 2: 長輸出截斷
   * Test 2: Long output truncated
   *
   * 大於 maxChars 的輸出應該被截斷並添加標記
   * Outputs larger than maxChars should be truncated with marker
   */
  test("truncates long output", async () => {
    const longOutput = "x".repeat(20000);
    const result = await shaper.shapeOutput("grep", longOutput);
    /** 截斷後長度應小於原始長度 / Truncated length should be less than original */
    expect(result.length).toBeLessThan(longOutput.length);
    /** 應包含截斷標記 / Should contain truncation marker */
    expect(result).toContain("[opencode-arise] Output truncated");
  });

  /**
   * 測試 3: 非零 exit code 保留完整輸出
   * Test 3: Non-zero exit code preserves full output
   *
   * 當 exitCode !== 0 時，即使輸出很長也應該完整保留
   * When exitCode !== 0, even long outputs should be fully preserved
   *
   * 這是錯誤保留邏輯的體現
   * This reflects the error preservation logic
   */
  test("preserves error output with non-zero exit code", async () => {
    const errorOutput = "x".repeat(20000);
    const result = await shaper.shapeOutput("bash", errorOutput, { exitCode: 1 });
    expect(result).toBe(errorOutput);
  });

  /**
   * 測試 4: 包含錯誤模式的輸出保留
   * Test 4: Output with error patterns preserved
   *
   * 當輸出包含 "Error:" 等錯誤關鍵字時，即使 exitCode === 0
   * 也應該保留最多 2x maxChars 的內容
   *
   * When output contains error keywords like "Error:", even with exitCode === 0
   * up to 2x maxChars should be preserved
   *
   * 15000 < 2 * 12000 = 24000，所以完整保留
   * 15000 < 2 * 12000 = 24000, so fully preserved
   */
  test("preserves output with error patterns", async () => {
    const errorOutput = "Error: something went wrong\n" + "x".repeat(15000);
    const result = await shaper.shapeOutput("bash", errorOutput, { exitCode: 0 });
    /** 包含錯誤模式且長度 < 2x maxChars，完整保留 / Contains error pattern and length < 2x maxChars, fully preserved */
    expect(result).toBe(errorOutput);
  });
});
