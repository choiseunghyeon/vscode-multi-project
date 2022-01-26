import * as vscode from "vscode";
import * as fs from "fs";

export async function setConfig(section: string, settings: any) {
  const multiProject = vscode.workspace.getConfiguration("multiProject");
  await multiProject.update(section, settings, vscode.ConfigurationTarget.Global);
}

export function initProjectStorage(location: string, path: string, storageValue: any) {
  if (!fs.existsSync(location)) {
    fs.mkdirSync(location, { recursive: true });
  }

  fs.writeFileSync(path, storageValue);
}

export function getData(path: string) {
  const data = fs.readFileSync(path, { encoding: "utf8" });
  return JSON.parse(data);
}
