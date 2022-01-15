import * as vscode from "vscode";
import { BookmarkItem } from "./bookmarkExplorer";
import { ProjectItem } from "./multiProjectExplorer";

type SourceType = vscode.Uri[] | ProjectItem | BookmarkItem;
export function getFilePath(source: SourceType): string[] {
  if (ProjectItem.isProejctItem(source)) {
    return getFilePathFromProjectItem(source);
  } else if (BookmarkItem.isBookmarkItem(source)) {
    return getFilePathFromBookmarkItem(source);
  } else {
    return getFilePathFromUri(source);
  }
}

export function getFilePathFromUri(uriList: vscode.Uri[]): string[] {
  return uriList.map(uri => uri.fsPath);
}
export function getFilePathFromProjectItem(projectItem: ProjectItem): string[] {
  const projectItemList = [projectItem];

  return projectItemList.map(projectItem => projectItem.resourceUri.fsPath);
}

export function getFilePathFromBookmarkItem(bookmarkItem: BookmarkItem): string[] {
  const bookmarkItemList = [bookmarkItem];

  return bookmarkItemList.map(bookmarkItem => bookmarkItem.resourceUri.fsPath);
}

export async function filterDirectory() {}

export async function filterFile() {}
