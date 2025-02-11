import { Fail, Success } from "@type";
import * as vscode from "vscode";


function renderFailNode(fail: Fail) {
  const l = fail.length - 1;
  return fail
    .map(({ path, method, reason, filePath }, index) => {
      return `<li style="list-style: none; padding-bottom: 12px; padding-top: 12px; ${
        index === l ? "" : "border-bottom: 1px dotted;"
      }"">
        <p style="margin: 4px;"><span style="font-weight: 500;">请求地址：</span>${path}</p>
    <p style="margin: 4px;"><span style="font-weight: 500;">请求方法：</span>${method}</p>
      <p style="margin: 4px;"><span style="font-weight: 500;">失败原因：</span>${reason}</p>
      <p class="open-file" data-filepath="${filePath}" data-search="${path}" style="margin: 4px;text-decoration: underline; cursor: pointer;" onclick="openFileAndLocateString('${filePath}', '${path}')">打开文件</p>
      </li>`;
    })
    .join("");
}


function renderSuccessNode(success: Success) {
  const l = success.length - 1;
  return success
    .map(({ path, method, filePath }, index) => {
      return `<li style="list-style: none; padding-bottom: 12px; padding-top: 12px;${
        index === l ? "" : "border-bottom: 1px dotted;"
      }"">
          <p style="margin: 4px;"><span style="font-weight: 500;">请求地址：</span>${path}</p>
      <p style="margin: 4px;"><span style="font-weight: 500;">请求方法：</span>${method}</p>
        <p class="open-file" data-filepath="${filePath}" data-search="${path}" style="margin: 4px;text-decoration: underline; cursor: pointer;" onclick="openFileAndLocateString('${filePath}', '${path}')">打开文件</p>
        </li>`;
    })
    .join("");
}

/**
 * 显示替换结果
 */
export function createWebviewPanel(
  context: vscode.ExtensionContext,
  success: Success,
  fail: Fail,
  total: number
) {
  const panel = vscode.window.createWebviewPanel(
    "yapiReplaceAnyWebview", // 类型
    "替换结果", // 标题
    vscode.ViewColumn.Beside, // 展示位置，使用Beside尝试模拟抽屉效果
    {
      enableScripts: true,
    } // 选项
  );

  panel.webview.html = getWebviewContent(success, fail, total);

  panel.webview.onDidReceiveMessage(
    async (message) => {
      if (message.command === "openFileAndLocateString") {
        await openFileAndLocateString(message.filePath, message.searchString);
      }
    },
    undefined,
    context.subscriptions
  );

  async function openFileAndLocateString(
    filePath: string,
    searchString: string
  ) {
    // 尝试打开文件
    const document = await vscode.workspace.openTextDocument(filePath);
    const editor = await vscode.window.showTextDocument(document);

    // 搜索文件中的字符串
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      if (line.text.includes(searchString)) {
        // 找到字符串，创建一个位置标识
        const startPos = new vscode.Position(
          i,
          line.text.indexOf(searchString)
        );
        const endPos = new vscode.Position(
          i,
          line.text.indexOf(searchString) + searchString.length
        );
        const range = new vscode.Range(startPos, endPos);

        // 移动编辑器的视图焦点到指定位置
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

        // 高亮显示找到的字符串
        editor.selection = new vscode.Selection(startPos, endPos);
        break;
      }
    }
  }

  function getWebviewContent(success: Success, fail: Fail, total: number) {
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Custom Panel</title>
        </head>
        <body>
        <div style="display: flex; flex-direction: column;">
          <p style="font-size: 20px; margin-top: 32px; text-align: center; ">当前文件需要替换接口：${total}</p>
          <div style="display: flex; flex-direction: column; margin-left: 64px; justify-content: space-start; flex-wrap: wrap;">
              <div style="margin-right: 60px; display: flex; flex-direction: column; justify-content: center; flex: 1;">
                  <div style="font-size: 20px;  text-align: center; color: rgb(15, 191, 96); ">
                    成功  ${success.length}
                 </div>
                   ${
                     success?.length
                       ? `<ul style="font-size: 16px; margin-top: 32px;">${renderSuccessNode(
                           success
                         )}</ul>`
                       : ""
                   }
              </div>
               <div style="margin-right: 60px; display: flex; flex-direction: column; justify-content: center; flex: 1;">
                  <div style="font-size: 20px; color: rgb(238, 77, 56); text-align: center; ">失败  ${
                    fail.length
                  }</div>
                    ${
                      fail?.length
                        ? `<ul style="font-size: 16px; margin-top: 32px;">${renderFailNode(
                            fail
                          )}</ul>`
                        : ""
                    }
              </div>
          </div>
          </div>
        </body>
        <script>
          window.addEventListener('DOMContentLoaded', (event) => {
              document.body.addEventListener('click', (event) => {
              if (event.target.matches('.open-file')) {
                  const filePath = event.target.getAttribute('data-filepath');
                  const searchString = event.target.getAttribute('data-search');
                  // 使用 VS Code API 发送消息
                  const vscode1 = acquireVsCodeApi();
                  vscode1.postMessage({
                      command: 'openFileAndLocateString',
                      filePath,
                      searchString
                  });
              }
              });
          });
          </script>
        </html>`;
  }
}
