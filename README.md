# 注意

这个插件无法直接使用，只供学习使用。

# Easy Yapi

![Image description](https://github.com/Drowned-fish/markdown-images/blob/master/kmstd-ub9vg.gif?raw=true)


## 第一步：在项目根目录配置yapi.json

这一步是给插件权限去拉取接口

```json
{
    "list": [
        {
            "project_id": "you yapi project id",
            "token": "you yapi project token"
        }
    ]
}
```

请求语句同样可以在 `yapi.json` 配置，例如：
```json
{
    // ....
    "import": import request from '@common/utils/request'
    // or 
    // "import": import { request } from '@common/utils/request'
}
```
当配置 `import` 之后，`Add Api` 命令会使用该 import 语句中的名称 `request`


另外，往往会出现`yapi`定义的接口地址和实际使用接口不一致，可以在`yapi.json`增加`replacePath`重写：

```json
{
    //...
    "replacePaths": [["api/admin", "api/admin/ss"]]
}
```
上面的配置，会在第一轮搜索不到后，替换后进行第二轮搜索，支持多个.

**注意：replacePaths不要添加前置`/`和后置`/`**

举个例子：

- 原有接口 `api/admin/a/list/` 会被替换为 `api/admin/ss/a/list/`
- 原有接口 `/api/admin/a/list/` 会被替换为 `/api/admin/ss/a/list/`
- 原有接口 `pre/api/admin/a/list/` 会被替换为 `pre/api/admin/ss/a/list/`
- 原有接口 `pre/api/admin/ss/list/` 因为包含了`api/admin/ss/ss/list/`所以不做替换


## 替换

在需要替换的ts文件内，右键选择 `替换当前文件所有any` 命令


## 新增接口

打开ts文件，右键选择 `新增接口` 命令。

在输入框中输入yapi地址，会自动在当前文件生成接口代码
