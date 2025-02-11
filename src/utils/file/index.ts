import { getYapiJsonPath } from '@utils/get';
import { Api, Fail, SuccessItem } from '@type';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as vscode from 'vscode';

/**
 * 获取easy-yapi配置文件内容
 */
export function getYapiContent() {
    const yapiJsonPath = getYapiJsonPath();
    if (!yapiJsonPath || !fs.existsSync(yapiJsonPath)) {
        vscode.window.showErrorMessage("请先在根目录创建yapi.json文件");
        return false;
    }
    let content: {
        list?: Array<{ project_id: string | number; token: string}>;
        import?: string;
    } | undefined;
    let configList : Array<{ project_id: string | number; token: string}> | undefined;

    try {
        content = JSON.parse(fs.readFileSync(yapiJsonPath, 'utf-8'));
        configList = content?.list;

        if (!content || !configList?.length) {
           throw new Error();
        }
    } catch (error) {
        vscode.window.showErrorMessage("yapi.json文件格式错误");
        return false;
    }
    return {
       content,
       configList
    };
}


/**
 * 检查当前文件是否已经包含同名类型
 */

export function checkIncludeTypes(typeName: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return false;
    }

    const currentFilePath = editor.document.uri.fsPath;
    const currentDir = path.dirname(currentFilePath);
    const targetFilePath = path.join(currentDir, "types.ts");

    if (fs.existsSync(targetFilePath)) {
        const fileContent = fs.readFileSync(targetFilePath, "utf-8");
        if (fileContent.includes(typeName)) {
            return true;
        }
    }

    return false;
}

/**
 * 将类型写入types.ts文件
 */
export function writeTypesToFile(content: string, typeName: string, failItem?: SuccessItem, fail?: Fail) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return false;
    }

    
    const currentFilePath = editor.document.uri.fsPath;
    const currentDir = path.dirname(currentFilePath);
    const targetFilePath = path.join(currentDir, "types.ts");

    // types.ts文件已经存在
    if (fs.existsSync(targetFilePath)) {
        const fileContent = fs.readFileSync(targetFilePath, "utf-8");
        if (!fileContent.includes(typeName)) {
            try {
                fs.appendFileSync(targetFilePath, content);
                editor.document.save();
                return true;
            } catch(error: any) {
                fail && failItem && fail.push({
                    ...failItem,
                    reason: "写入types.ts文件失败" + error.message
                });
                return false;
            }
        } 
        else {
            fail && failItem && fail.push({
                ...failItem,
                reason: "存在同名TS类型"
            });
            return false;
        }
    
    }
    // types.ts文件不存在
    else {
        try {
            fs.writeFileSync(targetFilePath, content);
            editor.document.save();
            return true;
        } catch(error: any) {
            fail && failItem && fail.push({
               ...failItem,
                reason: "写入types.ts文件失败" + error.message
            });
            return false;
        }
    }
    return false;
}


/**
 * 缓存，key是project_id，value是缓存数据
 */
export function writeApiCacheJson(filePath: string, tempData: {[key: string]: Api[]}) {
    fs.writeFileSync(filePath, JSON.stringify(tempData, null, 2));
}