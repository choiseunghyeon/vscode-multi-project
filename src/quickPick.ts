import * as vscode from "vscode";

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
