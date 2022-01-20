import * as vscode from "vscode";

export function openResource(resource: vscode.Uri): void {
  vscode.window.showTextDocument(resource);
}
