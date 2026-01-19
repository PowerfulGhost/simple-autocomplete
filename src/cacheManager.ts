// cacheManager.ts

/**
 * 缓存整个预期的完整文档前缀（从文件开头到 LLM 补全结束）
 * 例如：
 *   baseContext = "function f() {\n    "
 *   LLM 返回 = "console.log(1);\nreturn 0;"
 *   则 fullExpected = "function f() {\n    console.log(1);\nreturn 0;"
 */
export class CompletionCacheManager {
    private fullExpected: string | null = null; // 完整的期望前缀（base + 全部补全）

    /**
     * 检查当前 textAboveCursor 是否是 fullExpected 的前缀。
     * 如果是，则返回接下来的第一行（即 currentAbove 之后的第一个换行段）。
     */
    getLineIfMatch(currentAbove: string): string | null {
        if (!this.fullExpected) {
            return null;
        }

        // 检查 currentAbove 是否是 fullExpected 的前缀
        if (!this.fullExpected.startsWith(currentAbove)) {
            this.clear(); // 不匹配，清除缓存
            return null;
        }

        // 计算剩余部分
        const remaining = this.fullExpected.slice(currentAbove.length);
        if (remaining === '') {
            this.clear();
            return null;
        }

        // 提取第一行（直到第一个 \n 或结尾）
        const firstNewlineIndex = remaining.indexOf('\n');
        const nextLine = firstNewlineIndex === -1 ? remaining : remaining.slice(0, firstNewlineIndex);

        // 注意：我们不修改 fullExpected，因为下次调用时 currentAbove 会变长
        // 缓存保持不变，直到被显式清除或不再匹配

        return nextLine;
    }

    /**
     * 存储完整的期望文本：baseContext + fullCompletion
     */
    store(baseContext: string, fullCompletion: string): void {
        this.fullExpected = baseContext + fullCompletion;
    }

    /**
     * 清除缓存
     */
    clear(): void {
        this.fullExpected = null;
    }

    // 仅用于调试
    getCacheState() {
        return { fullExpected: this.fullExpected };
    }
}