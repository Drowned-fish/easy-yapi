import {
    BodySchema,
    ReqQuery,
    Api,
    ResBody,
} from '@type';


const yapiTypeMapJs = {
    integer: "number",
    number: "number",
    object: "object",
    array: "array",
    boolean: "boolean",
    string: "string",
}

const notAtoms = ["array", "object"];

// 驼峰命名
export function toCamelCase(input: string): string {
    return input.replace(/-([a-z])/g, (_, p1) => p1.toUpperCase());
}

// 首字符大写
export function capitalizeFirstLetter(input: string): string {
    if (!input) {
        return input;
    }
    return input.charAt(0).toUpperCase() + input.slice(1);
}

// 首字符小写
export function lowerCaseFirstLetter(input: string): string {
    if (!input) {
        return input;
    }
    return input.charAt(0).toLowerCase() + input.slice(1);
}


// 给每一行增加空格
function addEmpty(content: string): string {
    return content.split('\n').map((v, i) => {
        return i === 0 && v === "" ? v : `${" ".repeat(2)}${v}`;
    }).join('\n');
}

// 生成TS类型
function getTypeString(schema?: BodySchema) {
    if (!schema) {
        return ""; // 发现有人不屑data... 兼容她
    }
    
    const { properties, required = [], items } = schema;
    // 两种情况，要么是properties，要么是items
    if (Object.keys(properties || {}).length === 0 && Object.keys(items || {}).length === 0) {
        return "";
    }
    let typeStr = ``;
    // 数组的形式，这种情况比较少见
    if (Object.keys(items || {}).length) {
        let curStr = ``;
        const firstType = items.type;
        if (!notAtoms.includes(firstType)) {
            // 基础类型, 直接拼
            curStr += yapiTypeMapJs[firstType];
        } else {
            // 非基础类型
            for (const [key, value] of Object.entries((items as BodySchema).properties)) {
                const itemType = items.type;
                const { type } = value;
                if(notAtoms.includes(type)) {
                    // 异常case，类型定义成object，但是没配任何属性
                    if (type === 'object') {
                        curStr = `\n${key}${required.includes(type) ? "" : "?"}: {${addEmpty(getTypeString(value) as string)}\n}`;  
                    } else {
                        if (notAtoms.includes(itemType)) {
                            if (itemType === "object") {
                                curStr = `\n${key}${required.includes(type)? "" : "?"}: Array<{${addEmpty(getTypeString(value.items) as string)}\n}>;`;
                            }
                            else if(itemType === "array"){
                                curStr = `\n${key}${required.includes(type)? "" : "?"}: Array<Array<${addEmpty(getTypeString(value.items) as string)}>>;\n`;
                            }
                        } 
                        else {
                            curStr = `\n${key}${required.includes(type)? "" : "?"}: Array<${yapiTypeMapJs[itemType]}>;`;
                        }
                    }
                    typeStr += curStr;
                } else {
                    typeStr += `\n${key}${required.includes(type)? "" : "?"}: ${yapiTypeMapJs[itemType]};`;
                }
            }
        }
        return `${typeStr.endsWith(";")? typeStr.slice(0, -1) : typeStr}[]`;
    
    }

     // 对象的形式
  for (const [key, value] of Object.entries(properties || {})) {
    const { type } = value;
    if (notAtoms.includes(type)) {
      let curStr = ``;
      // 异常case, 类型是object，但是里面没有任何东西
      if (type === "object") {
        curStr = `\n${key}${required.includes(key) ? "" : "?"}: {${addEmpty(
            getTypeString(value)
        )}\n};`;
      } else {
        const itemsType = value.items.type;
        if (notAtoms.includes(itemsType)) {
          if (itemsType === "object") {
            curStr = `\n${key}${
              required.includes(key) ? "" : "?"
            }: Array<{${addEmpty(getTypeString(value.items))}\n}>;`;
          } else if (itemsType === "array") {
            curStr = `\n${key}${required.includes(key) ? "" : "?"}: Array<Array<
                  ${addEmpty(getTypeString(value.items))}
            >>;\n`;
          }
        } else {
          curStr = `\n${key}${required.includes(key) ? "" : "?"}: Array<${
            yapiTypeMapJs[itemsType]
          }>;`;
        }
      }
      typeStr += curStr;
    } else {
        typeStr += `\n${key}${required.includes(key) ? "" : "?"}: ${
        yapiTypeMapJs[type]
      };`;
    }
  }
  return typeStr;
}


// 生成query interface
function getReqQueryType(req: ReqQuery) {
    if (req.length) {
      return req.reduce((tsStr, { name, required, desc }) => {
        let cur = `\n${name}${required === "1" ? "" : "?"}: `;
        let isNumber = false;
        if (
          name.includes("offset") ||
          name.includes("size") ||
          name.includes("number") ||
          name.includes("no") ||
          name.includes("num") ||
          name.includes("status") ||
          name.includes("version") ||
          name.includes("type")
        ) {
          cur += "number;";
          isNumber = true;
        } else if (desc) {
          const a = [
            "整数",
            "number",
            "Number",
            "integer",
            "Integer",
            "Intege",
            "int32",
          ];
          for (let i = 0; i < a.length; i++) {
            if (desc.includes(a[i])) {
              cur += "number;";
              isNumber = true;
              break;
            }
          }
          if (!isNumber) {
            cur += "string;";
          }
        } else if (!isNumber) {
          cur += "string;";
        }
        return tsStr + cur;
      }, "");
    }
    return "";
  }



// 获取req类型及interface 命名
export function getReqType(api: Api) {
    // 边界case: req_query是空数组的情况
    const { req_query, method, path, req_body_other } = api;
    const vals = path.split("/");
    let name = "";
    let tsStr = "";
  
    let lastVal = capitalizeFirstLetter(toCamelCase(vals[vals.length - 1]));
    let secondVal = capitalizeFirstLetter(toCamelCase(vals[vals.length - 2]));
    switch (method) {
      case "POST":
        name = `${lastVal}${secondVal}`;
        tsStr = req_body_other
          ? getReqBodyType(JSON.parse(req_body_other) as BodySchema)
          : "";
        break;
      case "GET":
        name = `${secondVal}${lastVal}`;
        tsStr = getReqQueryType(req_query);
        break;
    }
    return {
      typeName: `Api${name.trim()}Req`,
      apiReq: tsStr
        ? `\nexport interface Api${name.trim()}Req {${addEmpty(tsStr)}\n}\n`
        : "",
    };
  }


// 获取res类型及interface命名
export function getResType(api: Api) {
    const { method, res_body, path } = api;
    const vals = path.split("/");
  
    if (!res_body) {
      return {
        typeName: "",
        apiRes: "",
      };
    }
  
    const tsStr = getTypeString(
      (JSON.parse(res_body) as ResBody).properties?.data || {}
    );
    if (!tsStr) {
      return {
        typeName: "",
        apiRes: "",
      };
    }
  
    let name = "";
    let lastVal = capitalizeFirstLetter(toCamelCase(vals[vals.length - 1]));
    let secondVal = capitalizeFirstLetter(toCamelCase(vals[vals.length - 2]));
  
    switch (method) {
      case "POST":
        name = `${lastVal}${secondVal}`;
        break;
      case "GET":
        name = `${secondVal}${lastVal}`;
        break;
    }
  
    return {
      typeName: `Api${name.trim()}Res`,
      apiRes: `\nexport interface Api${name.trim()}Res {${addEmpty(tsStr)}\n}\n`,
    };
  }


  // 生成body请求类型
  function getReqBodyType(schema: BodySchema):string {
    return getTypeString(schema);
  }