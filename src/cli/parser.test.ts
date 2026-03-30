/// <reference types="bun" />
/// <reference types="bun-types" />
import { describe, expect, it } from "bun:test";

import { createJsonHandler } from "../utils/config/jsonc";

describe("createJsonHandler", () => {
  it("parses plain JSON", () => {
    const handler = createJsonHandler('{"foo": "bar"}');
    expect(handler.valueOf()).toEqual({ foo: "bar" });
  });

  it("strips single-line comments", () => {
    const handler = createJsonHandler(`{
      "foo": "bar" // this is a comment
    }`);
    expect(handler.valueOf()).toEqual({ foo: "bar" });
  });

  it("strips multi-line comments", () => {
    const handler = createJsonHandler(`{
      /* this is a
         multi-line comment */
      "foo": "bar"
    }`);
    expect(handler.valueOf()).toEqual({ foo: "bar" });
  });

  it("removes trailing commas", () => {
    const handler = createJsonHandler(`{
      "foo": "bar",
      "baz": [1, 2, 3,],
    }`);
    expect(handler.valueOf()).toEqual({ foo: "bar", baz: [1, 2, 3] });
  });

  it("preserves URLs with double slashes in strings", () => {
    const handler = createJsonHandler(`{
      "url": "https://example.com/path"
    }`);
    expect(handler.valueOf()).toEqual({ url: "https://example.com/path" });
  });

  it("handles escaped quotes in strings", () => {
    const handler = createJsonHandler(`{
      "message": "He said \\"hello\\""
    }`);
    expect(handler.valueOf()).toEqual({ message: 'He said "hello"' });
  });

  it("parses real opencode config", () => {
    const config = `{
      // OpenCode configuration
      "theme": "dark",
      "plugin": [
        "some-plugin", // enabled
        /* "disabled-plugin", */
      ],
      "keybindings": {
        "submit": "ctrl+enter",
      }
    }`;
    const handler = createJsonHandler(config);
    const result = handler.valueOf() as Record<string, unknown>;
    expect(result.theme).toBe("dark");
    expect(result.plugin).toEqual(["some-plugin"]);
  });
});
