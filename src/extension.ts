// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { BookmarkExplorer } from "./explorer/bookmarkExplorer";
import { MultiProjectExplorer } from "./explorer/multiProjectExplorer";
import { IRegisterCommand } from "./type";

const addSubscriptions = (context: vscode.ExtensionContext, units: any): void => {
  context.subscriptions.push(
    ...units.reduce((result: any, unit: any) => {
      const commands = unit.getCommands();
      return result.concat(commands.map((command: IRegisterCommand) => registerCommand(unit, command)));
    }, [])
  );
};

const registerCommand = (thisArg: any, command: IRegisterCommand) => {
  return vscode.commands.registerCommand(command.name, (...arg) => {
    command.callback.call(thisArg, ...arg);
  });
};

export let publicInstance: any;
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const multiProjectExplorer = new MultiProjectExplorer(context.globalStorageUri.fsPath);
  const bookmarkExplorer = new BookmarkExplorer(context.globalStorageUri.fsPath);
  publicInstance = [multiProjectExplorer, bookmarkExplorer];
  addSubscriptions(context, publicInstance);
}

// this method is called when your extension is deactivated
export function deactivate() {}
