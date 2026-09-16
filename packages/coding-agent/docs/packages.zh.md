> 本文为 [packages.md](packages.md) 的中文译本。

> 可以让 pi 帮你创建 pi 软件包。请它把扩展、skill、prompt 模板或主题打包起来。

# Pi 软件包

Pi 软件包把扩展、skill、prompt 模板和主题打成包，便于通过 npm 或 git 分享。软件包可以在 `package.json` 的 `pi` 键下声明资源，也可以使用约定目录。

## 目录

- [安装与管理](#安装与管理)
- [软件包来源](#软件包来源)
- [创建 Pi 软件包](#创建-pi-软件包)
- [软件包结构](#软件包结构)
- [依赖](#依赖)
- [软件包过滤](#软件包过滤)
- [启用与禁用资源](#启用与禁用资源)
- [作用域与去重](#作用域与去重)

## 安装与管理

> **安全：** Pi 软件包拥有完整系统访问权限。扩展会执行任意代码，skill 也可以指示模型执行任何操作（包括运行可执行文件）。安装第三方软件包前请先审阅源代码。

```bash
pi install npm:@foo/bar@1.0.0
pi install git:github.com/user/repo@v1
pi install https://github.com/user/repo  # 原始 URL 也可以
pi install /absolute/path/to/package
pi install ./relative/path/to/package

pi remove npm:@foo/bar
pi list                     # 显示设置中已安装的软件包
pi update                   # 只更新 pi
pi update --all             # 更新 pi、更新软件包，并核对已固定的 git ref
pi update --extensions      # 只更新软件包并核对已固定的 git ref
pi update --models          # 只刷新模型目录
pi update --self            # 只更新 pi
pi update --self --force    # 即使当前已是最新也重新安装 pi
pi update npm:@foo/bar      # 更新单个软件包
pi update --extension npm:@foo/bar
```

这些命令用于管理 pi 软件包，`pi update` 也可以更新 pi CLI 本身。对于由实验性安装器管理的安装，`pi update` 会把已检查的精确版本装进带 lockfile 的暂存发行版，只有验证通过后才激活，失败则保留当前发行版。托管安装不支持 `--force`；要修复请重新运行安装器。要卸载 pi 本身，见[快速开始](quickstart.zh.md#卸载)。

默认情况下，`install` 和 `remove` 写入用户设置（`~/.pi/agent/settings.json`）。使用 `-l` 改为写入项目设置（`.pi/settings.json`）。项目设置可以与团队共享；项目被信任后，pi 会在启动时自动安装缺失的软件包。

若只想试用而不安装，使用 `--extension` 或 `-e`。这会把软件包装到仅本次运行有效的临时目录：

```bash
pi -e npm:@foo/bar
pi -e git:github.com/user/repo
```

## 软件包来源

设置和 `pi install` 接受三种来源。

### npm

```
npm:@scope/pkg@1.2.3
npm:pkg
```

- 带版本的规格会被固定，软件包更新会跳过它们（`pi update --extensions`、`pi update --all`）。
- 用户安装位于 `~/.pi/agent/npm/`。
- 项目安装位于 `.pi/npm/`。
- 在 `settings.json` 中设置 `npmCommand`，可将 npm 软件包查找和安装操作固定到特定包装命令，例如 `mise` 或 `asdf`。

示例：

```json
{
  "npmCommand": ["mise", "exec", "node@20", "--", "npm"]
}
```

### git

```
git:github.com/user/repo@v1
git:git@github.com:user/repo@v1
https://github.com/user/repo@v1
ssh://git@github.com/user/repo@v1
```

- 没有 `git:` 前缀时，只接受协议 URL（`https://`、`http://`、`ssh://`、`git://`）。
- 有 `git:` 前缀时，接受简写，包括 `github.com/user/repo` 和 `git@github.com:user/repo`。
- HTTPS 和 SSH URL 都支持。
- SSH URL 会自动使用你已配置的 SSH 密钥（遵循 `~/.ssh/config`）。
- 非交互运行（例如 CI）可以设置 `GIT_TERMINAL_PROMPT=0` 禁用凭证提示，并设置 `GIT_SSH_COMMAND`（例如 `ssh -o BatchMode=yes -o ConnectTimeout=5`）以便快速失败。
- ref 固定为 tag 或 commit。`pi update --extensions` 和 `pi update --all` 不会把它们挪到更新的 ref，但会把已有 clone 核对到配置的 ref。
- 使用 `pi install git:host/user/repo@new-ref` 可更新设置，并把已有软件包移到新的固定 ref。
- clone 到 `~/.pi/agent/git/<host>/<path>`（全局）或 `.pi/git/<host>/<path>`（项目）。
- 核对改变 checkout 时，pi 会 reset 并清理 clone，若存在 `package.json` 再运行 `npm install`。

**SSH 示例：**
```bash
# git@host:path 简写（需要 git: 前缀）
pi install git:git@github.com:user/repo

# ssh:// 协议格式
pi install ssh://git@github.com/user/repo

# 带版本 ref
pi install git:git@github.com:user/repo@v1.0.0
```

### 本地路径

```
/absolute/path/to/package
./relative/path/to/package
```

本地路径指向磁盘上的文件或目录，加入设置时不会复制。相对路径相对于它们所在的设置文件解析。若路径是文件，则作为单个扩展加载。若路径是目录，pi 按软件包规则加载资源。

## 创建 Pi 软件包

在 `package.json` 中加入 `pi` 清单，或使用约定目录。加上 `pi-package` 关键字以便被发现。

```json
{
  "name": "my-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```

路径相对于软件包根目录。数组支持 glob 模式和 `!exclusions`。清单中的正向 glob 按词典序发现可见路径。点号开头的路径请直接列出。若 glob 需要穿过符号链接才能继续，请直接列出被链接的资源根。

### 图库元数据

[软件包图库](https://pi.dev/packages) 会展示带 `pi-package` 标签的软件包。添加 `video` 或 `image` 字段可显示预览：

```json
{
  "name": "my-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "video": "https://example.com/demo.mp4",
    "image": "https://example.com/screenshot.png"
  }
}
```

- **video**：仅 MP4。桌面上悬停会自动播放。点击打开全屏播放器。
- **image**：PNG、JPEG、GIF 或 WebP。作为静态预览显示。

两者都设置时，video 优先。

## 软件包结构

### 约定目录

若没有 `pi` 清单，pi 会从这些目录自动发现资源：

- `extensions/` 加载 `.ts` 和 `.js` 文件
- `skills/` 递归查找包含 `SKILL.md` 的文件夹，并把顶层 `.md` 文件作为 skill 加载
- `prompts/` 加载 `.md` 文件
- `themes/` 加载 `.json` 文件

## 依赖

第三方运行时依赖应放在 `package.json` 的 `dependencies` 中。不注册扩展、skill、prompt 模板或主题的依赖也应放在 `dependencies` 中。pi 从 npm 或 git 安装软件包时会运行 `npm install`，因此这些依赖会自动安装。

Pi 为扩展和 skill 捆绑了核心包。若你导入其中任何一个，请把它们列在 `peerDependencies` 中并使用 `"*"` 范围，不要捆绑它们：`@earendil-works/pi-ai`、`@earendil-works/pi-agent-core`、`@earendil-works/pi-coding-agent`、`@earendil-works/pi-tui`、`typebox`。

其他 pi 软件包必须打进你的 tarball。把它们加入 `dependencies` 和 `bundledDependencies`，然后通过 `node_modules/` 路径引用其资源。Pi 用彼此独立的模块根加载软件包，因此分开安装不会冲突或共享模块。

示例：

```json
{
  "dependencies": {
    "shitty-extensions": "^1.0.1"
  },
  "bundledDependencies": ["shitty-extensions"],
  "pi": {
    "extensions": ["extensions", "node_modules/shitty-extensions/extensions"],
    "skills": ["skills", "node_modules/shitty-extensions/skills"]
  }
}
```

## 软件包过滤

在设置中用对象形式过滤软件包加载的内容：

```json
{
  "packages": [
    "npm:simple-pkg",
    {
      "source": "npm:my-package",
      "extensions": ["extensions/*.ts", "!extensions/legacy.ts"],
      "skills": [],
      "prompts": ["prompts/review.md"],
      "themes": ["+themes/legacy.json"]
    }
  ]
}
```

`+path` 和 `-path` 是相对于软件包根目录的精确路径。

- 省略某个键表示加载该类型的全部内容。
- 使用 `[]` 表示不加载该类型。
- `!pattern` 排除匹配项。
- `+path` 强制包含精确路径。
- `-path` 强制排除精确路径。
- 过滤器叠在清单之上。它们只缩小清单已经允许的范围。

## 启用与禁用资源

使用 `pi config` 启用或禁用已安装软件包和本地目录中的扩展、skill、prompt 模板和主题。`pi config` 从全局设置（`~/.pi/agent/settings.json`）开始；按 Tab 可在全局与项目本地模式之间切换。使用 `pi config -l` 从项目覆盖（`.pi/settings.json`）开始，继承来的全局资源会以暗色显示。

## 作用域与去重

软件包可以同时出现在全局和项目设置中。若同一软件包两边都有，则以项目条目为准，除非项目条目带有 `autoload: false`，此时它作为叠加在全局条目上的增量应用。身份判定方式：

- npm：软件包名
- git：不含 ref 的仓库 URL
- 本地：解析后的绝对路径
