import * as vscode from "vscode";
import { ModuleMocker } from "jest-mock";

const mock = new ModuleMocker(globalThis);
const spyShowTextDocument = mock.spyOn(vscode.window, "showTextDocument");
const spyShowInputBox = mock.spyOn(vscode.window, "showInputBox");
const spyShowQuickPick = mock.spyOn(vscode.window, "showQuickPick");
const spyExecuteCommand = mock.spyOn(vscode.commands, "executeCommand");

export { mock, spyShowTextDocument, spyShowInputBox, spyShowQuickPick, spyExecuteCommand };
