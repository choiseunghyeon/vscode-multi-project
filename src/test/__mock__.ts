import { ModuleMocker } from "jest-mock";
import * as vscode from "vscode";
import * as native from "../utils/native";
import { getMultiProjectProvider } from "./helper";

const mock = new ModuleMocker(globalThis);

/* Native */
const spyShowTextDocument = mock.spyOn(vscode.window, "showTextDocument");
const spyShowInputBox = mock.spyOn(vscode.window, "showInputBox");
const spyShowQuickPick = mock.spyOn(vscode.window, "showQuickPick");
const spyShowInformationMessage = mock.spyOn(vscode.window, "showInformationMessage");
const spyCreateTerminal = mock.spyOn(vscode.window, "createTerminal");
const spyExecuteCommand = mock.spyOn(vscode.commands, "executeCommand");
const mockedOpenVSCode = mock.spyOn(native, "openVSCode").mockImplementation(async () => {});

/* Multi Project Provider */
const spyTreeDataProviderRefresh = mock.spyOn(getMultiProjectProvider(), "refresh");
export { mock, spyShowTextDocument, spyShowInputBox, spyShowQuickPick, spyShowInformationMessage, spyExecuteCommand, spyCreateTerminal, mockedOpenVSCode, spyTreeDataProviderRefresh };
