# CXJ Blog Frontend

React + TypeScript + Ant Design + Tailwind CSS 的博客前端。

## 本地运行

```powershell
pnpm install --ignore-scripts
pnpm dev
```

默认前端地址为 `http://localhost:5173`。开发请求固定通过 Vite `/api` 代理到 `127.0.0.1:8080`，忽略 `VITE_API_BASE_URL`；生产构建使用该变量，默认同域 `/api/v1`。

构建验证：

```powershell
pnpm exec tsc -b
node .\node_modules\vite\bin\vite.js build
```

## 提交功能记录

提交代码时，请在此表追加一行，记录本次新增、修改或移除的用户功能；如有接口/第三方阻塞，链接到 `FEATURE_STATUS.md`，不要把密钥写入文档。

| 日期 | 提交/版本 | 功能记录 | 影响/验证 |
| --- | --- | --- | --- |
| 2026-09-20 | local-isolation | dev固定使用本地Vite代理，不继承生产API地址；认证页提示云服务停用或本地后端不可用时流程中止。 | lint和生产构建检查。 |
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

本地运行pnpm dev后访问http://127.0.0.1:5173，/api代理到http://127.0.0.1:8080，不依赖公网域名、HTTPS、CDN、备案或服务器。开发模式忽略VITE_API_BASE_URL，以免误操作生产后端；生产构建仍使用该变量，默认/api/v1。本地后端使用local配置，文章仍需本地数据库，云验证码停用时验证码登录/注册明确提示中止；密码登录独立可用，不伪造成功。如改本地后端端口，需同步修改vite.config.ts代理目标。

代码检查运行 `pnpm lint`，自动修复运行 `pnpm lint:fix`；配置位于eslint.config.js，忽略dist、node_modules和coverage。构建仍使用 `pnpm build`。

极验v4公开ID来自后端GET /auth/captcha-config，无需在前端配置密钥。后端需开启GEETEST_ENABLED并配置ID/Key；未开启时拒绝发送，不走无验证降级。必须同步部署新版前后端。脚本按点击获取验证码时加载，隐私说明需披露第三方人机验证。已接入全站内存 Bearer 会话、密码/验证码登录和注册；刷新需重新登录。会话变化清空查询缓存，迟到的旧令牌401不会清除新会话。

完整功能实现与阻塞项见 [FEATURE_STATUS.md](FEATURE_STATUS.md)。

## 当前账号与文章管理

管理员和普通用户共用登录界面，普通用户管理自己的文章，管理员管理全部文章。/admin 进入实际文章管理页；编辑保留未展示的分类、封面和置顶字段。账号规则见 [ACCOUNT_PERMISSIONS.md](ACCOUNT_PERMISSIONS.md)。

检查命令：pnpm test、pnpm lint、pnpm build。2026-10-02 本地检查：12 项测试、lint 和生产构建通过；仍有大于500kB的分包警告。
