// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { MultiProjectExplorer } from "./multiProjectExplorer";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("multiProjectExplorer.addProject", args => {
      console.log(args);
      const multiProjet = vscode.workspace.getConfiguration("multiProject");
      const resultPaths = [multiProjet.get("projectPaths"), args.fsPath];
      multiProjet.update("projectPaths", resultPaths, vscode.ConfigurationTarget.Global).then(aa => {
        console.log(aa);
      });
    })
  );
  new MultiProjectExplorer(context);
}

// this method is called when your extension is deactivated
export function deactivate() {}
