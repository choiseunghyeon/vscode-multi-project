import * as vscode from "vscode";
import { BookmarkItem } from "../explorer/bookmarkExplorer";
import { ProjectItem } from "../explorer/multiProjectExplorer";
import { IBookmark, IBookmarkFolder, IRegisterCommand } from "../type";

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

  return projectItemList.map(projectItem => projectItem.project.path);
}

export function getFilePathFromBookmarkItem(bookmarkItem: BookmarkItem): string[] {
  const bookmark = bookmarkItem.bookmark;
  if (isBookmarkFolder(bookmark)) return [];

  return [bookmark.path];
  // return bookmarkPathList.map(bookmark => bookmark.path);
}

export function createCommand(name: string, callback: Function): IRegisterCommand {
  return { name, callback };
}

export function createTreeItemCommand(command: string, title: string, args: any[]): vscode.Command {
  return {
    command,
    title,
    arguments: args,
  };
}

export function isBookmark(bookmark: any): bookmark is IBookmark {
  return bookmark.hasOwnProperty("path");
}

export function isBookmarkFolder(bookmark: any): bookmark is IBookmarkFolder {
  return !bookmark.hasOwnProperty("path");
}
