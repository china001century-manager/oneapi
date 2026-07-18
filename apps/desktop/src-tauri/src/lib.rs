mod tool_config;

use reqwest::{Client, Method, Response};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Mutex;
use tool_config::{ConfigApplyResult, RestoreResult, ToolDetection};

const PORTAL_ORIGIN: &str = "https://www.wboke.com";
const DESKTOP_TOKEN_NAME: &str = "六脉神剑 Desktop";

#[derive(Clone)]
struct AuthSession {
    client: Client,
    user_id: Option<i64>,
}

#[derive(Default)]
struct AuthState {
    session: Mutex<Option<AuthSession>>,
}

#[derive(Deserialize)]
struct ApiEnvelope<T> {
    success: bool,
    message: Option<String>,
    data: Option<T>,
}

#[derive(Debug, Deserialize, Serialize)]
struct PortalStatus {
    email_verification: bool,
    password_login_enabled: bool,
    password_register_enabled: bool,
    register_enabled: bool,
    turnstile_check: bool,
    turnstile_site_key: String,
    #[serde(default = "default_quota_per_unit")]
    quota_per_unit: f64,
    #[serde(default = "default_usd_exchange_rate")]
    usd_exchange_rate: f64,
}

fn default_quota_per_unit() -> f64 {
    500_000.0
}

fn default_usd_exchange_rate() -> f64 {
    7.3
}

#[derive(Debug, Deserialize)]
struct PortalUser {
    id: i64,
    username: String,
    display_name: String,
    email: String,
    group: String,
    quota: i64,
}

#[derive(Debug, Deserialize)]
struct PortalToken {
    id: i64,
    status: i64,
    #[serde(default)]
    name: String,
}

fn active_desktop_token_id(tokens: &[PortalToken]) -> Result<Option<i64>, String> {
    let ids: Vec<i64> = tokens
        .iter()
        .filter(|token| token.status == 1 && token.name == DESKTOP_TOKEN_NAME)
        .map(|token| token.id)
        .collect();
    match ids.as_slice() {
        [] => Ok(None),
        [id] => Ok(Some(*id)),
        _ => Err("检测到多个同名桌面端 API Key，请在网站保留一个后重试".to_string()),
    }
}

#[derive(Debug, Deserialize)]
#[serde(bound(deserialize = "T: Deserialize<'de>"))]
struct PageData<T> {
    #[serde(default)]
    items: Vec<T>,
}

#[derive(Debug, Deserialize)]
struct TokenKey {
    key: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Account {
    id: i64,
    email: String,
    display_name: String,
    group: String,
    balance_cny: f64,
    api_key_masked: String,
    base_url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DashboardSnapshot {
    account: Account,
    synced_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopLoginResult {
    requires_two_factor: bool,
    snapshot: Option<DashboardSnapshot>,
}

#[tauri::command]
fn detect_tools() -> Vec<ToolDetection> {
    tool_config::detect_tools()
}

#[tauri::command]
fn open_official_url(url: String) -> Result<(), String> {
    let parsed = url::Url::parse(&url).map_err(|_| "无效地址".to_string())?;
    let host = parsed.host_str().ok_or_else(|| "地址缺少域名".to_string())?;
    let allowed_host = host == "wboke.com"
        || host.ends_with(".wboke.com")
        || host == "pay.ldxp.cn";
    if parsed.scheme() != "https" || !allowed_host {
        return Err("仅允许打开六脉神剑官网或指定链小铺 HTTPS 地址".to_string());
    }
    open::that_detached(parsed.as_str()).map_err(|error| format!("无法打开浏览器: {error}"))
}

async fn parse_envelope<T: DeserializeOwned>(response: Response) -> Result<Option<T>, String> {
    let status = response.status();
    let payload = response
        .json::<ApiEnvelope<T>>()
        .await
        .map_err(|_| format!("服务返回了无法识别的数据 ({status})"))?;
    if !status.is_success() || !payload.success {
        return Err(payload.message.unwrap_or_else(|| format!("请求失败 ({status})")));
    }
    Ok(payload.data)
}

async fn request_json<T: DeserializeOwned>(
    client: &Client,
    method: Method,
    path: &str,
    user_id: Option<i64>,
    body: Option<Value>,
) -> Result<Option<T>, String> {
    let mut request = client.request(method, format!("{PORTAL_ORIGIN}{path}"));
    if let Some(id) = user_id {
        request = request.header("New-Api-User", id.to_string());
    }
    if let Some(value) = body {
        request = request.json(&value);
    }
    let response = request.send().await.map_err(|_| "无法连接 WBoke API，请检查网络".to_string())?;
    parse_envelope(response).await
}

async fn load_status(client: &Client) -> Result<PortalStatus, String> {
    request_json(client, Method::GET, "/api/status", None, None)
        .await?
        .ok_or_else(|| "服务状态数据为空".to_string())
}

async fn load_tokens(client: &Client, user_id: i64) -> Result<Vec<PortalToken>, String> {
    let page = request_json::<PageData<PortalToken>>(
        client,
        Method::GET,
        "/api/token/?p=1&size=100",
        Some(user_id),
        None,
    )
    .await?
    .ok_or_else(|| "API Key 列表为空".to_string())?;
    Ok(page.items)
}

async fn ensure_api_key(client: &Client, user_id: i64) -> Result<String, String> {
    let mut tokens = load_tokens(client, user_id).await?;
    let token_id = match active_desktop_token_id(&tokens)? {
        Some(id) => id,
        None => {
            let _ = request_json::<Value>(
                client,
                Method::POST,
                "/api/token/",
                Some(user_id),
                Some(json!({
                    "name": DESKTOP_TOKEN_NAME,
                    "expired_time": -1,
                    "unlimited_quota": true,
                    "model_limits_enabled": false
                })),
            )
            .await?;
            tokens = load_tokens(client, user_id).await?;
            tokens
                .iter()
                .find(|token| token.status == 1 && token.name == DESKTOP_TOKEN_NAME)
                .map(|token| token.id)
                .ok_or_else(|| "无法创建桌面端 API Key".to_string())?
        }
    };

    request_json::<TokenKey>(
        client,
        Method::POST,
        &format!("/api/token/{token_id}/key"),
        Some(user_id),
        Some(json!({})),
    )
    .await?
    .map(|value| value.key)
    .ok_or_else(|| "API Key 数据为空".to_string())
}

fn mask_key(key: &str) -> String {
    let chars: Vec<char> = key.chars().collect();
    if chars.len() <= 8 {
        return "*".repeat(chars.len());
    }
    format!(
        "{}**********{}",
        chars.iter().take(4).collect::<String>(),
        chars.iter().skip(chars.len() - 4).collect::<String>()
    )
}

async fn build_snapshot(client: &Client, user_id: i64) -> Result<DashboardSnapshot, String> {
    let user = request_json::<PortalUser>(client, Method::GET, "/api/user/self", Some(user_id), None)
        .await?
        .ok_or_else(|| "账户数据为空".to_string())?;
    let status = load_status(client).await?;
    let api_key = ensure_api_key(client, user_id).await?;
    let quota_per_unit = status.quota_per_unit.max(1.0);
    let balance_cny = user.quota as f64 / quota_per_unit * status.usd_exchange_rate.max(0.0);

    Ok(DashboardSnapshot {
        account: Account {
            id: user.id,
            email: user.email,
            display_name: if user.display_name.is_empty() { user.username } else { user.display_name },
            group: user.group,
            balance_cny,
            api_key_masked: mask_key(&api_key),
            base_url: tool_config::OPENAI_BASE_URL.to_string(),
        },
        synced_at: "刚刚".to_string(),
    })
}

fn save_session(state: &tauri::State<'_, AuthState>, session: AuthSession) -> Result<(), String> {
    let mut guard = state.session.lock().map_err(|_| "登录状态不可用".to_string())?;
    *guard = Some(session);
    Ok(())
}

fn current_session(state: &tauri::State<'_, AuthState>) -> Result<AuthSession, String> {
    state
        .session
        .lock()
        .map_err(|_| "登录状态不可用".to_string())?
        .clone()
        .ok_or_else(|| "请先登录".to_string())
}

#[tauri::command]
async fn desktop_auth_status() -> Result<PortalStatus, String> {
    let client = Client::builder().build().map_err(|_| "无法初始化网络客户端".to_string())?;
    load_status(&client).await
}

#[tauri::command]
async fn desktop_login(
    state: tauri::State<'_, AuthState>,
    username: String,
    password: String,
    turnstile_token: Option<String>,
) -> Result<DesktopLoginResult, String> {
    if username.trim().is_empty() || password.is_empty() {
        return Err("请输入邮箱和密码".to_string());
    }
    let client = Client::builder()
        .cookie_store(true)
        .build()
        .map_err(|_| "无法初始化安全会话".to_string())?;
    let suffix = turnstile_token
        .filter(|token| !token.is_empty())
        .map(|token| format!("?turnstile={}", url::form_urlencoded::byte_serialize(token.as_bytes()).collect::<String>()))
        .unwrap_or_default();
    let data = request_json::<Value>(
        &client,
        Method::POST,
        &format!("/api/user/login{suffix}"),
        None,
        Some(json!({ "username": username.trim(), "password": password })),
    )
    .await?
    .ok_or_else(|| "登录数据为空".to_string())?;

    if data.get("require_2fa").and_then(Value::as_bool).unwrap_or(false) {
        save_session(&state, AuthSession { client, user_id: None })?;
        return Ok(DesktopLoginResult { requires_two_factor: true, snapshot: None });
    }

    let user_id = data.get("id").and_then(Value::as_i64).ok_or_else(|| "登录响应缺少用户编号".to_string())?;
    let snapshot = build_snapshot(&client, user_id).await?;
    save_session(&state, AuthSession { client, user_id: Some(user_id) })?;
    Ok(DesktopLoginResult { requires_two_factor: false, snapshot: Some(snapshot) })
}

#[tauri::command]
async fn desktop_verify_two_factor(
    state: tauri::State<'_, AuthState>,
    code: String,
) -> Result<DashboardSnapshot, String> {
    let session = current_session(&state)?;
    if session.user_id.is_some() {
        return Err("当前会话已经完成登录".to_string());
    }
    let data = request_json::<Value>(
        &session.client,
        Method::POST,
        "/api/user/login/2fa",
        None,
        Some(json!({ "code": code.trim() })),
    )
    .await?
    .ok_or_else(|| "验证响应为空".to_string())?;
    let user_id = data.get("id").and_then(Value::as_i64).ok_or_else(|| "验证响应缺少用户编号".to_string())?;
    let snapshot = build_snapshot(&session.client, user_id).await?;
    save_session(&state, AuthSession { client: session.client, user_id: Some(user_id) })?;
    Ok(snapshot)
}

#[tauri::command]
async fn desktop_sync(state: tauri::State<'_, AuthState>) -> Result<DashboardSnapshot, String> {
    let session = current_session(&state)?;
    let user_id = session.user_id.ok_or_else(|| "请先完成二次验证".to_string())?;
    build_snapshot(&session.client, user_id).await
}

#[tauri::command]
async fn desktop_logout(state: tauri::State<'_, AuthState>) -> Result<(), String> {
    let session = current_session(&state).ok();
    if let Some(value) = session {
        let _ = request_json::<Value>(&value.client, Method::GET, "/api/user/logout", None, None).await;
    }
    let mut guard = state.session.lock().map_err(|_| "登录状态不可用".to_string())?;
    *guard = None;
    Ok(())
}

#[tauri::command]
async fn apply_tool_config(
    state: tauri::State<'_, AuthState>,
    tool_id: String,
) -> Result<ConfigApplyResult, String> {
    let session = current_session(&state)?;
    let user_id = session.user_id.ok_or_else(|| "请先完成登录".to_string())?;
    let api_key = ensure_api_key(&session.client, user_id).await?;
    tool_config::apply_tool(&tool_id, &api_key)
}

#[tauri::command]
fn restore_tool_config(tool_id: String) -> Result<RestoreResult, String> {
    tool_config::restore_tool(&tool_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AuthState::default())
        .invoke_handler(tauri::generate_handler![
            detect_tools,
            open_official_url,
            desktop_auth_status,
            desktop_login,
            desktop_verify_two_factor,
            desktop_sync,
            desktop_logout,
            apply_tool_config,
            restore_tool_config
        ])
        .run(tauri::generate_context!())
        .expect("failed to run WBoke desktop");
}

#[cfg(test)]
mod tests {
    use super::{active_desktop_token_id, mask_key, PortalToken, DESKTOP_TOKEN_NAME};

    #[test]
    fn selects_only_the_dedicated_desktop_token() {
        let tokens = vec![
            PortalToken { id: 1, status: 1, name: "personal".to_string() },
            PortalToken { id: 2, status: 1, name: DESKTOP_TOKEN_NAME.to_string() },
        ];
        assert_eq!(active_desktop_token_id(&tokens).expect("valid tokens"), Some(2));
    }

    #[test]
    fn rejects_duplicate_dedicated_desktop_tokens() {
        let tokens = vec![
            PortalToken { id: 1, status: 1, name: DESKTOP_TOKEN_NAME.to_string() },
            PortalToken { id: 2, status: 1, name: DESKTOP_TOKEN_NAME.to_string() },
        ];
        assert!(active_desktop_token_id(&tokens).is_err());
    }

    #[test]
    fn ignores_disabled_dedicated_desktop_tokens() {
        let tokens = vec![PortalToken { id: 1, status: 0, name: DESKTOP_TOKEN_NAME.to_string() }];
        assert_eq!(active_desktop_token_id(&tokens).expect("valid tokens"), None);
    }

    #[test]
    fn masks_api_key_for_display() {
        assert_eq!(mask_key("sk-1234567890abcd"), "sk-1**********abcd");
    }
}
