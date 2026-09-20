# 前端 Flow 制品部署

流水线构建dist，通用制品根目录须直接包含index.html和assets/。不要勾选包含打包路径目录。主机侧只构建Nginx静态镜像，不git pull、不在生产服务器执行pnpm。

## 安装可信部署脚本

通过SFTP上传deploy/deploy-frontend.sh到 /opt/cxj-blog/deploy/deploy-frontend.sh，保持LF换行。安装后执行：

```bash
sudo chown root:root /opt/cxj-blog/deploy/deploy-frontend.sh
sudo chmod 700 /opt/cxj-blog/deploy/deploy-frontend.sh
sudo bash -n /opt/cxj-blog/deploy/deploy-frontend.sh
sudo mkdir -p /opt/cxj-blog/incoming/frontend
python3 --version
```

主机要求Docker Compose、python3、flock；已有frontend/backend/nginx容器正在运行。不要从制品里下载并执行root部署脚本。

## 云效配置

主机部署：制品选上游frontend_${PIPELINE_ID}，主机组cxj-blog-prod，下载路径 /opt/cxj-blog/incoming/frontend/package.tgz，执行用户root，不暂停，分批1，超时30分钟。

```bash
bash /opt/cxj-blog/deploy/deploy-frontend.sh /opt/cxj-blog/incoming/frontend/package.tgz
```

单条流水线并发1、排队，防止下载制品时覆盖；前后端脚本共享.deployment.lock，执行过程互斥。前端单独写docker-compose.frontend.flow.yml，不覆盖后端docker-compose.flow.yml。前端命令合并两者，只重建frontend，不更改数据库或后端容器。

手动运维（两个override文件存在后）必须同时指定三个文件：

```bash
cd /opt/cxj-blog/deploy
docker compose --env-file .env -f docker-compose.prod.yml -f docker-compose.flow.yml -f docker-compose.frontend.flow.yml ps
```

脚本校验制品目录及大小，构建镜像，重建前端，从外层nginx容器通过HTTP检查index.html内容摘要与本次制品一致，然后检查并重载外层Nginx。失败保存日志并尝试恢复旧前端镜像；不会停止整套Compose，不自动删除镜像和release，需安排保留策略。单容器存在短暂中断，不是零停机部署。

本地验证仅包括构建、lint、Bash语法及制品解包安全测试，不代表生产部署/回滚已实际验收。首次运行应手动触发并检查浏览器静态资源及SPA路由。Nginx运行镜像暂沿用现有nginx:1.27-alpine，升级基础镜像需独立验证。

新版极验前端依赖新版后端captcha-config接口：后端SES/极验改动仍需单独审核提交部署，并设置凭证、通过模板审核。先不要自动部署前端到仍运行旧认证接口的环境。公开验证码发送前保持安全开关策略，不能因缺配置而绕过人机验证。
