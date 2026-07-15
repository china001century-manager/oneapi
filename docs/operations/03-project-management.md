# WBoke 项目管理与重新部署手册

适用对象：项目负责人、接手的开发 Agent、部署工程师和事故处理人员。

## 1. 项目身份

| 项目 | 值 |
|---|---|
| 产品名 | WBoke API |
| 代码目录 | `D:\02AIsoftcoding\01开发半成品\AIDESKAPI` |
| GitHub 仓库 | `https://github.com/china001century-manager/oneapi` |
| 生产分支 | `main` |
| 当前本地工作分支 | `deploy/web-railway` |
| New API 固定版本 | `calciumion/new-api:v1.0.0-rc.21` |
| 目标正式域名 | `https://www.wboke.com` |
| 目标服务器地区 | 香港 |
| 当前试运行地区 | Railway US West |
| 时区 | `Asia/Hong_Kong` / 管理记录使用 `Asia/Shanghai` |

## 2. 平台账号与关联关系

| 平台 | 账号/组织 | 用途 | 密码/密钥记录 |
|---|---|---|---|
| GitHub | 组织/所有者 `china001century-manager` | 源代码仓库 | `<在密码管理器中填写>` |
| GitHub CLI/提交账号 | `hasd52636-a11y` | 当前机器推送代码 | `<在密码管理器中填写>` |
| Railway Workspace | `Aed's Projects` | New API、数据库、Redis、邮件中继 | `<在密码管理器中填写>` |
| Vercel Team | `hanjiangs-projects-bee54024` | 官网部署与域名 | `<在密码管理器中填写>` |
| Vercel CLI 用户 | `hasd52636-a11y` | 当前机器部署官网 | `<在密码管理器中填写>` |
| AgentMail Organization | `wboke's Organization` | 验证邮件 | `<在密码管理器中填写>` |
| AgentMail 用户显示名 | `wboke test` | AgentMail 控制台 | `<在密码管理器中填写>` |
| AgentMail Inbox | `wboke-5247@agentmail.to` | 当前发件地址 | 无登录密码，使用平台账号 |
| New API Root | `wboke2026` | New API 根管理员 | `<在密码管理器中填写>` |
| New API Root 邮箱 | `<ADMIN_EMAIL>` | 找回与通知 | `<在密码管理器中填写>` |
| 域名 | `wboke.com` | 正式访问入口 | `<DOMAIN_REGISTRAR_ACCOUNT>` / `<在密码管理器中填写>` |
| 链小铺 | `<LIANXIAOPU_ACCOUNT>` | 销售兑换码 | `<在密码管理器中填写>` |

账号关系：

```text
GitHub oneapi/main
  |-- 自动部署 --> Railway New API
  |-- 自动部署 --> Railway 官网服务（如启用）
  `-- 自动部署 --> Railway agentmail-relay

Vercel Team
  |-- 项目 wboke-web-test --> 官网构建
  `-- 域名 wboke.com --> www.wboke.com

Railway New API
  |-- PostgreSQL --> 用户、渠道、兑换码、价格、系统设置
  |-- Redis --> 缓存和运行状态
  `-- 私网 SMTP --> agentmail-relay --> AgentMail Inbox --> 用户邮箱

链小铺
  `-- 出售预生成兑换码 --> 用户手动在 New API 钱包兑换
```

## 3. 线上资源清单

### Railway

- 项目名：`blissful-empathy`
- 项目 ID：`c492bc82-beaa-48d9-99f6-d24bd1624201`
- 环境：`production`
- 环境 ID：`fbf14001-907a-424a-a1e8-a799f05687c8`
- 项目入口：`https://railway.com/project/c492bc82-beaa-48d9-99f6-d24bd1624201`

| 服务 | Service ID | 作用 | 公网/私网 |
|---|---|---|---|
| `@wboke/desktop` | `eb8964ab-abf0-4724-995a-ad12e9e79e7c` | 实际是 New API，名称具有误导性 | `https://wbokedesktop-production.up.railway.app` |
| `@wboke/web` | `7bab284e-1c96-4eed-b8b5-bea32f8a833c` | 官网构建服务 | 当前无正式公网域名 |
| `Postgres` | `991e8e7b-f2b9-4e8a-b7c2-aeb5946b51b8` | 主数据库 | 仅 Railway 私网 |
| `Redis` | `5a34ecf3-17d8-4833-9b12-f942be7f98dd` | 缓存 | 仅 Railway 私网 |
| `agentmail-relay` | `3f714056-c578-4d0b-abcf-22e3b85d5346` | SMTP 到 AgentMail HTTPS 中继 | `agentmail-relay.railway.internal:2525` |

注意：`@wboke/desktop` 不是 Windows 客户端下载服务。它当前承载 New API，改名之前不要仅凭服务名称删除或重建。

### Vercel

- 团队：`hanjiangs-projects-bee54024`
- 官网项目：`wboke-web-test`
- 测试地址：`https://wboke-web-test.vercel.app`
- 当前生产部署 ID：`dpl_5hm166GdvbzxWwrxWebRNowT3cGi`
- 当前生产部署地址：`https://wboke-web-test-ocjde8knr-hanjiangs-projects-bee54024.vercel.app`
- New API 历史测试项目：`wboke-new-api-test`，不再作为当前后端来源。
- 域名：`wboke.com`，第三方注册商/第三方 DNS。
- `www.wboke.com` 已于 2026-07-15 从旧“粒子日记”站点切换到 `wboke-web-test`。
- 基础验收：`/`、`/api/status`、`/sign-in`、`/dashboard`、`/reset` 返回 200；`/v1/models` 无 API Key 返回预期 401。

### 链小铺

- 已提供商品链接：`https://pay.ldxp.cn/item/fibk24`
- 已提供商品链接：`https://pay.ldxp.cn/item/lwp13p`
- 商品与 `1/5/10/20/50/100` 面额的映射：`<待经营者填写>`
- 链小铺是否支持 API：未确认，首版按预生成兑换码人工导入处理。

## 4. 凭据登记模板

真实值只存密码管理器。建议建立名为 `WBoke Production` 的共享保险库，并按以下条目创建：

```text
WBoke/GitHub/Owner
  username=<GITHUB_OWNER>
  password=<SECRET>
  recovery_codes=<SECURE_ATTACHMENT>

WBoke/Railway/Workspace
  account=<RAILWAY_ACCOUNT>
  password=<SECRET>
  2fa_recovery=<SECURE_ATTACHMENT>

WBoke/Vercel/Team
  account=<VERCEL_ACCOUNT>
  password=<SECRET>
  token=<SECRET:VERCEL_TOKEN>

WBoke/AgentMail/Production
  account=<AGENTMAIL_ACCOUNT>
  api_key=<SECRET:AGENTMAIL_INBOX_SEND_KEY>
  inbox=wboke-5247@agentmail.to

WBoke/NewAPI/Root
  username=wboke2026
  email=<ADMIN_EMAIL>
  password=<SECRET>
  passkey_recovery=<SECURE_ATTACHMENT>

WBoke/Domain/Registrar
  registrar=<DOMAIN_REGISTRAR>
  username=<DOMAIN_ACCOUNT>
  password=<SECRET>
  dns_token=<SECRET:DNS_TOKEN>

WBoke/Database/Postgres
  database=<POSTGRES_DB>
  username=<POSTGRES_USER>
  password=<SECRET:POSTGRES_PASSWORD>
  railway_private_url=<SECRET:DATABASE_URL>

WBoke/Redis
  url=<SECRET:REDIS_URL>

WBoke/NewAPI/Runtime
  session_secret=<SECRET:SESSION_SECRET>
  crypto_secret=<SECRET:CRYPTO_SECRET>

WBoke/SMTP/Relay
  username=<SECRET:RELAY_USERNAME>
  password=<SECRET:RELAY_PASSWORD>
```

## 5. 仓库结构

```text
apps/
  web/                 官网、注册和登录前端
  desktop/             Tauri Windows 客户端
  agentmail-relay/      Railway 私网 SMTP 中继
deploy/
  docker-compose.yml   香港服务器最终部署
  caddy/               正式域名反向代理
  vercel/new-api/       Railway/Vercel 测试期 New API 包装
docs/
  plans/               已确认设计
  operations/          当前运行、交接和故障事实来源
```

禁止提交：`.env`、`.vercel`、真实兑换码、数据库备份、证书私钥、API Key、管理员密码和构建签名证书。

## 6. 本地开发与验证

```powershell
pnpm install
pnpm check
pnpm test
pnpm build
```

官网开发：

```powershell
pnpm dev:web
```

桌面端开发：

```powershell
pnpm dev
pnpm --filter @wboke/desktop tauri dev
```

正式客户端构建前必须设置：

```text
VITE_PORTAL_ORIGIN=https://www.wboke.com
VITE_API_BASE_URL=https://www.wboke.com/v1
VITE_STORE_URL=<LIANXIAOPU_OR_RECHARGE_URL>
VITE_DEMO_MODE=false
```

构建产物必须记录版本、Git Commit、构建时间、签名状态和 SHA256。

## 7. Railway 重新部署

### New API

必要变量：

```text
DATABASE_URL=<SECRET:DATABASE_URL>
REDIS_URL=<SECRET:REDIS_URL>
SESSION_SECRET=<SECRET:SESSION_SECRET>
CRYPTO_SECRET=<SECRET:CRYPTO_SECRET>
PORT=<NEW_API_PORT>
TZ=Asia/Hong_Kong
SESSION_COOKIE_SECURE=true
```

重新部署后先访问 `/api/status`，再检查数据库迁移。禁止在没有备份的情况下升级 New API 镜像。

### AgentMail Relay

- Git 根目录：`/apps/agentmail-relay`
- 构建器：Dockerfile
- Dockerfile：`/apps/agentmail-relay/Dockerfile`
- 健康检查：`/healthz`
- 健康端口：`PORT=8080`
- SMTP 端口：`SMTP_PORT=2525`
- 不生成公网 Domain 或 TCP Proxy。

历史故障与防复发：

1. Railway 根目录已经是 `/apps/agentmail-relay`，Dockerfile 内 `COPY` 必须相对于该目录，不能再次写 `apps/agentmail-relay/...`。
2. Railway 构建环境曾在 `corepack prepare pnpm` 失败，Relay Dockerfile 使用 Node 20 + `npm install --omit=dev`。
3. New API 的 Go SMTP 客户端拒绝明文传输认证信息，必须使用 STARTTLS。
4. Relay 使用自签名证书，因此 New API 仅对 Railway 私网 Relay 开启“跳过 TLS 证书验证”。
5. `allowInsecureAuth` 不是公网安全方案；Relay 必须保持仅私网可见。

## 8. Vercel 官网重新部署

```powershell
vercel --cwd apps/web --prod --project wboke-web-test --yes
```

部署后验证：

```text
https://wboke-web-test.vercel.app/
https://wboke-web-test.vercel.app/api/status
https://wboke-web-test.vercel.app/sign-in
https://wboke-web-test.vercel.app/sign-up
https://wboke-web-test.vercel.app/v1/models
```

正式域名已经切换。后续部署必须先在 deployment URL 完成上述测试，再确认 `www.wboke.com` 指向该 Ready 部署。

重定向防复发：`vercel.json` 中 `/dashboard` 等精确根路径 rewrite 必须排在 `/dashboard/:path*` 等通配规则之前，否则 New API 的尾斜杠规范化可能造成自循环。

## 9. 域名切换顺序

1. 确认 Vercel 官网生产部署 Ready。
2. 确认 `/api/status`、`/sign-in`、`/sign-up`、`/dashboard` 和 `/v1` 的 rewrite 正常。
3. 在 Vercel 将 `www.wboke.com` 绑定到 `wboke-web-test`。
4. 在域名商按 Vercel 提示设置 DNS。
5. 等待证书签发并验证 HTTPS。
6. 使用无痕窗口验证注册、登录和退出。
7. 最后把 New API `ServerAddress` 改为 `https://www.wboke.com`。
8. 重新测试验证邮件、重置密码邮件和 OAuth 回调。
9. 重新构建 Windows 客户端。

禁止倒序操作。先改 `ServerAddress`、后改域名会造成 Cookie、回调和页面跳转循环。

当前执行位置：步骤 1-6 已完成基础 HTTP 验证；步骤 7 的 `ServerAddress` 修改、步骤 8 的邮件/重置/OAuth 验收和步骤 9 的客户端重建仍待完成。

## 10. 数据备份与恢复

试运行也必须执行：

- PostgreSQL 每日备份到 Railway 之外的对象存储。
- 每周保留点、每月保留点和最新备份分开保存。
- 每月至少在隔离数据库做一次恢复演练。
- 记录备份时间、大小、校验值、恢复耗时和执行人。

Redis 不是数据库备份。New API `/data` 卷也不能替代 PostgreSQL 备份。

备份记录模板：

```text
日期=<YYYY-MM-DD HH:mm TZ>
数据库=<PRODUCTION_DB>
文件=<BACKUP_OBJECT_PATH>
SHA256=<HASH>
恢复验证=<PASS/FAIL>
执行人=<OPERATOR>
备注=<NOTES>
```

## 11. 版本发布记录模板

```text
版本=<VERSION>
Git Commit=<COMMIT_SHA>
发布时间=<YYYY-MM-DD HH:mm TZ>
发布平台=<Railway/Vercel/Desktop>
变更说明=<SUMMARY>
数据库迁移=<YES/NO + DETAILS>
回滚版本=<PREVIOUS_DEPLOYMENT_ID>
验证结果=<PASS/FAIL + LINKS>
执行人=<OPERATOR>
```

### 2026-07-15 Vercel 正式域名切换

```text
版本=web-trial-2026-07-15
Git Commit=64822a7e35f172aa80dada6bed30a98dc484a582
发布时间=2026-07-15 Asia/Shanghai
发布平台=Vercel
部署 ID=dpl_5hm166GdvbzxWwrxWebRNowT3cGi
变更说明=绑定 www.wboke.com；补充 /v1 与 /v1beta 代理；修复后台空路径重定向循环
数据库迁移=NO
回滚版本=<在 Vercel Deployments 中选择上一 Ready 部署>
验证结果=PASS：首页、状态、登录、后台、重置页 200；无 Key 模型接口 401
执行人=<OPERATOR>
```

## 12. 接手 Agent 启动清单

1. 阅读 `docs/operations/00-project-status.md`。
2. 运行 `git status --short`，不得覆盖未提交改动。
3. 运行 `git log --oneline -10`，确认本地和 `origin/main`。
4. 检查 Railway 五个服务状态。
5. 检查 Vercel 当前生产部署和 `www.wboke.com` 实际内容。
6. 检查 AgentMail Sent/Bounced/Complained。
7. 不在聊天中请求或回显真实密码和 API Key。
8. 先在测试入口验证，再更改正式域名或生产设置。
9. 任何修复必须更新问题记录、测试结果和发布记录。
