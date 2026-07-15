# WBoke 上游模型接入与渠道管理指南

适用对象：New API Root 管理员、渠道管理员和计费负责人。

本指南以当前固定版本 `calciumion/new-api:v1.0.0-rc.21` 为准。后台菜单名称可能随版本略有变化，升级前必须先在测试环境核对。

## 1. 接入原则

- 已审核第三方渠道主用，官方渠道兜底。
- 渠道类型按上游实际协议选择，不按销售商名称猜测。
- 一个渠道只承担一种协议、一个凭据和一组明确模型。
- 新渠道先保持禁用，测试通过后才加入付费用户分组。
- 上游 Key 只填入 New API 后台，不写入 Git、文档、截图或聊天。
- New API 不会自动根据采购成本计算销售价，价格和利润必须由管理员配置并复核。

## 2. 接入前材料

每个渠道准备以下记录：

```text
渠道供应商=<COMPANY>
渠道来源=<THIRD_PARTY/OFFICIAL>
控制台地址=<UPSTREAM_CONSOLE_URL>
协议=<OPENAI/ANTHROPIC/GEMINI/OTHER>
Base URL=<UPSTREAM_BASE_URL>
API Key=<SECRET:UPSTREAM_API_KEY>
可用模型=<EXACT_MODEL_IDS>
采购价格来源=<PRICE_URL_OR_CONTRACT>
余额查询地址=<BALANCE_URL>
授权审核材料=<SECURE_DOCUMENT_LOCATION>
负责人=<OWNER>
到期时间=<DATE_OR_NONE>
```

第三方给出的 Base URL 可能已经包含 `/v1`。必须使用供应商文档中的完整值，不要自行重复添加或删除路径。

## 3. 后台字段含义

入口：管理员登录 `https://www.wboke.com/dashboard` → 渠道 → 添加渠道。

| 字段 | 填写规则 |
|---|---|
| 类型 | 选择上游真实协议；第三方提供 OpenAI 兼容接口时选 OpenAI 兼容类型 |
| 名称 | `<厂商>-<第三方或官方>-<地区>-<用途>`，例如 `OpenAI-ThirdParty-HK-Primary` |
| Base URL | 使用上游文档提供的地址，不填 WBoke 地址 |
| Key | 上游 API Key，只在后台保存 |
| 模型 | 只选择实际开通、测试通过且价格已核对的模型 |
| 模型映射 | 上游模型名与对外模型名不一致时填写；没有差异则留空 |
| 分组 | 首次测试只放 `internal-test`；验收后再加入 `default/vip/svip` |
| 优先级 | 当前版本中数值越大越优先；保存前以页面提示再次确认 |
| 权重 | 只在同优先级渠道之间分流；单主渠道保持 `1` |
| 状态 | 创建时禁用，测试完成后启用 |

推荐初始策略：第三方主用优先级 `100`、官方兜底 `50`、权重均为 `1`。同一模型至少保留一条已测试的兜底渠道。

## 4. 五家提供商配置模板

### OpenAI

官方渠道：

```text
类型=OpenAI
名称=OpenAI-Official-Fallback
Base URL=https://api.openai.com
Key=<SECRET:OPENAI_API_KEY>
模型=<按官方项目权限选择，不照抄全量模型>
优先级=50
```

第三方渠道：如果供应商明确提供 OpenAI 兼容协议，选择 OpenAI 类型并使用其完整 Base URL。先用 `/v1/models` 和一次最小文本请求确认模型名与协议。

### Anthropic

官方渠道：

```text
类型=Anthropic/Claude
名称=Anthropic-Official-Fallback
Base URL=https://api.anthropic.com
Key=<SECRET:ANTHROPIC_API_KEY>
模型=<EXACT_CLAUDE_MODEL_IDS>
优先级=50
```

第三方若提供原生 Anthropic Messages 协议，选择 Anthropic 类型；只有明确提供 OpenAI 兼容接口时才选择 OpenAI 类型。不要仅因为模型名称包含 Claude 就选 Anthropic 类型。

### Gemini

官方渠道：

```text
类型=Google Gemini
名称=Gemini-Official-Fallback
Base URL=https://generativelanguage.googleapis.com
Key=<SECRET:GEMINI_API_KEY>
模型=<EXACT_GEMINI_MODEL_IDS>
优先级=50
```

第三方可能提供 Gemini 原生、OpenAI 兼容或两套接口。按实际调用协议分别创建渠道，不在同一渠道中混用两种协议。

### DeepSeek

官方渠道：

```text
类型=DeepSeek（如当前版本提供）或 OpenAI 兼容
名称=DeepSeek-Official-Fallback
Base URL=https://api.deepseek.com
Key=<SECRET:DEEPSEEK_API_KEY>
模型=<EXACT_DEEPSEEK_MODEL_IDS>
优先级=50
```

以 DeepSeek 官方文档和当前 New API 类型支持为准。测试时分别验证普通响应和流式响应。

### GLM / 智谱

官方渠道：

```text
类型=智谱/GLM（如当前版本提供）或 OpenAI 兼容
名称=GLM-Official-Fallback
Base URL=https://open.bigmodel.cn/api/paas/v4
Key=<SECRET:GLM_API_KEY>
模型=<EXACT_GLM_MODEL_IDS>
优先级=50
```

如果当前 New API 类型已经自动附加 `/api/paas/v4`，Base URL 应按后台提示填写，避免路径重复。以渠道测试日志中的最终请求 URL 为准。

## 5. 单个渠道的上线步骤

1. 创建 `internal-test` 分组，确保普通用户不能调用。
2. 在“渠道 → 添加渠道”填写类型、名称、Base URL 和 Key。
3. 只勾选供应商明确授权的模型，保持渠道禁用并保存。
4. 使用后台“测试”功能测试一个低成本模型。
5. 检查渠道日志，确认最终 URL、HTTP 状态、延迟和上游错误正文。
6. 使用测试用户 Key 发起非流式请求，核对响应内容和 Token 统计。
7. 再测试流式请求、长上下文、工具调用和图片输入；只测试该模型实际支持的能力。
8. 在上游控制台核对请求与费用，确认没有路径重复或模型映射错误。
9. 填写该模型价格和缓存计费，做一次 WBoke 扣费对账。
10. 将渠道加入目标用户分组并启用。
11. 记录测试时间、模型、请求 ID、上游费用和执行人。

任何一步失败都保持禁用，不要依靠提高重试次数掩盖协议或模型错误。

## 5.1 VIP Token 待建渠道模板

供应商入口：`https://www.vip-token.net`

2026-07-15 验证结果：无 Key 时 OpenAI `/v1/models` 和 Anthropic `/v1/messages` 均返回 401 JSON。使用经营者提供的临时 Key 后，`gpt-5.5` 的 `/v1/responses` 与 `/v1/chat/completions` 均返回 200；模型列表返回 82 个模型。Anthropic 的 `claude-sonnet-4-6` 与 `claude-haiku-4-5` 均返回 503 `api_error`，因此 Anthropic 渠道暂不可启用。测试 Key 已暴露在聊天中，测试后必须删除/轮换。

New API 会把用户请求路径 `/v1/...` 拼接到渠道 Base URL，因此后台 Base URL 填域名根地址 `https://www.vip-token.net`，不要填客户端使用的 `https://www.vip-token.net/v1`，否则可能形成 `/v1/v1/...`。

OpenAI 兼容渠道：

```text
类型=OpenAI
名称=VIPToken-OpenAI-Compatible-Primary
Base URL=https://www.vip-token.net
Key=<由经营者在后台填写>
模型=gpt-5.2,gpt-5.3-codex,gpt-5.3-codex-spark,gpt-5.4,gpt-5.4-mini,gpt-5.5,gemini-2.5-flash,gemini-3-flash,gemini-3.1-flash-image
分组=internal-test
优先级=100
权重=1
状态=Key 轮换后可在 internal-test 分组启用；进入用户分组前再通过 New API 后台测试
```

Anthropic 原生渠道：

```text
类型=Anthropic/Claude
名称=VIPToken-Anthropic-Primary
Base URL=https://www.vip-token.net
Key=<由经营者在后台填写>
模型=claude-haiku-4-5,claude-opus-4-6,claude-opus-4-7,claude-opus-4-8,claude-sonnet-4-6
分组=internal-test
优先级=100
权重=1
状态=禁用；等待供应商修复 503 后重新测试
```

模型名称来自经营者提供的供应商页面截图。填 Key 后先在后台逐条刷新/测试模型；供应商实际 `/v1/models` 返回结果与截图不一致时，以 API 返回和成功调用结果为准。

WorkBuddy、Trae、Cursor 等客户端不应直接持有 VIP Token 上游 Key。正式使用时客户端填 WBoke 用户 Key，Base URL 仍为 `https://www.wboke.com/v1`；只有 New API 服务器保存第三方 Key。

供应商直连 Codex 只用于管理员临时验收，不作为用户正式配置。根据 Codex 官方配置手册，使用独立 provider ID 和环境变量读取 Key：

```toml
model_provider = "vip_token"
model = "gpt-5.5"
review_model = "gpt-5.5"
model_reasoning_effort = "xhigh"
disable_response_storage = true

[model_providers.vip_token]
name = "VIP Token"
base_url = "https://www.vip-token.net/v1"
wire_api = "responses"
env_key = "VIP_TOKEN_API_KEY"
supports_websockets = false
```

不要设置 `requires_openai_auth = true`，它只适用于由 OpenAI 官方认证支撑的 provider。HTTP Responses 实测完成前不要打开 `responses_websockets_v2`；WebSocket 需要供应商明确支持并单独验收。测试结束后删除临时环境变量 `VIP_TOKEN_API_KEY`，不要把 Key 写入 TOML。

## 6. 模型映射

只有上游模型名和 WBoke 对外模型名不同时才配置映射：

```text
对外模型名=<PUBLIC_MODEL_ID>
上游模型名=<UPSTREAM_MODEL_ID>
```

同一个对外模型的主用和兜底渠道必须返回兼容能力。不能把价格低但能力不同的模型静默映射为高规格模型。模型版本升级应新增映射并灰度测试，不直接覆盖仍有调用的旧版本。

## 7. 定价、倍率和利润

后台位置：系统设置 → 计费与支付 → 模型定价、分组定价、充值倍率。

- 模型价格/模型倍率：决定该模型每次请求扣除多少额度。
- 分组倍率：在模型计费基础上调整某类用户的调用售价。
- 充值倍率：决定用户付款后获得多少额度，不改变单次请求的模型消耗。
- 汇率：决定美元基础价格如何显示和折算成人民币。
- 渠道优先级和权重：只负责路由，不会自动修改用户售价。

推荐配置顺序：先核对模型基础价，再设置汇率，再设置分组倍率，最后设置充值倍率。每次只改一层并做一次小额对账。

最低销售价必须覆盖：第三方采购成本、官方兜底成本、汇率波动、支付和退款成本、服务器与邮件成本以及目标利润。官方兜底通常更贵，销售价不能只按第三方最低采购价计算。

对账记录：

```text
模型=<MODEL_ID>
测试输入/输出 Tokens=<VALUES>
上游实际成本=<CURRENCY_AMOUNT>
WBoke 扣除额度=<QUOTA>
用户显示金额=<CNY>
毛利率=<PERCENT>
模型价格配置=<VALUE>
分组倍率=<VALUE>
汇率=<VALUE>
结果=<PASS/FAIL>
```

## 8. 主用与兜底验收

1. 确认第三方主用和官方兜底暴露相同的对外模型名。
2. 正常请求应命中优先级 `100` 的第三方渠道。
3. 暂时禁用第三方渠道，或在维护窗口使用测试分组模拟失败。
4. 同一测试请求应切换到优先级 `50` 的官方渠道并成功。
5. 恢复第三方渠道，再次确认请求回到主用渠道。
6. 对比两条渠道的响应能力、Token 统计、缓存计费和用户扣费。

不要在生产环境通过填写错误 Key 来测试故障转移，这会产生大量失败日志并可能触发上游风控。

## 9. 日常管理

每日检查：渠道可用率、P95 延迟、上游余额、401/429/5xx、用户投诉和异常费用。

每周检查：模型列表变化、价格变化、官方兜底是否仍可用、第三方授权状态、失败切换记录。

变更 Key 时先新增第二条渠道并测试，再切换优先级，最后撤销旧 Key。不要直接覆盖唯一生产渠道的 Key。

## 10. 常见故障

| 现象 | 优先检查 |
|---|---|
| 401/403 | Key 权限、项目/地区限制、Base URL、请求协议 |
| 404 | Base URL 是否重复 `/v1`，模型 ID 和映射是否正确 |
| 429 | 上游额度、并发限制、RPM/TPM、用户分组限流 |
| 5xx | 上游状态、代理超时、流式连接、渠道日志中的请求 ID |
| 测试成功但用户不可用 | 渠道分组、模型权限、用户分组、Token 模型限制 |
| 扣费不正确 | 模型价格、缓存价格、分组倍率、汇率、充值倍率 |
| 未切换到兜底 | 两条渠道是否同分组同模型，优先级和自动重试策略 |

## 11. 渠道变更记录

```text
时间=<YYYY-MM-DD HH:mm TZ>
渠道=<CHANNEL_NAME>
变更=<CREATE/ENABLE/DISABLE/KEY_ROTATION/PRICE_CHANGE>
模型=<MODEL_IDS>
变更前=<SUMMARY>
变更后=<SUMMARY>
测试结果=<PASS/FAIL + REQUEST_ID>
回滚方式=<STEPS>
执行人=<OPERATOR>
复核人=<REVIEWER>
```
