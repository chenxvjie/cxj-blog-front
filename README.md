# CXJ Blog Frontend

React + TypeScript + Ant Design + Tailwind CSS 的博客前端。

## 本地运行

```powershell
pnpm install --ignore-scripts
pnpm dev
```

默认前端地址为 `http://localhost:5173`，API 地址由 `.env` 的 `VITE_API_BASE_URL` 配置，默认为 `http://localhost:8080/api/v1`。

构建验证：

```powershell
pnpm exec tsc -b
node .\node_modules\vite\bin\vite.js build
```

## 提交功能记录

提交代码时，请在此表追加一行，记录本次新增、修改或移除的用户功能；如有接口/第三方阻塞，链接到 `FEATURE_STATUS.md`，不要把密钥写入文档。

| 日期 | 提交/版本 | 功能记录 | 影响/验证 |
| --- | --- | --- | --- |
| 2026-09-20 | flow-frontend | 增加静态制品Docker部署脚本、共享部署锁、独立Compose覆盖文件、HTTP内容校验和失败回滚。 | 配置见deploy/FLOW.md；本地校验后仍需生产手动验收。 |
| 2026-09-20 | eslint | 增加ESLint 9 flat配置，启用TypeScript推荐规则、React Hooks和Fast Refresh检查；增加lint:fix。 | 全项目pnpm lint及pnpm build验证。 |
| 2026-09-20 | geetest-v4 | 登录/注册发送验证码前加载极验v4弹窗，取得四项凭证后交由后端核验；取消、失败不发送，成功才倒计时。修复双表单邮箱读取。 | TypeScript/Vite构建通过；仓库缺少ESLint配置，lint未执行成功；真实极验凭证联调待部署。 |
| 2026-09-17 | initial | 初始化 React、TypeScript、Ant Design、Tailwind；文章列表、详情、关于页与后端 API 基础连接。 | TypeScript 与 Vite 生产构建通过。 |
| 2026-09-17 | feature-ui | 增加深色模式、Cookie 统计授权、错误边界、404、归档、搜索、标签页、Markdown/GFM 展示、代码复制、图片懒加载与后台页面骨架。 | 路由按需加载；生产构建通过。 |
| 2026-09-17 | auth-ui | 增加读者注册与邮箱验证码登录界面；未接入认证接口时明确提示失败，不伪造会话。 | 等待后端 `/auth/*` 与极验接口。 |
| 2026-09-17 | layout | 全局布局纵向至少占满视口；内容保持居中阅读宽度，文章详情单独维持阅读宽度。 | TypeScript 与 Vite 生产构建通过。 |
| 2026-09-17 | layout-fix | 使用显式全高 Flex 布局，主内容撑开可视区域，隐私政策链接所在页脚贴齐页面底部。 | TypeScript 与 Vite 生产构建通过。 |
| 2026-09-18 | docker-prod | 增加 Node 多阶段构建及 Nginx 静态站点镜像，生产 API 默认使用同域 `/api/v1`。 | 待云服务器执行 `docker compose build frontend` 验证。 |
| 2026-09-18 | docker-build-fix | 显式允许 Vite 所需的 `esbuild` 在受控 Docker 构建中执行安装脚本。 | 解决 pnpm 的 `ERR_PNPM_IGNORED_BUILDS`。 |

## 功能状态

代码检查运行 `pnpm lint`，自动修复运行 `pnpm lint:fix`；配置位于eslint.config.js，忽略dist、node_modules和coverage。构建仍使用 `pnpm build`。

极验v4公开ID来自后端GET /auth/captcha-config，无需在前端配置密钥。后端需开启GEETEST_ENABLED并配置ID/Key；未开启时拒绝发送，不走无验证降级。必须同步部署新版前后端。脚本按点击获取验证码时加载，隐私说明需披露第三方人机验证。当前仍未实现登录后的全站Bearer会话状态管理，本次只接入验证码发送前的极验流程。

完整功能实现与阻塞项见 [FEATURE_STATUS.md](FEATURE_STATUS.md)。
