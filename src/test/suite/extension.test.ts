import * as expect from "expect"; // jest matchers
import * as vscode from "vscode";
import { before, after } from "mocha";
import { restoreConfig, saveConfig, setConfig, STORAGE_LOCATION } from "../helper";

before(async () => {
  saveConfig();
  await setConfig("projectStorageLocation", STORAGE_LOCATION);
  await setConfig("bookmarkStorageLocation", STORAGE_LOCATION);
});

after(async () => {
  // 기존 config 작업 복원
  await restoreConfig();
});

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Should start extension multi project", () => {
    const multiProjectExtension = vscode.extensions.getExtension("choiseunghyeon.multi-project");
    expect(multiProjectExtension).not.toBeUndefined();
    expect(multiProjectExtension?.isActive).toBe(true);
  });
});
