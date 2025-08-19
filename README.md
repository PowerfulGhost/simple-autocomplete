# simple-autocomplete README
使用Ollama提供单行代码补全。
魔改自[wizardCoder-vsc](https://github.com/mzbac/wizardCoder-vsc) 。感谢原作者！


## 用法
1. 使用 `Ctrl-Alt-P` 打开命令菜单。
2. 执行命令：`Simple autocomplete toggle activate`。
3. 右下角显示`SAC: √`时，代码补全功能启动。
4. 再次执行命令`Simple autocomplete toggle activate`以停用代码补全。


## 特性
1. 单行代码补全


## 依赖
1. 一个运行着代码模型的Ollama服务
2. 这个模型最好支持Fill-in-Middle任务


## 配置项
- `simple-autocomplete.ollamaHost`: Ollama服务的主机地址，默认为 `http://127.0.0.1:11434`
- `simple-autocomplete.model`: 要使用的模型名称，默认为 `hf.co/unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF:Q3_K_XL`
- `simple-autocomplete.debunceTimeMs`: 输入延迟时间（毫秒），默认为 500
- `simple-autocomplete.maxLinesAbove`: 包含在补全上下文中的光标上方最大行数，默认为 70
- `simple-autocomplete.maxLinesBelow`: 包含在补全上下文中的光标下方最大行数，默认为 30
- `simple-autocomplete.promptTemplate`: LLM使用的提示模板，使用 `{textAboveCursor}` 和 `{textBelowCursor}` 作为占位符，默认为 `<|fim_prefix|>{textAboveCursor}<|fim_suffix|>{textBelowCursor}<|fim_middle|>`