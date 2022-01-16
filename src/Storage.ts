import path = require("path");
import fs = require("fs");
import * as vscode from "vscode";
import { FileSystemProvider } from "./FileSystemProvider";
export class Storage extends FileSystemProvider {
  data: any;
  uri: vscode.Uri;
  constructor(private location: string, private fileName: string) {
    super();

    const fullPath = path.join(location, fileName);
    this.uri = vscode.Uri.file(fullPath);
  }

  async load() {
    if (!fs.existsSync(this.location)) {
      const result = fs.mkdirSync(this.location, { recursive: true });
    }

    if (fs.existsSync(this.uri.fsPath)) {
      const jsonFile = fs.readFileSync(this.uri.fsPath, "utf8");
      const jsonData = JSON.parse(jsonFile);
      this.data = jsonData;
      fs.read;
    } else {
      const result = fs.writeFileSync(this.uri.fsPath, "");
    }
  }

  get projects() {
    return [];
  }
}

export class ProjectPath {
  constructor(private context: vscode.ExtensionContext) {}
  get storageLocation() {
    const storageLocation = vscode.workspace.getConfiguration("multiProject").get<string>("storageLocation", "");
    let storagePath;
    if (storageLocation) {
      const storageUri = vscode.Uri.file(storageLocation);
      storagePath = storageUri.fsPath;
    } else {
      storagePath = this.context.globalStorageUri.fsPath;
    }
    return storagePath;
  }
}
