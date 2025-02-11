import * as vscode from 'vscode';

/**
 * 插入import 语句
 */
export async function insertOrUpdateImportStatement(
    typeNames: string[],
    importStatement: string,
    requestName: string,
    editor?: vscode.TextEditor,
) {
    if (editor && typeNames.length) {
        const document = editor.document;
        const fullText = document.getText();
        // 匹配单引号或双引号，并确保结束引号与开始引号相匹配
        const importRegex =
          /(import\s+(type\s+)?\{\s*[^}]*)(}\s+from\s+(['"])\.\/types(\.ts)?['"]);?/g;
    
        let matchIndex = fullText.search(importRegex); // 使用search得到全局匹配的起始索引
    
        console.log("matchIndex", matchIndex);
    
        if (matchIndex !== -1) {
          // 已经有类型语句
          let matchText = fullText.match(importRegex)?.[0]; // 获取完整的匹配文本
    
          // 上面已经校验过，这里只是做一个类型守卫
          if (!matchText) {
            return;
          }
    
          // 去重，如果 import { a, b } from './types'中已经有typeNames中的类型，则不需要重复引入
          // existingTypes = ['a', 'b']
          const existingTypes = (
            /\{\s*([^}]+)\s*\}/g.exec(matchText)?.[1] as string
          )
            .split(",")
            .map((v) => v.trim());
    
          const uniqueTypeNames = typeNames.filter(
            (v) => !existingTypes.includes(v)
          );
    
          // 将生成的类型插入原有的import type语句中
          // 例如： import { a } from './types'
          // 生成了类型 b c 则变成 import { a, b, c } from './types'
          let updatedImport = matchText?.replace(
            importRegex,
            (_, group1, group2, group3) => {
              // group1 对应 $1，即 import 语句到第一个 "}" 之前的所有内容
              // group3 对应 $3，即 "}" 到语句末尾的部分
              return `${
                (group1.trim() as string).endsWith(",") ? group1 : `${group1}, `
              }${uniqueTypeNames.join(", ")} ${group3}`;
            }
          );
    
          // 计算确切的起始和结束位置
          let startPos = document.positionAt(matchIndex);
          let endPos = document.positionAt(matchIndex + matchText.length);
          let range = new vscode.Range(startPos, endPos);
    
          // 替换
          await editor.edit((editBuilder) => {
            editBuilder.replace(range, updatedImport as string);
          });
        } else {
          // 直接插入import type
          await editor.edit((editBuilder) => {
            editBuilder.insert(
              new vscode.Position(0, 0),
              `import type { ${typeNames.join(",")} } from './types';\n`
            );
          });
        }
    
        // importStatement导入语句需要进行判断再导入
        // 例如：import request from '@service/request';
        if (importStatement && requestName) {
          const importStatementRegex = new RegExp(
            `import\\s+(?:\\{\\s*${requestName}\\s*\\}|${requestName})\\s+from\\s+['"]([^'"]+)['"];?`
          );
    
          const match = importStatementRegex.exec(editor.document.getText());
          console.log("import语句", match);
          // 当前文件没有这个语句，插入
          if (!match) {
            await editor.edit((editBuilder) => {
              editBuilder.insert(new vscode.Position(0, 0), `${importStatement};\n`);
            });
          }
        }
    
        await editor?.document?.save();
      }
}