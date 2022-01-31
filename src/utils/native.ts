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

export async function openVSCode(uri: vscode.Uri, openInNewWindow: boolean) {
  await vscode.commands.executeCommand("vscode.openFolder", uri, openInNewWindow);
}

export async function showInputBox(defaultValue: string, placeHolder: string) {
  const result = await vscode.window.showInputBox({
    value: defaultValue,
    placeHolder,
    // valueSelection: [2, 4],
    // validateInput: text => {
    // 	vscode.window.showInformationMessage(`Validating: ${text}`);
    // 	return text === '123' ? 'Not 123!' : null;
    // }
  });
  // vscode.window.showInformationMessage(`Got: ${result}`);
  return result;
}
