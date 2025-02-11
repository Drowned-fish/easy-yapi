import { capitalizeFirstLetter, getReqType, getResType, lowerCaseFirstLetter, toCamelCase } from "@utils/generate";
import { Api } from "@type";
import { insertOrUpdateImportStatement } from "@utils/insertType";
import { checkEnvironment, checkUserInput } from "@utils/check";
import { checkIncludeTypes, getYapiContent, writeTypesToFile } from "@utils/file";
import { searchApi } from "@utils/search";
import { findAllFunction } from "@utils/parse";
import { getPathAndMethod } from "@utils/get";
import * as vscode from 'vscode';

/**
 * 新增接口
 * (通入将接口url输入，自动生成类型，同时在当前ts文件中插入接口代码并引入生成的类型)
 */
export async function add() {
    if (!checkEnvironment()) {
        return;
    }

    const userInput = await vscode.window.showInputBox({
        prompt: "请输入yapi接口链接",
        placeHolder: "输入链接，自动生成接口代码",
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

    const apiRes = await searchApi(yapiContent.configList, String(inputIsLegal.projectId), String(inputIsLegal.id));
    if (!apiRes) {
        vscode.window.showErrorMessage("搜索失败，请检查yapi地址和token是否正确");
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    // 扫描整个文件
    const allFns = findAllFunction(editor.document.getText());
    // 判断当前接口是否已经存在当前文件
    for (const fnStr of allFns) {
        try {
            const { path, method } = getPathAndMethod(fnStr);
            if (method !== "" && path !== "" && [path, `/${path}`, `${path}/`,`/${path}/`].includes(apiRes.path) && method === apiRes.method) {
                vscode.window.showErrorMessage("当前文件已经存在该接口");
                return;
            }
        }
        catch(error) {
            console.log(error);
        }
       
    }

    // 生成类型
    const query = getReqType(apiRes);
    const res = getResType(apiRes);
        

    // 如果已有类型则不生成代码
    if (query.apiReq) {
        if (checkIncludeTypes(query.typeName)) {
        vscode.window.showErrorMessage("生成代码失败，存在同名interface");
        return;
        }
    }

    // 如果已有类型则不生成代码
    if (res.apiRes) {
        if (checkIncludeTypes(res.typeName)) {
        vscode.window.showErrorMessage("生成代码失败，存在同名interface");
        return;
        }
    }

    const typeNames: string[] = [];

    // 将类型写入types.ts
    if (query.apiReq) {
        const successWrite = writeTypesToFile(query.apiReq, query.typeName);
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

    const { path, method } = apiRes;

    // 生成函数名
    const vals = path.split("/");
    let lastVal = capitalizeFirstLetter(toCamelCase(vals[vals.length - 1]));
    let secondVal = capitalizeFirstLetter(toCamelCase(vals[vals.length - 2]));

    // 有多种命名格式，这里命名不好，可以试试wx添加好友那种，由用户来选择
    // get请求 /cashback_task/   /cashback_task/list
    // post请求 /cashback_task/create
    let fnName = `${
        (method as string).toLowerCase() === "get" ? "get" : lastVal
    }`;

    fnName += `${
        (method as string).toLowerCase() === "get"
        ? `${secondVal}${lastVal}`
        : secondVal
    }`;

    fnName = lowerCaseFirstLetter(fnName);

    // 自定义引入import语句或者默认
    const importStr =
        yapiContent?.content.import ||
        `import { financeRequest } from '@services/request'`;

    // 从importStr中取出请求
    // import a from '@services/request'
    // import { a } from '@services/request'
    const requestRegex =
        /import\s+(?:\{\s*([^}]+?)\s*\}|\b([^{}\s]+))\s+from\s+['"][^'"]+['"];?/g;

    const requestNameMatch = requestRegex.exec(importStr);
    if (!requestNameMatch) {
        vscode.window.showErrorMessage("yapi.json import配置错误");
        return;
    }
    
    const requestName = (requestNameMatch[1] || requestNameMatch[2])
        .split(",")[0]
        .trim();

    // 将生成的代码写入当前文件
    const generateCode = `\n// ${userInput}\nexport function ${fnName}(\n${
        query.apiReq && query.typeName ? `params: ${query.typeName}` : ""
    }\n): Promise<${
        res.apiRes && res.typeName ? res.typeName : "void"
    }> {\nreturn ${requestName}.${(method as string).toLowerCase()}("${path}", ${
        query.apiReq && query.typeName
        ? `${
            (method as string).toLowerCase() === "get" ? `{ params }` : ` params `
            }`
        : ""
    });\n}`;

    const document = editor.document;
    const lastLine = document.lineAt(document.lineCount - 1);
    const lastLineEnd = lastLine.range.end;

    await editor.document.save(); // 先保存，格式化文档

    // 将生成的代码插入
    await editor.edit((editBuilder) => {
        editBuilder.insert(lastLineEnd, generateCode);
    });

    // 插入import语句
    await insertOrUpdateImportStatement(typeNames, importStr, requestName, editor);
}