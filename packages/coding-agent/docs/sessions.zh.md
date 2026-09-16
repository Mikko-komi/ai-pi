> 本文为 [sessions.md](sessions.md) 的中文译本。

# 会话

Pi 把对话保存为会话，以便继续工作、从更早的回合分叉，并回顾之前的路径。

## 会话存储

会话自动保存到 `~/.pi/agent/sessions/`，按工作目录组织。每个会话是带树结构的 JSONL 文件。

```bash
pi -c                  # Continue most recent session
pi -r                  # Browse and select from past sessions
pi --no-session        # Ephemeral mode; do not save
pi --name "my task"    # Set session display name at startup
pi --session <path|id> # Use a specific session file or partial session ID
pi --fork <path|id>    # Fork a session file or partial session ID into a new session
```

在交互模式中使用 `/session` 查看当前会话文件、会话 ID、消息数、token 和费用。

JSONL 文件格式和 SessionManager API 见[会话格式](session-format.zh.md)。

## 会话命令

| 命令 | 说明 |
|---------|-------------|
| `/resume` | 浏览并选择之前的会话 |
| `/new` | 开始新会话 |
| `/name <name>` | 设置当前会话的显示名称 |
| `/session` | 显示会话信息 |
| `/tree` | 导航当前会话树 |
| `/fork` | 从之前的用户消息创建新会话 |
| `/clone` | 把当前活动分支复制到新会话 |
| `/compact [prompt]` | 总结较早的上下文；见[压缩](compaction.zh.md) |
| `/export [file]` | 将会话导出为 HTML |
| `/share` | 上传为私有 GitHub gist，并得到可分享的 HTML 链接 |

## 恢复与删除会话

`/resume` 打开当前项目的交互式会话选择器。`pi -r` 在启动时打开同一个选择器。

在选择器中可以：

- 输入文字进行搜索
- 用 Ctrl+P 切换路径显示
- 用 Ctrl+S 切换排序模式
- 用 Ctrl+N 筛选到已命名会话
- 用 Ctrl+R 重命名
- 用 Ctrl+D 删除，然后确认

可用时，Pi 使用 `trash` CLI 删除，而不是永久移除文件。

## 命名会话

用 `/name <name>` 设置人类可读的会话名：

```text
/name Refactor auth module
```

启动时用 `--name` 或 `-n` 设置名称：

```bash
pi --name "Refactor auth module"
pi --name "CI audit" -p "Review this build failure"
```

已命名会话更容易在 `/resume` 和 `pi -r` 中找到。

## 用 `/tree` 分支

会话以树的形式存储。每条记录都有 `id` 和 `parentId`，当前位置是活动叶子。`/tree` 可以跳到任意先前位置并从那里继续，而无需创建新文件。

<p align="center"><img src="images/tree-view.png" alt="树视图" width="600"></p>

形状示例：

```text
├─ user: "Hello, can you help..."
│  └─ assistant: "Of course! I can..."
│     ├─ user: "Let's try approach A..."
│     │  └─ assistant: "For approach A..."
│     │     └─ user: "That worked..."  ← active
│     └─ user: "Actually, approach B..."
│        └─ assistant: "For approach B..."
```

### 树控件

| 按键 | 操作 |
|-----|--------|
| ↑/↓ | 在可见条目间导航 |
| ←/→ | 上一页/下一页 |
| Ctrl+←/Ctrl+→ 或 Alt+←/Alt+→ | 折叠/展开，或在分支段之间跳转 |
| Shift+L | 为选中条目设置或清除标签 |
| Shift+T | 切换标签时间戳 |
| Enter | 选择条目 |
| Escape/Ctrl+C | 取消 |
| Ctrl+O | 循环筛选模式 |

筛选模式为：default、no-tools、user-only、labeled-only 和 all。用[设置](settings.zh.md)中的 `treeFilterMode` 配置默认值。

### 选择行为

选择用户消息或自定义消息时：

1. 把叶子移到所选消息的父节点。
2. 把所选消息文本放入编辑器。
3. 允许你编辑并重新提交，从而创建新分支。

选择助手、工具、压缩或其他非用户条目时：

1. 把叶子移到该条目。
2. 编辑器保持为空。
3. 允许你从该点继续。

选择根用户消息会把叶子重置为空对话，并把原始提示放入编辑器。

## `/tree`、`/fork` 和 `/clone`

| 功能 | `/tree` | `/fork` | `/clone` |
|---------|---------|---------|----------|
| 输出 | 同一会话文件 | 新会话文件 | 新会话文件 |
| 视图 | 整棵树 | 用户消息选择器 | 当前活动分支 |
| 典型用途 | 就地探索备选方案 | 从更早的提示开始新会话 | 在继续之前复制当前工作 |
| 摘要 | 可选的分支摘要 | 无 | 无 |

希望把备选方案放在一起时用 `/tree`。希望要单独的会话文件时用 `/fork` 或 `/clone`。

## 分支摘要

当 `/tree` 从一个分支切到另一个分支时，Pi 可以总结被放弃的分支，并把该摘要附加到新位置。这样可以保留你离开的那条路径上的重要上下文，而不必重放整条分支。

出现提示时，选择以下之一：

1. 不要摘要
2. 用默认提示总结
3. 用自定义关注说明总结

分支摘要的内部机制和扩展钩子见[压缩](compaction.zh.md)。

## 会话格式

会话文件是 JSONL，包含消息条目、模型变更、thinking 级别变更、标签、压缩、分支摘要和扩展条目。

解析器、扩展、SDK 用法以及完整的 SessionManager API 见[会话格式](session-format.zh.md)。
