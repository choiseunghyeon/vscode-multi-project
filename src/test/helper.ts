import * as vscode from "vscode";
import * as fs from "fs";

export async function setConfig(section: string, settings: any) {
  const multiProject = vscode.workspace.getConfiguration("multiProject");
  await multiProject.update(section, settings, vscode.ConfigurationTarget.Global);
}

export function initProjectStorage(location: string, path: string, data: any) {
  if (!fs.existsSync(location)) {
    fs.mkdirSync(location, { recursive: true });
  }

  const _data = JSON.stringify(data, null, 2);
  fs.writeFileSync(path, _data);
}

export function getData(path: string) {
  const data = fs.readFileSync(path, { encoding: "utf8" });
  return JSON.parse(data);
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
