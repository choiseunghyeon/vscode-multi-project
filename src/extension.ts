// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { BookmarkExplorer } from "./bookmarkExplorer";
import { MultiProjectExplorer } from "./multiProjectExplorer";
import { ProjectPath, Storage } from "./Storage";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // context.subscriptions.push(
  //   vscode.commands.registerCommand("multiProjectExplorer.openSearch", async () => {
  //     await vscode.commands.executeCommand("workbench.action.findInFiles");
  //   })
  // );
  const projectPath = new ProjectPath(context);
  const storage = new Storage(projectPath.storageFilePath);
  new MultiProjectExplorer(context);
  new BookmarkExplorer(context);
}

// this method is called when your extension is deactivated
export function deactivate() {}
