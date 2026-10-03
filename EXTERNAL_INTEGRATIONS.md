# 前端外部能力占位

百度统计尚未插入生产脚本。上线时通过 `VITE_BAIDU_ANALYTICS_ID` 注入站点 ID，并在用户同意统计后动态加载；本地开发保持关闭。

极验和 COS 的密钥由后端配置。正文图片上传使用后端预签名接口，浏览器直传 COS 后由后端核对并返回 CDN URL；服务器设置见后端 `COS_UPLOAD.md`。飞书通知尚未接入。

## 本地构建记录

当前环境的 pnpm 启用了依赖构建脚本审批，`esbuild` 需要在交互式 `pnpm approve-builds` 中显式批准后才能执行 Vite 的完整构建。项目 TypeScript 检查不依赖该脚本，可用 `pnpm exec tsc -b` 验证。此限制不影响项目源码；CI 环境应使用受控依赖安装策略并批准 `esbuild`。
