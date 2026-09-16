> 本文为 [prompt-templates.md](prompt-templates.md) 的中文译本。

> Pi 可以创建提示词模板。可以让它按你的工作流生成一份。

# 提示词模板

提示词模板是会展开成完整提示的 Markdown 片段。在编辑器中输入 `/name` 即可调用模板，其中 `name` 是去掉 `.md` 的文件名。

## 位置

Pi 从以下位置加载提示词模板：

- 全局：`~/.pi/agent/prompts/*.md`
- 项目：`.pi/prompts/*.md`（仅在项目受信任之后）
- 软件包：`prompts/` 目录，或 `package.json` 中的 `pi.prompts` 条目
- 设置：`prompts` 数组，可包含文件或目录
- CLI：`--prompt-template <path>`（可重复）

用 `--no-prompt-templates` 禁用发现。

## 格式

```markdown
---
description: Review staged git changes
---
Review the staged changes (`git diff --cached`). Focus on:
- Bugs and logic errors
- Security issues
- Error handling gaps
```

- 文件名即为命令名。`review.md` 变成 `/review`。
- `description` 可选。缺失时使用第一个非空行。
- `argument-hint` 可选。设置后，提示会显示在自动补全下拉列表中描述的前面。

### 参数提示

在 frontmatter 中使用 `argument-hint`，在自动补全里显示预期参数。必填参数用 `<angle brackets>`，可选参数用 `[square brackets]`：

```markdown
---
description: Review PRs from URLs with structured issue and code analysis
argument-hint: "<PR-URL>"
---
```

这在自动补全下拉列表中会渲染为：

```
→ pr   <PR-URL>       — Review PRs from URLs with structured issue and code analysis
  is   <issue>        — Analyze GitHub issues (bugs or feature requests)
  wr   [instructions] — Finish the current task end-to-end
  cl   — Audit changelog entries before release
```

## 用法

在编辑器中输入 `/` 再加上模板名。自动补全会显示可用模板及其描述。

```
/review                           # 展开 review.md
/component Button                 # 带参数展开
/component Button "click handler" # 多个参数
```

## 参数

模板支持位置参数、默认值和简单切片：

- `$1`、`$2`、... 位置参数
- `$@` 或 `$ARGUMENTS` 表示拼接后的全部参数
- `${1:-default}` 在参数 1 存在且非空时使用它，否则使用 `default`
- `${@:-default}` 或 `${ARGUMENTS:-default}` 在全部参数存在且非空时使用它们，否则使用 `default`
- `${@:N}` 表示从第 N 个位置起的参数（从 1 开始）
- `${@:N:L}` 表示从 N 开始的 `L` 个参数

示例：

```markdown
---
description: Create a component
---
Create a React component named $1 with features: $@
```

默认值适合可选参数：

```markdown
Summarize the current state in ${1:-7} bullet points.
```

用法：`/component Button "onClick handler" "disabled support"`

## 加载规则

- `prompts/` 中的模板发现不是递归的。
- 如果要把子目录中的模板包含进来，请通过 `prompts` 设置或软件包清单显式添加。
