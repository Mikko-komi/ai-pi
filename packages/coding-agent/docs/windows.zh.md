> 本文为 [windows.md](windows.md) 的中文译本。

# Windows 设置

在 Windows 上，Pi 默认使用 Git Bash。按以下顺序检查路径：

1. `~/.pi/agent/settings.json` 中的自定义路径
2. Git Bash（`C:\Program Files\Git\bin\bash.exe`）
3. PATH 上的 `bash.exe`（Cygwin、MSYS2、WSL）

对大多数用户来说，安装 [Git for Windows](https://git-scm.com/download/win) 即可。

## PowerShell 工具

可选的 `powershell` 工具会在可用时通过 `pwsh.exe` 执行命令，否则使用 Windows PowerShell。启动时带 `-NoProfile -NonInteractive -ExecutionPolicy Bypass`。管理员强制的执行策略仍可能优先生效。

用 `defaultTools` 把面向模型的 `bash` 工具替换掉：

```json
{
  "defaultTools": ["read", "powershell", "edit", "write"]
}
```

也可以同时启用两者以便对比行为：

```json
{
  "defaultTools": ["read", "bash", "powershell", "edit", "write"]
}
```

`!` 和 `!!` 编辑器命令仍然使用 Bash。

## 自定义 Bash 路径

```json
{
  "shellPath": "C:\\cygwin64\\bin\\bash.exe"
}
```
