import { Fail, Success } from "@type";
import { findAllFunction, findFunctionContainingSelection } from "@utils/parse";
import { checkNeedReplace } from "@utils/check";
import { getPathAndMethod, getTypeAndNewFnText } from "@utils/get";
import { insertOrUpdateImportStatement } from "@utils/insertType";
import * as vscode from 'vscode';
import { all } from "axios";

/**
 * 替换整个文件内所有带any类型的接口
 */
export async function replaceFile() {
    const failList: Fail = [];
    const successList: Success = [];

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return { successList, failList, total: 0 };
    }

    // 扫描整个文件
    const allFns = findAllFunction(editor.document.getText()).filter(fn => {
        return checkNeedReplace(fn);
    });

    const filePath = editor.document.uri.fsPath; // 绝对路径
    const importTypes: string[] = []; // 需要import的类型

    try {
        for (const fnStr of allFns) {
           try {
               const { path, method } = getPathAndMethod(fnStr);
               const { replaceText, typeNames } = await getTypeAndNewFnText(path, fnStr, method, failList, filePath);

               if (!replaceText) {
                   continue; 
               }

               typeNames?.length && importTypes.push(...typeNames);

               const node = findFunctionContainingSelection(editor.document.getText(), fnStr);
               if (!node) {
                   continue;
               }

               const textRange = new vscode.Range(editor.document.positionAt(node.start), editor.document.positionAt(node.end));

               const editApplied = await editor.edit(editBuilder => {
                   editBuilder.replace(textRange, replaceText);
               });

               if (!editApplied) {
                   failList.push({
                       path,
                       method,
                       filePath,
                       reason: "执行vscode替换操作失败" 
                   })
               } else {
                    successList.push({
                        path,
                        method,
                        filePath, 
                    })
               } 
            }   catch(e) {
                    console.log("单个替换失败", e);
                }
           } 
        }
    catch(e) {
        console.log(e);
    }

    await insertOrUpdateImportStatement(importTypes, "", "", editor);

    return { successList, failList, total: allFns.length };

}