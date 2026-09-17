# 前端外部能力占位

百度统计尚未插入生产脚本。上线时通过 `VITE_BAIDU_ANALYTICS_ID` 注入站点 ID，并在用户同意统计后动态加载；本地开发保持关闭。

极验、COS 和飞书由后端负责，其配置/占位状态可通过后端 `/api/v1/system/integrations` 查询。

## 本地构建记录

当前环境的 pnpm 启用了依赖构建脚本审批，`esbuild` 需要在交互式 `pnpm approve-builds` 中显式批准后才能执行 Vite 的完整构建。项目 TypeScript 检查不依赖该脚本，可用 `pnpm exec tsc -b` 验证。此限制不影响项目源码；CI 环境应使用受控依赖安装策略并批准 `esbuild`。
