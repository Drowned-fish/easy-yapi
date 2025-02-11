import axios from 'axios';
import * as vscode from 'vscode';
import * as fs from 'node:fs';
import { Api, Fail, SuccessItem } from '@type';
import { getReqType, getResType } from '@utils/generate';
import { getApiCacheJsonPath, getGitIgnorePath, getYapiJsonPath } from '@utils/get';
import { writeApiCacheJson } from '@utils/file';


/**
 * 搜索单个接口
 */
export async function searchApi(
    configList: Array<{
        project_id: string | number;
        token: string;
    }>,
    projectId: string,
    id: string
) {
   const token = configList.find(({ project_id}) => {
    return String(project_id) === projectId;
   })?.token;

   // yapi open api
   const response = await axios.get(`https://apidoc/xxxx.com/api/interface/get?id=${id}&token=${token}`);
   return response.data?.data;
}


/**
 * 搜索所有接口
 */
export async function searchApiList(project_id: string, token: string) {
    const response = await axios.get(``);
    return response.data.data.list;
}

/**
 * 搜索path以及method得到请求和响应类型
 */
export async function search(
    path: string,
    method: string,
    failItem: SuccessItem,
    fail: Fail
) {
    const yapiJsonPath = getYapiJsonPath();
    if (!yapiJsonPath || !fs.existsSync(yapiJsonPath)) {
        vscode.window.showErrorMessage("请先在根目录创建yapi.json文件");
        return;
    }

    let configList: Array<{project_id: string; token: string}> = [];
    let replacePaths: Array<Array<string>> = [];

    try {
        const content = JSON.parse(fs.readFileSync(yapiJsonPath, 'utf-8'));
        configList = content?.list; // 可能配了多个project
        replacePaths = content?.replacePaths;

        if (!content ||!configList?.length) {
            throw new Error();
        }
    } catch (error) {
        vscode.window.showErrorMessage("yapi.json文件格式错误");
        return;
    }

    let data: any = [];
    const cachePath = getApiCacheJsonPath(); // 读取缓存路径

    if (cachePath) {
        const hasCacheFile = fs.existsSync(cachePath);
        let content = hasCacheFile ? JSON.parse(fs.readFileSync(cachePath, 'utf-8')) : {};

        // 缓存中没有数据，或者配置文件中新增了project_id
        const isNoCache = configList.some(v => !(v.project_id in content));

        // 更新缓存
        if (isNoCache) {
            const val = await Promise.all(configList.map(v => searchApiList(v.project_id, v.token)));

            // 将cache文件写入.gitignore
            const gitignorePath = getGitIgnorePath();
            if (gitignorePath && fs.existsSync(gitignorePath)) {
                const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
                // 防止多次写入
                if(!gitignoreContent.includes('.apiCache.json')) {
                    fs.appendFileSync(gitignorePath, '\n.apiCache.json');
                }
            }

            // 更新缓存内容
            content = configList.reduce((pre, cur, index) => {
                pre[cur.project_id] = val[index];
                return pre;
            }, {} as {[key: string]: Api[]});

            // 写入缓存
            writeApiCacheJson(cachePath, content);
        }

        configList.forEach(v => {
            data = data.concat(content[v.project_id]); 
        })
    }
    
    // 匹配不到接口
    let item = data.find((v: any) => {
        return [path, `/${path}`, `${path}`, `/${path}/`].includes(v.path.trim()) && v.method === method;
    });

    if (!item) {
        let canFind = false;
        // 替换
        if (replacePaths?.length) {
           for (let i = 0; i < replacePaths.length; i++) {
            const [from, to] = replacePaths[i];
            if (!path.includes(from)) {
                continue;
            }

            const newPath = path.replace(from, to);
            // 替换后第二轮匹配
            item = data.find((v: any) => {
                return [newPath, `/${newPath}`, `${newPath}`, `/${newPath}/`].includes(v.path.trim()) && v.method === method;
            });

            if (item) {
                // 匹配成功
                canFind = true;
                break;
            }
           }
        }

        if (!canFind) {
            fail.push({
                ...failItem,
                reason: "搜索不到接口"
            });
            return;
        }
    }

    const query = getReqType(item as Api);
    const res = getResType(item as Api);

    return {
        query,
        response: res,
    };
}