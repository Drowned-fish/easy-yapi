import { replaceApi, replaceFile, add  } from ".";
import * as path from "node:path";
import * as fs from "node:fs";
import * as vscode from "vscode";
import dayjs from "dayjs";
import { getYapiJsonPath } from "@utils/get";
import { History } from "@type";
import { createWebviewPanel } from "view";
import { SideBarEntry } from "view/history";

const history: History = {};

export function activate(context: vscode.ExtensionContext) {
	let loading = false;
    // 侧边栏
	const sidebarArvinjunGeneral = new SideBarEntry(history, context);
	vscode.window.registerTreeDataProvider("killAny", sidebarArvinjunGeneral);

    const addCommand = vscode.commands.registerCommand("easy-yapi.add", add);
    const replaceApiCommand = vscode.commands.registerCommand("easy-yapi.replaceApi", replaceApi);
    const replaceFileCommand = vscode.commands.registerCommand("easy-yapi.replaceFile", async() => {
		// 前置判断
		const yapiJsonPath = getYapiJsonPath();
		if (!yapiJsonPath || !fs.existsSync(yapiJsonPath)) {
		  vscode.window.showErrorMessage("请先在根目录创建yapi.json");
		  return;
		}
  
		let content:
		  | {
			  list?: Array<{ project_id: string | number; token: string }>;
			  import?: string;
			}
		  | undefined;
		let configList:
		  | Array<{ project_id: string | number; token: string }>
		  | undefined;
		try {
		  content = JSON.parse(fs.readFileSync(yapiJsonPath, "utf8"));
		  configList = content?.list;
  
		  if (!content || !configList?.length) {
			vscode.window.showErrorMessage("yapi.json格式不对，请重新配置");
			return;
		  }
		  if (!configList[0]?.project_id || !configList[0]?.token) {
			vscode.window.showErrorMessage("yapi.json缺失project_id或token");
			return;
		  }
		} catch (e) {
		  vscode.window.showErrorMessage("yapi.json格式不对，请重新配置");
		  return;
		}
  
		const editor = vscode.window.activeTextEditor;
  
		if (!editor) {
		  vscode.window.showErrorMessage("请在TypeScript文件中执行命令");
		  return;
		}
  
		// 当前文件是否ts
		const filePath = editor.document.uri.fsPath;
		const extension = path.extname(filePath);
		if (extension !== ".ts") {
		  vscode.window.showErrorMessage("请在TypeScript文件中执行命令");
		  return;
		}
  
		try {
		  loading = true;
		  vscode.window.showInformationMessage("开始替换...");
		  const { successList, failList, total } = await replaceFile();
  
		  // 设置历史记录
		  const folders = vscode.workspace.workspaceFolders;
		  const root = folders && folders.length ? folders[0].uri.fsPath : null;
		  const filePath = successList?.length
			? successList[0].filePath
			: failList?.length
			? failList[0].filePath
			: "";
  
		  if (root && filePath) {
			const relativePath = path.relative(root, filePath);
			history[dayjs().unix()] = {
			  successList,
			  failList,
			  total,
			  relativePath,
			  absolutePath: filePath,
			};
			sidebarArvinjunGeneral.updateHistory(history);
		  }
  
		  console.log(history);
		  if (successList.length === 0 && failList.length === 0) {
			vscode.window.showInformationMessage("当前文件没有需要替换的接口");
			return;
		  }
		  createWebviewPanel(context, successList, failList, total);
		} finally {
		  loading = false;
		}
	});

	const historyCommand = vscode.commands.registerCommand("easy-yapi.history", async (timestamp: number) => {
		const { successList, failList, total } = history[timestamp];
		createWebviewPanel(context, successList, failList, total);
	});
	context.subscriptions.push(addCommand, replaceApiCommand, replaceFileCommand, historyCommand);
}
