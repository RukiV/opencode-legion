/**
 * 專案根路徑定義 / Project Root Path Definitions
 *
 * 使用中央化路徑管理，避免相對路徑 ../ 地獄
 * Centralized path management to avoid relative path ../../.. hell
 */
/// <reference types="node" />

import { join } from "path";

export const __ROOT = join(__dirname);

export const isWin = process.platform === "win32";

// 測試路徑架構 / Test Path Structure
// test/
// ├── fixtures/              ← 測試資料夾（唯讀）
// └── temp/                 ← 臨時檔案（可寫，永遠建立子資料夾）
//     ├── fake-bun/
//     └── temp-paths/

export const __TEST_ROOT = join(__ROOT, "test");
export const __TEST_FIXTURES = join(__TEST_ROOT, "fixtures");
export const __TEST_TEMP = join(__TEST_ROOT, "temp");

export const __DIST = join(__ROOT, "dist");
