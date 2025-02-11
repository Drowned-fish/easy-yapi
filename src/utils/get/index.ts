import * as vscode from 'vscode';
import * as path from 'node:path';
import { Fail, SuccessItem } from '@type';
import { search } from '@utils/search';
import { writeTypesToFile } from '@utils/file';


function getWorkspacePath() {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
        return;
    }
    // 默认使用第一个工作区文件夹
    return workspaceFolders[0].uri.fsPath;
}

/** 读取cache文件路径 */
export function getApiCacheJsonPath() {
    // 默认使用第一个工作区文件夹
    const workspacePath = getWorkspacePath();
    if (!workspacePath) {
        return;
    }
    return path.join(workspacePath,  '.apiCache.json');
}


/** 读取配置文件路径 */
export function getYapiJsonPath() {
    // 默认使用第一个工作区文件夹
    const workspacePath = getWorkspacePath();
    if (!workspacePath) {
        return;
    }
    return path.join(workspacePath,  'yapi.json');
}

/** 读取.gitignore文件路径 */
export function getGitIgnorePath() {
    // 默认使用第一个工作区文件夹
    const workspacePath = getWorkspacePath();
    if (!workspacePath) {
        return;
    }
    return path.join(workspacePath,  '.gitignore');
}


/**
 * 根据请求路径和请求函数字符串生成类型以及替换后的函数字符串
 */
export async function getTypeAndNewFnText(apiPath: string, apiFnStr: string, method: string, fail: Fail, filePath: string) {
    const defaultRes = { replaceText: "", typeNames: [] };
    const failItem: SuccessItem = {
        path: apiPath,
        method,
        filePath
    };

    if (!apiFnStr) {
        fail.push({
            ...failItem,
            reason: "path解析错误"
        });
        return defaultRes;
    }

    if (!["GET", "POST"].includes(method)) {
        fail.push({
           ...failItem,
            reason: "暂时只支持GET和POST"
        });
        return defaultRes;
    }

    const typeString = await search(apiPath, method, failItem, fail);
    if (!typeString) {
        return defaultRes;
    }

    const { query, response } = typeString;
    const typeNames = [];

    // 将类型写入ts文件
    if (query.apiReq) {
        writeTypesToFile(query.apiReq, query.typeName, failItem, fail);
        typeNames.push(query.typeName);
    }

    if (response.apiRes) {
        writeTypesToFile(response.apiRes, response.typeName, failItem, fail);
        typeNames.push(response.typeName);
    }
    return {
        typeNames,
        replaceText: apiFnStr
          .replace(/(\w+:\s*)(any)/, (_, $1) => {
            if (query.apiReq) {
              return `${$1}${query.typeName}`;
            }
            // 没参数
            else {
              return "";
            }
          })
          .replace(/Promise<([a-zA-Z0-9_]+<any>|any)>/, () => {
            if (response?.apiRes) {
              return `Promise<${response?.typeName}>`;
            }
            return `Promise<void>`;
          })
          .replace(/,\s*\{\s*params\s*\}/, (_) => {
            // 对于没有参数的case, 应该删除参数
            if (!query.apiReq) {
              return "";
            }
            return _;
          }),
      };
}
    
/**
* 从函数字符串解析出方法和路径
*/
// TODO 这种方式的结果可能存在请求方法错误的原因
export const getPathAndMethod = (apiFnStr: string) => {
    const regex = /\.(get|post)\((['"`])(.*?)\2/g;
    let match;
    if ((match = regex.exec(apiFnStr)) !== null) {
    }
    return match
    ? { method: match?.[1].toUpperCase(), path: match?.[3] }
    : { method: "", path: "" };
};