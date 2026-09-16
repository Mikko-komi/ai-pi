> 本文为 [llama-cpp.md](llama-cpp.md) 的中文译本。

# llama.cpp

Pi 支持 [llama.cpp](https://github.com/ggml-org/llama.cpp) 的 router 服务器。该 router 会发现多个 GGUF 模型，并按需加载或卸载它们。

请使用带 router 支持的较新 llama.cpp 构建。按[构建说明](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md)操作，或为你的平台安装[预构建发布](https://github.com/ggml-org/llama.cpp/releases)。

## 启动 router

启动 `llama-server` 时不要带 `--model` 或 `-m`。传入模型会进入单模型模式，而不是 router 模式。

```bash
llama-server \
  --models-dir ~/models \
  --no-models-autoload \
  --jinja \
  --host 127.0.0.1 \
  --port 8080 \
  -ngl 999 \
  -c 32768
```

重要选项：

- `--models-dir ~/models` 发现本地 GGUF 文件。
- `--no-models-autoload` 让加载保持显式，通过 `/llama` 进行。
- `--jinja` 启用兼容的聊天模板和 tool calling。
- `-ngl 999` 尽量把层卸载到 GPU。
- `-c 32768` 为每个已加载模型设置上下文窗口。省略则使用模型的原生上下文，这可能显著增加内存占用。

单文件模型可以直接放在模型目录中。多模态和多分片模型放在各自的子目录：

```text
~/models/
├── llama-3.2-1b-Q4_K_M.gguf
├── gemma-3-4b-it-Q4_K_M/
│   ├── gemma-3-4b-it-Q4_K_M.gguf
│   └── mmproj-F16.gguf
└── large-model-Q4_K_M/
    ├── large-model-Q4_K_M-00001-of-00003.gguf
    ├── large-model-Q4_K_M-00002-of-00003.gguf
    └── large-model-Q4_K_M-00003-of-00003.gguf
```

手动添加文件后请重启 router。按模型设置上下文大小及其他选项，见 [llama.cpp 模型预设](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md#model-presets)。

## 配置 Pi

启动 Pi 并配置提供方：

```text
/login llama.cpp
```

输入 router URL 和可选的 API key。默认 URL 是 `http://127.0.0.1:8080`。

如果用 `--no-models-autoload` 启动 router，`/login llama.cpp` 只保存连接。先运行 `/llama` 加载模型，再运行 `/model` 为当前会话选择已加载的模型。

也可以用环境变量配置同样的值，无需 `/login`：

```bash
export LLAMA_BASE_URL=http://127.0.0.1:8080
export LLAMA_API_KEY=optional-secret
pi
```

如果服务器使用 API key，启动 `llama-server` 时传入匹配的 `--api-key` 值。仅本地访问时保持 `--host 127.0.0.1`。

## 管理模型

运行：

```text
/llama
```

- 选择未加载的模型以加载它。
- 选择已加载的模型以卸载它。
- 选择 **Download model…**，搜索 Hugging Face，然后选择仓库和量化。精确的 `owner/repository[:quant]` 值也可以。
- 加载或下载过程中按 Escape 可确认取消。

Hugging Face 搜索在已设置时使用 `HF_TOKEN`，然后检查 `$HF_TOKEN_PATH`、`$HF_HOME/token`、`$XDG_CACHE_HOME/huggingface/token` 和 `~/.cache/huggingface/token`。不鉴权也可以搜索，但速率限制更低。下载受限仓库前 Pi 会发出警告并链接到其访问页面。下载由 llama.cpp 服务器执行，因此所选仓库需要访问权限时，其进程也必须持有 `HF_TOKEN`。

如果已加载其他模型，Pi 会询问是先卸载它们还是保持加载。Pi 不会静默卸载模型，也永远不会删除模型文件。router 可能与其他客户端共享，因此 `/llama` 始终显示 router 的当前状态。

只有已加载的模型会出现在 `/model` 中。加载模型后，运行 `/model` 为当前 Pi 会话选择它。

如果 router 断开，`/llama` 会显示 **Retry** 和 **Close**。Retry 会重新连接并刷新模型状态，而不会重放被中断的操作。

## 故障排除

检查 router 是否可达：

```bash
curl http://127.0.0.1:8080/health
curl http://127.0.0.1:8080/models
```

- **`/llama` 中没有模型：** 检查 `--models-dir`、目录布局，并重启 router。
- **`/model` 中缺少模型：** 先用 `/llama` 加载。
- **加载失败或占用内存过多：** 降低 `-c`，或卸载另一个模型。
- **服务器不在 router 模式：** 启动时不要带 `--model`、`-m` 或 `-hf`。
