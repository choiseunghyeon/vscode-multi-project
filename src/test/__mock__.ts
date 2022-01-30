import * as vscode from "vscode";
import { ModuleMocker } from "jest-mock";
import * as native from "../utils/native";

const mock = new ModuleMocker(globalThis);
const spyShowTextDocument = mock.spyOn(vscode.window, "showTextDocument");
const spyShowInputBox = mock.spyOn(vscode.window, "showInputBox");
const spyShowQuickPick = mock.spyOn(vscode.window, "showQuickPick");
const spyCreateTerminal = mock.spyOn(vscode.window, "createTerminal");
const spyExecuteCommand = mock.spyOn(vscode.commands, "executeCommand");
const mockedOpenVSCode = mock.spyOn(native, "openVSCode").mockImplementation(async () => {});

export { mock, spyShowTextDocument, spyShowInputBox, spyShowQuickPick, spyExecuteCommand, spyCreateTerminal, mockedOpenVSCode };
