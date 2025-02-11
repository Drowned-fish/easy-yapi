import { Scheduler } from "timers/promises";

// yapi平台接口参数类型
type YapiType = "integer" | "number" | "object" | "array" | "boolean" | "string"


export interface BodySchema {
    properties: Record<string, BodySchema>;
    required: Array<string>;
    items: BodySchema;
    type: YapiType;
}

export type ReqQuery = Array<{
    required: "1" | "0"; // 1表示必传
    name: string; // 属性名
    desc: string; // 描述
}> 

export type ResBody = {
    properties: {
        data: BodySchema;
    }
}

export interface Api {
    req_query: ReqQuery;
    req_body_other: string;
    res_body: string;
    method: "GET" | "POST";
    path: string;
    [key: string]: any;
}

// 替换成功类型
export type SuccessItem = {
    path: string; // 接口地址
    method: string; // 接口方法
    filePath: string; // 当前接口所在文件路径
}
export type Success = Array<SuccessItem>

// 替换失败类型
export type Fail = Array<SuccessItem & {
    reason: string; // 替换失败原因
}>;


// 替换历史记录类型
export type History = {
    // 日期
    [key: string]: {
        successList: Success;
        failList: Fail;
        total: number;
        relativePath: string;
        absolutePath: string;
    }
}