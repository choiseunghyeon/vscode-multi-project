import * as vscode from "vscode";
import * as fs from "fs";
import { ProjectStoragePath } from "../storage/storage";
import { ProjectStorage } from "../storage/projectStorage";
import { PROJECT_STORAGE_FILE } from "../constants";
import { MultiProjectProvider } from "../explorer/multiProjectExplorer";
import { publicInstance } from "../extension";
import path = require("path");

/* Configuration */
export function getConfigurationFileName(): Function {
  const result = vscode.workspace.getConfiguration("multiProject").get("fileName", "*");
  function restore() {
    setConfig("fileName", result);
  }

  return restore;
}

export function getConfigurationIgnoredFolders(): Function {
  const result = vscode.workspace.getConfiguration("multiProject").get("ignoredFolders", []);
  function restore() {
    setConfig("ignoredFolders", result);
  }

  return restore;
}

let restoreConfigList: Function[] = [];
export function saveConfig() {
  restoreConfigList.push(getConfigurationFileName(), getConfigurationIgnoredFolders());
}

export async function restoreConfig() {
  for (const restore of restoreConfigList) {
    await restore();
  }
  restoreConfigList = [];
}

export async function setConfig(section: string, settings: any) {
  const multiProject = vscode.workspace.getConfiguration("multiProject");
  await multiProject.update(section, settings, vscode.ConfigurationTarget.Global);
}

/* storage */
export function initStorage(location: string, path: string, data: any) {
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

/* etc */
export async function sleep(ms: number = 100) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createMultiProjectProvider() {
  const projectPath = new ProjectStoragePath("");
  const storage = new ProjectStorage(projectPath.storageLocation, PROJECT_STORAGE_FILE);
  return new MultiProjectProvider(storage);
}

export function getMultiProjectProvider() {
  const [multiProjectExplorer, bookmarkExplorer] = publicInstance;
  return multiProjectExplorer.treeDataProvider;
}

export function getBookmarkProvider() {
  const [multiProjectExplorer, bookmarkExplorer] = publicInstance;
  return bookmarkExplorer.treeDataProvider;
}

export const TEST_FOLDER_LOCATION = "c:\\multi-project\\testFolder";
export const STORAGE_LOCATION = path.join(TEST_FOLDER_LOCATION, "storage");
