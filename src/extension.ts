// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { BookmarkExplorer } from "./bookmarkExplorer";
import { PROJECT_STORAGE_FILE } from "./constants";
import { MultiProjectExplorer } from "./multiProjectExplorer";
import { StoragePath, ProjectStorage } from "./Storage";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  new MultiProjectExplorer(context);
  new BookmarkExplorer(context);
}

// this method is called when your extension is deactivated
export function deactivate() {}
