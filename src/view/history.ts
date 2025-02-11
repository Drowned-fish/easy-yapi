import { History } from "@type";
import dayjs from 'dayjs';
import * as vscode from "vscode";

/**
 * 重写侧边栏入口子节点
 */
export class SideBarEntryItem extends vscode.TreeItem {
    constructor(label: string, time: string, collapsibleState: vscode.TreeItemCollapsibleState) {
        super(label, collapsibleState);
        this.tooltip = `${this.label}`; // 鼠标悬停时的提示
        this.description = time;
    }
}

/**
 * 重写侧边栏入口
 */
export class SideBarEntry implements vscode.TreeDataProvider<SideBarEntryItem> {
    public rootSideBars: SideBarEntryItem[] = [];
    public context?: vscode.ExtensionContext;
    public history: History;
    private _onDidChangeTreeData: vscode.EventEmitter<SideBarEntryItem | undefined> = 
        new vscode.EventEmitter<SideBarEntryItem | undefined>();
    
    public get onDidChangeTreeData(): vscode.Event<SideBarEntryItem | undefined> {
        return this._onDidChangeTreeData.event;
    }

    constructor(history: History, context?: vscode.ExtensionContext) {
        this.context = context;
        this.history = history;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    // 更新历史数据
    updateHistory(updateHistory: History) {
        this.history = updateHistory;
        this.rootSideBars = [];
        // 数据更新后，属性侧边栏视图
        this.refresh();
    }

    getTreeItem(element: SideBarEntryItem): vscode.TreeItem {
        return element;
    }

    getChildren(
        element?: SideBarEntryItem
      ): vscode.ProviderResult<SideBarEntryItem[]> {
        if (!element) {
          this.rootSideBars = [];
        }
        const times = Object.keys(this.history).sort(
          (b, c) => Number(c) - Number(b)
        );
    
        times.forEach((v) => {
          const { relativePath } = this.history[v];
          const children = new SideBarEntryItem(
            relativePath,
            dayjs(Number(v) * 1000).format("YYYY-MM-DD HH:mm"),
            vscode.TreeItemCollapsibleState.None
          );
          children.command = {
            command: "showYapiWebview", // 替换为你的命令ID
            title: "", // 这里不需要标题
            arguments: [v], // 传递一个参数给命令处理器
          };
          // 添加到rootSideBars，以便展示
          this.rootSideBars.push(children);
        });
    
        return this.rootSideBars;
    }
}