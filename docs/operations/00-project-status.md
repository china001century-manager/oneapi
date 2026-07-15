# 当前进度与未完成项

更新时间：2026-07-15（Asia/Shanghai）

## 项目目标

WBoke 是基于 New API 的商业 AI API 服务。用户通过个人邮箱注册，使用链小铺购买预生成兑换码，在网站兑换余额，再通过网站或 Windows 客户端获取 API 配置。上游渠道采用“已审核第三方主用、官方渠道兜底”。

## 已完成

- GitHub 仓库已建立并连接 Railway 自动部署。
- Railway 上 New API、PostgreSQL、Redis 和 AgentMail SMTP 中继在线。
- New API 注册、密码登录和邮箱验证已开启。
- New API 到 AgentMail 的完整发信链路曾测试成功。
- 测试邮箱 `909599954@qq.com` 曾实际收到验证码，但经营者后续自测出现未收到邮件，不能据此判定生产邮件稳定。
- AgentMail 生产 Key 已限制为指定 Inbox 的 `Message Send` 权限。
- 聊天中暴露过的旧 AgentMail Key 已撤销。
- SSRF 防护已开启，私有 IP 访问未开放。
- 官网已部署到 Vercel 测试地址。
- `/api`、`/dashboard`、`/v1` 和 `/v1beta` 的单域名代理配置已进入代码。
- `www.wboke.com` 已从旧“粒子日记”项目切换到 Vercel `wboke-web-test`。
- Vercel 空路径 rewrite 造成的后台路由自循环已修复并部署。
- 正式域名的首页、状态接口、登录、后台、重置页和无 Key 模型接口已完成 HTTP 验证。

## 当前部署状态

| 组件 | 平台 | 当前地址/标识 | 状态 |
|---|---|---|---|
| 官网 | Vercel | `https://www.wboke.com` | 在线、正式域名已切换 |
| New API | Railway | `https://wbokedesktop-production.up.railway.app` | 在线 |
| PostgreSQL | Railway | 私网服务 `Postgres` | 在线 |
| Redis | Railway | 私网服务 `Redis` | 在线 |
| 邮件中继 | Railway | `agentmail-relay.railway.internal:2525` | 在线、仅私网 |
| 发信 Inbox | AgentMail | `wboke-5247@agentmail.to` | 可用 |
| Vercel 生产部署 | Vercel | `dpl_5hm166GdvbzxWwrxWebRNowT3cGi` | Ready，已绑定正式域名 |

## 已知配置

- New API 系统名：`WBoke API`
- New API `ServerAddress` 当前值：预计仍为 `https://wbokedesktop-production.up.railway.app`，待管理员后台复核
- New API `ServerAddress` 目标值：`https://www.wboke.com`
- New API 根管理员用户名：`wboke2026`
- 根管理员角色：`Root`
- 根管理员密码：`<在密码管理器中填写>`
- 根管理员邮箱：`<ADMIN_EMAIL>`
- 注册：开启
- 密码注册/登录：开启
- 邮箱验证：开启
- 邀请码：不强制
- 邮箱域限制：关闭
- Turnstile：未配置
- 模型请求速率限制：未开启
- 每用户最大 Token 数：`1000`（正式试运行前必须降低）
- 货币显示：`USD`（需要切换为 CNY）
- 美元汇率：`7.3`（需要经营者确认）
- 新用户初始额度：`0`
- 邀请奖励：`0`
- 分组倍率：`default=1`、`vip=1`、`svip=1`
- 充值倍率：全部为 `1`
- 上游渠道数：`0`
- 兑换码数：`0`
- 模型价格库：约 `281` 条预置数据，未与真实渠道逐项核对

## 客户端真实状态

- Windows 客户端不是“完全没开发”：仓库已有 Tauri 2 客户端、登录界面、账户同步、工具检测和配置写入代码。
- 客户端尚未达到正式发布状态：未完成真实 New API 登录端到端验收，未完成忘记密码入口，未完成密码显示/隐藏按钮，未完成正式域名构建和安装包发布验收。
- 当前不能向用户承诺“下载安装即可稳定使用”。正式安装包 URL、版本和 SHA256 仍为空。

## 正式问题登记

### ISSUE-001：验证码邮件偶发未收到

- 优先级：P0，阻断公开注册。
- 已知现象：受控测试返回 `success: true`，AgentMail 发送计数增加，测试邮箱曾收到；经营者后续自测未收到。
- 当前结论：接口成功只表示 AgentMail 接受发送，不等于最终投递成功。
- 待收集：收件邮箱、发送时间（精确到分钟）、页面返回内容、AgentMail Message ID、投递/退信状态、垃圾邮件检查结果。
- 可能方向：邮箱服务商延迟或拦截、同地址发送频率限制、AgentMail 免费额度/风控、发件域信誉、Relay 到 AgentMail 请求成功但下游未投递。
- 验收标准：QQ、163、Outlook 三类邮箱各连续发送 3 次；全部在 5 分钟内到达，AgentMail 无 bounce/complaint，New API 日志可关联到 Message ID。
- 修复前临时措施：不要连续点击；间隔 60 秒；管理员通过 AgentMail 控制台核对 Sent/Bounced；必要时人工处理注册。

### ISSUE-002：浏览器提示“重新定向次数过多”（已修复，继续观察）

- 原因：Vercel 的 `/dashboard/:path*` 等通配 rewrite 在空路径上触发 New API 尾斜杠规范化，返回 `301 Location: /dashboard` 到自身。
- 修复：在每个通配 rewrite 前增加精确根路径 rewrite；同样处理 `/keys`、`/wallet`、`/usage-logs`、`/users`、`/system-settings`、`/oauth`、`/reset` 和 `/setup`。
- 部署：Vercel deployment `dpl_5hm166GdvbzxWwrxWebRNowT3cGi`。
- 已验证：`/`、`/api/status`、`/sign-in`、`/dashboard`、`/reset` 均直接返回 200；`/v1/models` 无 Key 返回预期 401。
- 防复发：精确根路径 rewrite 必须位于对应 `/:path*` 规则之前；任何 Vercel 配置变更都要逐项检查空路径和子路径。
- 剩余验收：登录态下完成登录、进入后台、退出、重新登录的浏览器端到端测试。

### ISSUE-003：忘记密码入口缺失

- 优先级：P1。
- 已知现象：官网自定义登录页没有“忘记密码”入口。
- 后端线索：Vercel 已配置 `/reset/:path*` 代理，但 `/reset` 页面和邮件重置全流程尚未验证。
- 待实现：登录页增加“忘记密码”；验证 New API 重置邮件；验证 Token 过期、重复使用和密码更新后旧会话失效。
- 临时措施：管理员在“用户”页面核验身份后重置账号；不得通过聊天接收或发送明文密码。
- 验收标准：用户输入已绑定邮箱后收到一次性重置邮件，链接只能使用一次，过期后不可用，新密码可登录。

### ISSUE-004：密码输入框缺少显示/隐藏按钮

- 优先级：P1。
- 影响范围：官网登录/注册页和 Windows 客户端登录页。
- 待实现：使用现有 Lucide `Eye/EyeOff` 图标；按钮具备 `aria-label` 和 tooltip；不改变密码值，不写日志，不持久化密码。
- 验收标准：鼠标、键盘和屏幕阅读器均可操作；移动端不遮挡文字；切换后表单状态不丢失。

### ISSUE-005：登录错误提示与账号状态无法区分

- 优先级：P1。
- 已知现象：页面只显示“用户名或密码错误，或用户已被封禁”。
- 安全约束：公开登录接口不能泄露账号是否存在，但管理员后台必须能区分密码错误、禁用、封禁和邮箱未验证。
- 待处理：用户侧提供安全但可行动的提示和“忘记密码”；管理员侧记录精确原因、时间、IP 和用户状态。
- 验收标准：用户提示不造成账号枚举，管理员日志可定位真实原因。

## 本轮变更边界

- 已完成文档整理、域名切换、Vercel rewrite 修复和正式域名 HTTP 核验。
- `ISSUE-003` 至 `ISSUE-005` 只登记，不在本轮实现 UI 或认证行为变更。
- New API `ServerAddress` 仍需在后台改为 `https://www.wboke.com`，修改后必须重新验收注册、登录和邮件。

## 正式试运行阻断项

1. 配置并测试至少一组真实上游渠道；理想状态是每家第三方主用、官方兜底。
2. 核对实际开放模型和模型价格，关闭无渠道或无准确价格的模型。
3. 确认 `default`、`vip`、`svip` 的销售倍率和充值倍率。
4. 切换货币显示为 CNY，并确认人民币/美元会计汇率。
5. 经营者本人阅读并确认 New API 支付网关页面的合规声明。
6. 创建 `1/5/10/20/50/100` 六档兑换码批次并完成兑换测试。
7. 配置链小铺购买入口与商品面额对应表。
8. ~~完成 `www.wboke.com` 域名切换和基础 HTTP 验证。~~ 已完成；登录态、注册和邮件端到端验收仍未完成。
9. 将每用户最大 Token 数从 `1000` 调整为建议的 `5-10`。
10. 配置 Turnstile、登录/注册限流、模型请求限流和管理员二次认证。
11. 建立 Railway 以外的 PostgreSQL 备份并做一次恢复演练。
12. 使用真实 Windows 安装包验证登录、创建 Key 和写入工具配置。

## 后续迁移项

- Railway Trial 仅用于试运行；到期前升级付费套餐或迁移香港专用服务器。
- 当前 Railway 区域为 US West，不满足最终香港部署目标。
- 迁香港服务器时使用 `deploy/docker-compose.yml` 和 Caddy 配置，不直接跟随 New API `latest` 标签。
- 正式发信建议改用 `noreply@wboke.com`，配置 SPF、DKIM 和 DMARC。
