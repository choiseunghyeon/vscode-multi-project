import { Uri } from "vscode";
import * as path from "path";
import { IBookmark } from "../type";
import { Storage } from "./storage";

export class BookmarkStorage extends Storage {
  constructor(location: string, fileName: string) {
    super(location, fileName);
  }

  get defaultStorageValue(): any {
    return [];
  }

  update(bookmarks: IBookmark[]) {
    // path 통일
    bookmarks.forEach(bookmark => (bookmark.path = Uri.file(bookmark.path).fsPath));

    try {
      this.writeFileSync(bookmarks);
      this.syncDataFromDiskFile();
    } catch (error) {
      console.error(`file update 중 오류가 발생했습니다. ${error}`);
    }
  }

  static createDefaultBookmark(bookmarkPath: string, name?: string): IBookmark {
    const defaultName = name ?? bookmarkPath.split(path.sep).pop();
    return {
      path: bookmarkPath,
      name: defaultName ?? "",
    };
  }
}
