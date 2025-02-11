import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as vscode from 'vscode';

/**
 * 根据文件内容推出对于的函数字符串
 */ 
export const findFunctionContainingSelection = (
    code: string,
    selectionText: string
) => {
    try {
        const ast = parser.parse(code, {
            sourceType: 'module',
            plugins: ['typescript'],
        });

        let functionNode: any = null;

        traverse(ast, {
            enter(path: any) {
                if (path.node.type === "FunctionDeclaration" || path.node.type === "ArrowFunctionExpression") {
                    const { start, end } = path.node;
                    if (code.substring(start, end).includes(selectionText)) {
                        functionNode = path.node;
                        path.stop(); // 停止遍历
                    }
                }
            }
        });

        if (functionNode) {
            return functionNode;
        }
    } catch(error) {
        vscode.window.showErrorMessage("解析失败");
    }
    return null;
};



/**
 * 扫描整个文件
 */
export const findAllFunction = (code: string) => {
    const ast = parser.parse(code, {
        sourceType:'module',
        plugins: ['typescript'],
    });

    const allFn: string[] = []; 
    traverse(ast, {
        enter(path) {
            if (path.node.type === "FunctionDeclaration" || (path.node.type === "VariableDeclaration" && path.node.declarations[0].init?.type === "ArrowFunctionExpression")) {
                allFn.push(
                    code.substring(path.node.start as number, path.node.end as number)
                );
            }
        }
    });

    return allFn;
}