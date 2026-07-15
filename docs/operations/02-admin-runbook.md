# WBoke 管理员操作手册

适用对象：New API 根管理员、运营管理员和故障处理人员。

## 1. 管理入口与账号

正式后台：`https://www.wboke.com/dashboard`

试运行备用后台：`https://wbokedesktop-production.up.railway.app/dashboard`

| 项目 | 记录 |
|---|---|
| 根管理员用户名 | `wboke2026` |
| 根管理员邮箱 | `<ADMIN_EMAIL>` |
| 根管理员密码 | `<在密码管理器中填写>` |
| 二次认证恢复码 | `<保存位置，不记录恢复码正文>` |
| 日常运营账号 | `<OPERATOR_USERNAME>` |
| 日常运营账号密码 | `<在密码管理器中填写>` |

根管理员只用于系统设置、管理员授权和重大变更。渠道巡检、用户处理和兑换码批次应使用独立运营账号。

## 2. 当前系统关系

```text
用户浏览器/Windows 客户端
        |
        v
www.wboke.com (Vercel 官网 + 路由)
        |
        v
Railway New API (账户、Key、计费、渠道、日志、兑换码)
        |                     |
        v                     v
PostgreSQL + Redis       agentmail-relay:2525
                              |
                              v
                    AgentMail HTTPS API
                              |
                              v
                      用户个人邮箱
```

## 3. 注册与身份验证

正式域名配置：系统设置 → 站点与品牌 → 系统信息 → 服务器地址。

```text
ServerAddress=https://www.wboke.com
```

当前数据库中的值尚未由本轮操作复核。修改后必须保存、重新登录，并检查注册邮件和重置邮件中的链接不再指向 Railway 临时域名。

路径：系统设置 → 身份验证 → 基本身份验证

试运行要求：

- 密码登录：开启
- 注册：开启
- 密码注册：开启
- 邮箱验证：开启
- 邮箱域限制：关闭
- 邀请码：不强制
- 新用户初始额度：0
- 邀请者和受邀者奖励：0

路径：系统设置 → 身份验证 → 机器人保护

- 正式公开注册前启用 Cloudflare Turnstile。
- Site Key：`<TURNSTILE_SITE_KEY>`
- Secret Key：`<SECRET:TURNSTILE_SECRET_KEY>`

路径：系统设置 → 身份验证 → 通行密钥认证

- 域名稳定并启用 HTTPS 后再开启。
- RP ID：`www.wboke.com`
- Allowed Origins：`https://www.wboke.com`
- 不允许不安全来源。

## 4. SMTP 邮件

路径：系统设置 → 运维 → SMTP 邮箱

| 字段 | 值 |
|---|---|
| SMTP 主机 | `agentmail-relay.railway.internal` |
| 端口 | `2525` |
| 加密 | `STARTTLS` |
| 跳过证书验证 | 开启，仅限当前 Railway 私网自签名证书 |
| 用户名 | `<SECRET:RELAY_USERNAME>` |
| 密码 | `<SECRET:RELAY_PASSWORD>` |
| 发件地址 | `wboke-5247@agentmail.to` |

Railway `agentmail-relay` 变量：

```text
AGENTMAIL_API_KEY=<SECRET:AGENTMAIL_API_KEY>
AGENTMAIL_INBOX_ID=wboke-5247@agentmail.to
RELAY_USERNAME=<SECRET:RELAY_USERNAME>
RELAY_PASSWORD=<SECRET:RELAY_PASSWORD_MIN_24_CHARS>
SMTP_PORT=2525
PORT=8080
```

故障要点：

- Railway Trial/Hobby 禁止 New API 直接连接公网 SMTP，因此必须走私网 Relay。
- New API 的 Go SMTP 客户端拒绝在非 TLS 连接上传输认证信息，因此必须使用 STARTTLS。
- Relay 不得生成公网 TCP 代理或公网 SMTP 域名。
- AgentMail Key 必须限制为 `wboke-5247@agentmail.to` 的 `Message Send` 权限。
- 聊天、截图或工单中暴露的 Key 必须立即撤销并重新生成。

## 5. 上游渠道

路径：渠道 → 创建渠道

每个提供商建议两条渠道：

| 提供商 | 主用 | 兜底 |
|---|---|---|
| OpenAI | 已审核第三方 | 官方 OpenAI |
| Anthropic | 已审核第三方 | 官方 Anthropic |
| Gemini | 已审核第三方 | 官方 Google |
| DeepSeek | 已审核第三方 | 官方 DeepSeek |
| GLM | 已审核第三方 | 官方智谱 |

每条渠道记录：

```text
渠道名称=<PROVIDER>-<THIRD_PARTY_OR_OFFICIAL>-<REGION>
渠道类型=<NEW_API_CHANNEL_TYPE>
Base URL=<UPSTREAM_BASE_URL>
API Key=<SECRET:UPSTREAM_API_KEY>
模型列表=<EXACT_MODEL_IDS>
分组=<default/vip/svip>
优先级=<PRIORITY>
权重=<WEIGHT>
状态测试结果=<DATE/RESULT>
授权证明位置=<DOCUMENT_LOCATION>
```

先创建第三方主用，再创建官方兜底。只有实际测试成功、模型名匹配、价格核对完成的渠道才能启用给付费用户。

## 6. 模型与价格

路径：系统设置 → 计费与支付 → 模型定价

预置价格只能作为参考。每个开放模型必须记录：

- 上游真实模型 ID
- 输入、输出、缓存读取、缓存写入价格
- 单位是每百万 Token 还是按次
- 第三方采购价与官方兜底价
- 生效日期和来源链接
- 价格变更负责人

路径：系统设置 → 计费与支付 → 分组定价

当前倍率均为 1。正式试运行前填写：

```text
default=<DEFAULT_GROUP_RATIO>
vip=<VIP_GROUP_RATIO>
svip=<SVIP_GROUP_RATIO>
default_recharge=<DEFAULT_RECHARGE_RATIO>
vip_recharge=<VIP_RECHARGE_RATIO>
svip_recharge=<SVIP_RECHARGE_RATIO>
```

倍率变更前必须用小额真实请求验证一次账单。不要同时修改模型价格、分组倍率和汇率，否则无法定位计费差异。

## 7. 人民币与充值

路径：系统设置 → 计费与支付 → 货币与展示

- 显示模式：CNY
- 美元汇率：`<ACCOUNTING_USD_CNY_RATE>`
- Token 统计：开启

路径：系统设置 → 计费与支付 → 额度设置

- 新用户额度：0
- 充值链接：`<LIANXIAOPU_STOREFRONT_OR_RECHARGE_PAGE>`
- 文档链接：`<WBOKE_DOCS_URL>`

路径：兑换码 → 创建代码

首批面额：`1/5/10/20/50/100`。每批记录批次名、生成数量、额度、有效期、链小铺商品、导出位置和已售数量。兑换码文件属于敏感资产，不得提交 Git。

支付网关页面存在合规确认。该确认是经营者的法律声明，必须由经营者本人阅读并操作，Agent 或开发人员不得代为确认。

## 8. 安全设置

路径：系统设置 → 安全与限制

- SSRF：保持开启。
- 允许私有 IP：保持关闭。
- 对解析后的域应用 IP 筛选：保持开启。
- 用户 Token 上限：建议 `5-10`，不要保留 `1000`。
- 模型请求限流：根据上游限制按分组配置。
- 登录、注册、验证码接口限流：通过 New API/Railway 环境变量和 Turnstile 配置。

管理员安全：

- Root 账号开启 Passkey/2FA。
- GitHub、Railway、Vercel、AgentMail 和域名商全部开启 2FA。
- 禁止共用管理员密码。
- 每季度轮换上游 Key，人员离职立即撤权。

## 9. 日常运营

每日：

- 检查渠道状态、错误率、余额和上游额度。
- 检查 AgentMail 发送、退信和投诉率。
- 检查 Railway 服务是否在线和费用消耗。

每周：

- 抽查模型价格和计费日志。
- 检查异常用户、异常请求和大量失败。
- 验证 PostgreSQL 备份任务成功。

每月：

- 做一次备份恢复演练。
- 复核管理员、渠道和平台账号权限。
- 更新依赖和 New API 版本前先阅读迁移说明并在测试环境验证。

## 10. 上线验收

1. 新邮箱注册并收到验证码。
2. 用户登录并创建独立 API Key。
3. 六档兑换码各测试一次。
4. 五家提供商至少各测试一个模型。
5. 测试第三方主用失败时官方兜底。
6. 对照上游账单验证输入、输出和缓存计费。
7. Windows 客户端登录、写入配置、调用和撤销 Key 全流程通过。
8. 管理员可查到用户、兑换、调用和错误日志。

## 11. 当前未修复问题处理

验证码未收到：

1. 记录邮箱和精确发送时间。
2. 检查 New API 请求结果和 Relay 部署日志。
3. 在 AgentMail 检查 Sent、Bounced、Complained 和对应消息。
4. 只在确认没有进入发送队列后重试，避免触发收件方风控。

重定向过多：

1. 2026-07-15 已修复 Vercel 空路径 wildcard rewrite 自循环，部署 ID 为 `dpl_5hm166GdvbzxWwrxWebRNowT3cGi`。
2. 若再次出现，记录完整 URL、时间和浏览器是否已登录，先用无痕窗口复现。
3. 检查精确根路径 rewrite 是否仍排在对应 `/:path*` 规则之前。
4. 检查 `www.wboke.com` 实际部署、New API `ServerAddress` 和 Cookie Domain。

忘记密码：

- 自助流程验收前，由 Root/运营管理员在“用户”页面核验账号状态。
- 不通过聊天接收或发送明文密码。
- 重置完成后要求用户自行设置新密码，并使旧会话失效。
