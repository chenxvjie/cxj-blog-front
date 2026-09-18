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
| 2026-09-17 | initial | 初始化 React、TypeScript、Ant Design、Tailwind；文章列表、详情、关于页与后端 API 基础连接。 | TypeScript 与 Vite 生产构建通过。 |
| 2026-09-17 | feature-ui | 增加深色模式、Cookie 统计授权、错误边界、404、归档、搜索、标签页、Markdown/GFM 展示、代码复制、图片懒加载与后台页面骨架。 | 路由按需加载；生产构建通过。 |
| 2026-09-17 | auth-ui | 增加读者注册与邮箱验证码登录界面；未接入认证接口时明确提示失败，不伪造会话。 | 等待后端 `/auth/*` 与极验接口。 |
| 2026-09-17 | layout | 全局布局纵向至少占满视口；内容保持居中阅读宽度，文章详情单独维持阅读宽度。 | TypeScript 与 Vite 生产构建通过。 |
| 2026-09-17 | layout-fix | 使用显式全高 Flex 布局，主内容撑开可视区域，隐私政策链接所在页脚贴齐页面底部。 | TypeScript 与 Vite 生产构建通过。 |
| 2026-09-18 | docker-prod | 增加 Node 多阶段构建及 Nginx 静态站点镜像，生产 API 默认使用同域 `/api/v1`。 | 待云服务器执行 `docker compose build frontend` 验证。 |
| 2026-09-18 | docker-build-fix | 显式允许 Vite 所需的 `esbuild` 在受控 Docker 构建中执行安装脚本。 | 解决 pnpm 的 `ERR_PNPM_IGNORED_BUILDS`。 |

## 功能状态

完整功能实现与阻塞项见 [FEATURE_STATUS.md](FEATURE_STATUS.md)。
