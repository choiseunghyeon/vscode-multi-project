import * as expect from "expect"; // jest matchers
import * as vscode from "vscode";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Should start extension multi project", () => {
    const multiProjectExtension = vscode.extensions.getExtension("choiseunghyeon.multi-project");
    expect(multiProjectExtension).not.toBeUndefined();
    expect(multiProjectExtension?.isActive).toBe(true);
  });
});
