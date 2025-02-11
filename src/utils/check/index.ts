import { getYapiJsonPath } from "@utils/get";
import { getYapiContent } from "@utils/file";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

/**
 * 检查当前环境是否符合替换
 */
export function checkEnvironment(): boolean {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage("请在ts文件中执行命令");
        return false;
    }

    const yapiJsonPath = getYapiJsonPath();
    if (!yapiJsonPath || !fs.existsSync(yapiJsonPath)) {
        vscode.window.showErrorMessage("请先在根目录创建yapi.json文件");
        return false;
    }

    const yapiContent = getYapiContent();
    if (!yapiContent) {
        return false;
    }

    const { configList } = yapiContent;

    if (!configList[0]?.project_id || !configList[0]?.token) {
        vscode.window.showErrorMessage("yapi.json文件格式错误");
        return false;
    }

    // 当前文件是否ts
    const filePath = editor.document.uri.fsPath;
    if (path.extname(filePath) !== ".ts") {
        vscode.window.showErrorMessage("请在ts文件中执行命令");
        return false;
    }
    
    return true;
}


/**
 * 检查用户输入
 */
export function checkUserInput(input?: string) {
    if (!input) {
        return false; 
    }
    // 检查输入是否yapi url
    if (!(input.trim().startsWith("your yapi api path"))) {
        vscode.window.showErrorMessage("请输入正确的yapi url路径");
        return false
    }
    const url = input?.trim();
    const regex = /project\/(\d+)\/interface\/api\/(d+)/;

    const match = url.match(regex);
    if (!match) {
        vscode.window.showErrorMessage("请输入正确的yapi url路径");
        return false;
    }

    // 从接口地址解析出当前接口所在project_id和当前project下接口唯一id
    const [_, projectId, id] = match;
    if (!projectId || !id) {
        vscode.window.showErrorMessage("请输入正确的yapi url路径");
        return false;
  
    }
    return {
        projectId,
        id
    };
}

/**
 * 
 * 检查一个接口是否需要替换
 */
export function checkNeedReplace(content: string): boolean {
    return (content.replace(/(\w+:\s*)(any)/, (_, $1) => {
        return `${$1}`;
    }).replace(/Promise<([a-zA-Z0-9_]+<any>|any)>/, (_, $1) => {
        return $1;
    })) !== content;
}