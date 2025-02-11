import { checkEnvironment, checkNeedReplace, checkUserInput } from "@utils/check";
import { getYapiContent, writeTypesToFile } from "@utils/file";
import { searchApi } from "@utils/search";
import { getReqType, getResType } from "@utils/generate";
import { Api } from "@type";
import { insertOrUpdateImportStatement } from "@utils/insertType";
import * as vscode from 'vscode';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';

/**
 * 替换单个接口
 * (光标圈选一个接口，对选中接口进行类型替换)
 */
export async function replaceApi() {
    if (!checkEnvironment()) {
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    const { selection, document } = editor;
    const documentText = document.getText();

    // 根据行号，获取文本（原因是选中的文本在文件内可能出现重复）
    const startLine = selection.start.line;
    const selectedText = document.lineAt(startLine).text; // 不管选了多少行，只以第一行为主

    if (!selectedText) {
        vscode.window.showErrorMessage("请选择要替换的接口");
        return;
    }

    let ast: any;
    try {
        ast = parser.parse(documentText, {
            sourceType: 'module',
            plugins: ['typescript'],
        });
    } catch(error) {
        vscode.window.showErrorMessage("文件解析失败");
        return;
    }

    let functionStartLine = -1;
    let functionEndLine = -1;
    let functionText = "";

    try {
        // 遍历ast寻找当前行所在的函数
        traverse(ast, {
            enter(path) {
                const { node } = path;
                if (
                node.loc &&
                selection.start.line + 1 >= node.loc.start.line &&
                selection.end.line + 1 <= node.loc.end.line
                ) {
                if (
                    path.isFunctionDeclaration() ||
                    path.isArrowFunctionExpression() ||
                    path.isFunctionExpression()
                ) {
                    functionStartLine = node.loc.start.line;
                    functionEndLine = node.loc.end.line;
                    // 获取函数的文本
                    functionText = document.getText(
                    new vscode.Range(
                        new vscode.Position(functionStartLine - 1, 0),
                        new vscode.Position(functionEndLine, 0)
                    )
                    );
                    path.stop(); // 找到了就停止遍历
                }
                }
            },
        });
    }
    catch(error) {
        vscode.window.showErrorMessage("文件解析失败");
        return;
    }

    if (!checkNeedReplace(functionText)) {
        vscode.window.showErrorMessage("当前接口不需要替换");
        return;
    }

    if (functionStartLine === -1) {
        const userInput = await vscode.window.showInputBox({
            prompt: "请输入yapi接口链接",
            placeHolder: "输入链接，自动替换当前接口",
        });

        const inputIsLegal = checkUserInput(userInput);
        if (!inputIsLegal) {
            return;
        }

        // 获取配置文件
        const yapiContent = getYapiContent();
        if (!yapiContent) {
            return;
        }
        const { projectId, id } = inputIsLegal;
        const apiRes = await searchApi(yapiContent.configList, String(projectId), String(id));
        if (!apiRes) {
            vscode.window.showErrorMessage("搜索失败，请检查yapi地址和token是否正确");
            return;
        }

        // 生成类型
        const query = getReqType(apiRes as Api);
        const res = getResType(apiRes as Api);

        const typeNames: string[] = [];

        // 将类型写入types.ts
        if (query.apiReq) {
        const successWrite = writeTypesToFile(
            query.apiReq,
            query.typeName
        );
        if (!successWrite) {
            vscode.window.showErrorMessage("生成代码失败，存在同名interface");
            return;
        }
        typeNames.push(query.typeName);
        }

        if (res.apiRes) {
        const successWrite = writeTypesToFile(res.apiRes, res.typeName);
        if (!successWrite) {
            vscode.window.showErrorMessage("生成代码失败，存在同名interface");
            return;
        }
        typeNames.push(res.typeName);
        }

        const nextFnStr = functionText
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
            if (res?.apiRes) {
            return `Promise<${res?.typeName}>`;
            }
            return `Promise<void>`;
        })
        .replace(/,\s*\{\s*params\s*\}/, (_) => {
            // 对于没有参数的case, 应该删除参数
            if (!query.apiReq) {
            return "";
            }
            return _;
        });

        const startPosition = new vscode.Position(functionStartLine - 1, 0); // 减1因为VS Code的行数是从0开始的
        const endPosition = new vscode.Position(
        functionEndLine - 1,
        document.lineAt(functionEndLine - 1).text.length
        ); //
        const textRange = new vscode.Range(startPosition, endPosition);

        const editApplied = await editor.edit((editBuilder) => {
        editBuilder.replace(textRange, nextFnStr);
        });

        console.log(nextFnStr);

        if (!editApplied) {
        vscode.window.showErrorMessage("替换失败");
        }

        await insertOrUpdateImportStatement(typeNames, "", "", editor);
    } else {
        vscode.window.showErrorMessage("No function found for the current line.");
    }
}