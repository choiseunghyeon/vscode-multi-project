import * as vscode from "vscode";

export function openResource(resource: vscode.Uri): void {
  vscode.window.showTextDocument(resource);
}

export function getConfigurationFileName(): string {
  return vscode.workspace.getConfiguration("multiProject").get("fileName", "*");
}

export function getConfigurationIgnoredFolders(): string[] {
  return vscode.workspace.getConfiguration("multiProject").get("ignoredFolders", []);
}
