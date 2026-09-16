> 本文为 [terminal-setup.md](terminal-setup.md) 的中文译本。

# 终端设置

Pi 使用 [Kitty keyboard protocol](https://sw.kovidgoyal.net/kitty/keyboard-protocol/) 来可靠检测修饰键。大多数现代终端支持该协议，但有些需要配置。

## 能力覆盖

Pi 会自动检测 OSC 8 超链接、内联图片协议和 truecolor。如果检测在终端代理或多路复用器后面失败，使用这些高级覆盖：

| 能力 | 环境变量 | JSON 设置 |
|------------|----------------------|--------------|
| OSC 8 超链接 | `PI_HYPERLINKS=1\|0\|auto` | `terminal.hyperlinks: true\|false\|"auto"` |
| 内联图片 | `PI_IMAGE_PROTOCOL=kitty\|iterm2\|none\|auto` | `terminal.images: "kitty"\|"iterm2"\|false\|"auto"` |
| Truecolor | `PI_TRUE_COLOR=1\|0\|auto` | `terminal.trueColor: true\|false\|"auto"` |

设置优先于环境变量；未设置或 `auto` 会保留检测结果。只强制完整终端路径都支持的能力，因为不受支持的转义序列会破坏渲染。

## Kitty

开箱即用。

## iTerm2

### 普通 TUI 模式

开箱即用。

### 全屏 TUI 模式

Pi 拥有视口，因此 iTerm2 会发送鼠标滚轮报告，而不是滚动它自己的原生回滚缓冲区。在 iTerm2 默认的快速触控板行为下，这些报告可能丢掉加速滚轮增量的大部分，使全屏滚动比普通滚动慢很多。

如果快速鼠标滚轮手势在全屏模式中一次只移动大约一行：

1. 打开 **iTerm2 → Settings → Advanced**。
2. 搜索 **Trackpad scrolls fast?** 并将其设为 **No**。

这是 iTerm2 全局的变通办法，也可能改变原生触控板滚动。底层行为跟踪在 [iTerm2 issue 9619](https://gitlab.com/gnachman/iterm2/-/work_items/9619)。

## Apple Terminal

可用时 Pi 会启用增强按键报告。如果 Terminal.app 对 `Shift+Enter` 仍发送普通 Return，Pi 会使用本地 macOS 修饰键回退，把该 Return 当作 `Shift+Enter`。

此回退仅在 Pi 与 Terminal.app 运行在同一台 Mac 上时有效。它无法通过远程 SSH 检测本地键盘。

## Ghostty

写入 Ghostty 配置（macOS 上为 `~/Library/Application Support/com.mitchellh.ghostty/config`，Linux 上为 `~/.config/ghostty/config`）：

```
keybind = alt+backspace=text:\x1b\x7f
```

较旧的 Claude Code 版本可能添加过这个 Ghostty 映射：

```
keybind = shift+enter=text:\n
```

该映射发送原始换行字节。在 Pi 内部，这与 `Ctrl+J` 无法区分，因此 tmux 和 Pi 都看不到真正的 `shift+enter` 按键事件。

如果添加该映射只是因为 Claude Code 2.x 或更新版本，可以删掉它，除非你要在 tmux 中使用 Claude Code——那种情况仍然需要该 Ghostty 映射。

Pi 把 `Ctrl+J` 绑定为默认换行别名，因此在 tmux 中通过该重映射，`Shift+Enter` 无需额外 Pi 配置也能继续工作。

### 全屏 TUI 模式

全屏模式下链接仍可点击，但 Pi 捕获鼠标输入时，Ghostty 不会显示悬停下划线或左下角 URL 预览。在 macOS 上按住 `Shift+Command`，在 Linux 上按住 `Shift+Ctrl`，即可使用 Ghostty 的原生链接处理。

## WezTerm

WezTerm 通常通过 xterm modifyOtherKeys 开箱支持 `Shift+Enter`。要显式使用 Kitty 键盘协议，创建 `~/.wezterm.lua`：

```lua
local wezterm = require 'wezterm'
local config = wezterm.config_builder()
config.enable_kitty_keyboard = true
return config
```

在 macOS 上，WezTerm 默认把 `Option+Enter` 绑定为全屏。要用 `Option+Enter` 做 Pi 的 follow-up 入队，添加此按键覆盖：

```lua
local wezterm = require 'wezterm'
local config = wezterm.config_builder()
config.keys = {
  {
    key = 'Enter',
    mods = 'ALT',
    action = wezterm.action.SendString('\x1b[13;3u'),
  },
}
return config
```

如果已有 `config.keys` 表，把该条目加进去。

在 WSL 上，WezTerm 可能需要可见的硬件光标来定位 IME 候选窗口。如果中日韩 IME 候选不跟随文本光标，请在运行 Pi 之前设置 `PI_HARDWARE_CURSOR=1`，或在设置中把 `showHardwareCursor` 设为 `true`。

## Alacritty

Alacritty 通常对 `Shift+Enter` 开箱即用。在 macOS 上，`Option+Enter` 可能变成普通 `Enter`。要用 `Option+Enter` 做 Pi 的 follow-up 入队，写入 `~/.config/alacritty/alacritty.toml`：

```toml
[[keyboard.bindings]]
key = "Enter"
mods = "Alt"
chars = "\u001b[13;3u"
```

更改配置后重启 Alacritty。

## VS Code（集成终端）

VS Code 1.109.5 及更新版本默认在集成终端中启用 Kitty 键盘协议，因此 `Shift+Enter` 应开箱即用。

低于 1.109.5 的 VS Code 需要为 `Shift+Enter` 显式设置终端快捷键。

`keybindings.json` 位置：
- macOS: `~/Library/Application Support/Code/User/keybindings.json`
- Linux: `~/.config/Code/User/keybindings.json`
- Windows: `%APPDATA%\\Code\\User\\keybindings.json`

写入 `keybindings.json`：

```json
{
  "key": "shift+enter",
  "command": "workbench.action.terminal.sendSequence",
  "args": { "text": "\u001b[13;2u" },
  "when": "terminalFocus"
}
```

## Zed（集成终端）

把这些按键绑定加到 Zed 的 `keymap.json`：

```json
{
  "context": "Terminal",
  "bindings": {
    "shift-enter": ["terminal::SendText", "\u001b[13;2u"],
    "ctrl--": ["terminal::SendText", "\u001b[45;5u"],
    "ctrl-alt-]": ["terminal::SendText", "\u001b[93;7u"]
  }
}
```

## Windows Terminal

在 Windows 本机或 WSL 中运行时，Pi 使用 Windows 风格快捷键：

- `Alt+V` 粘贴图片或剪贴板文本。
- `Ctrl+F` 在全屏模式中搜索转录，`Ctrl+Up`/`Ctrl+Down` 在已标记消息间跳转。
- `Alt+P` 循环到上一个模型。
- `Ctrl+Z` 在原生 Windows 上撤销编辑；WSL 使用 `Alt+Z`，以便 `Ctrl+Z` 可以挂起 Pi。
- `Ctrl+Q` 将 follow-up 消息入队，`Alt+Q` 恢复已入队消息。

写入 `settings.json`（Ctrl+Shift+, 或 Settings → Open JSON file），转发 `Shift+Enter` 以插入新行：

```json
{
  "actions": [
    {
      "command": { "action": "sendInput", "input": "\u001b[13;2u" },
      "keys": "shift+enter"
    }
  ]
}
```

Windows Terminal 默认把 `Alt+Enter` 绑定为全屏。若要用它代替 Pi 默认的 `Ctrl+Q` 做 follow-up 入队，请配置 Windows Terminal 发送该按键，并在 Pi 中把 `app.message.followUp` 绑定到 `alt+enter`。

如果已有 `actions` 数组，把该对象加进去。更改设置后彻底关闭并重新打开 Windows Terminal。

## xfce4-terminal、terminator

这些终端对转义序列的支持有限。`Ctrl+Enter` 和 `Shift+Enter` 这类带修饰的 Enter 无法与普通 `Enter` 区分，因此 `submit: ["ctrl+enter"]` 等自定义快捷键无法工作。

为获得最佳体验，请使用支持 Kitty 键盘协议的终端：
- [Kitty](https://sw.kovidgoyal.net/kitty/)
- [Ghostty](https://ghostty.org/)
- [WezTerm](https://wezfurlong.org/wezterm/)
- [iTerm2](https://iterm2.com/)
- [Alacritty](https://github.com/alacritty/alacritty)（需要以 Kitty 协议支持编译）

## IntelliJ IDEA（集成终端）

内置终端对转义序列的支持有限。在 IntelliJ 终端中无法区分 Shift+Enter 和 Enter。

如果希望硬件光标可见，请在运行 Pi 之前设置 `PI_HARDWARE_CURSOR=1`（默认关闭以保持兼容）。

为获得最佳体验，请考虑使用独立的终端模拟器。
