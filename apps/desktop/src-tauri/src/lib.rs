use reqwest::{Client, Method, Response};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

const PORTAL_ORIGIN: &str = "https://www.wboke.com";
const API_BASE_URL: &str = "https://api.wboke.com/v1";

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
}

#[derive(Debug, Deserialize)]
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
    api_key: String,
    base_url: String,
    group_multiplier: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DashboardSnapshot {
    account: Account,
    models: Vec<Value>,
    usage: Vec<Value>,
    synced_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopLoginResult {
    requires_two_factor: bool,
    snapshot: Option<DashboardSnapshot>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ConfigApplyResult {
    tool_id: String,
    written_files: Vec<String>,
    backup_files: Vec<String>,
}

fn command_exists(command: &str) -> bool {
    #[cfg(target_os = "windows")]
    let result = Command::new("where.exe").arg(command).output();

    #[cfg(not(target_os = "windows"))]
    let result = Command::new("which").arg(command).output();

    result.map(|output| output.status.success()).unwrap_or(false)
}

#[tauri::command]
fn detect_tools() -> HashMap<&'static str, bool> {
    HashMap::from([
        ("codex-cli", command_exists("codex")),
        ("claude-code", command_exists("claude")),
        ("gemini-cli", command_exists("gemini")),
    ])
}

#[tauri::command]
fn open_official_url(url: String) -> Result<(), String> {
    let parsed = url::Url::parse(&url).map_err(|_| "无效地址".to_string())?;
    let host = parsed.host_str().ok_or_else(|| "地址缺少域名".to_string())?;
    let allowed_host = host == "wboke.com" || host.ends_with(".wboke.com");
    if parsed.scheme() != "https" || !allowed_host {
        return Err("仅允许打开 WBoke 官方 HTTPS 地址".to_string());
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
    let token_id = match tokens.iter().find(|token| token.status == 1) {
        Some(token) => token.id,
        None => {
            let _ = request_json::<Value>(
                client,
                Method::POST,
                "/api/token/",
                Some(user_id),
                Some(json!({
                    "name": "WBoke Desktop",
                    "expired_time": -1,
                    "unlimited_quota": true,
                    "model_limits_enabled": false
                })),
            )
            .await?;
            tokens = load_tokens(client, user_id).await?;
            tokens
                .iter()
                .find(|token| token.status == 1)
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
            api_key,
            base_url: API_BASE_URL.to_string(),
            group_multiplier: 1.0,
        },
        models: Vec::new(),
        usage: Vec::new(),
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

fn user_home() -> Result<PathBuf, String> {
    std::env::var_os("USERPROFILE")
        .or_else(|| std::env::var_os("HOME"))
        .map(PathBuf::from)
        .ok_or_else(|| "无法确定用户目录".to_string())
}

fn timestamp() -> Result<u64, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_secs())
        .map_err(|_| "系统时间无效".to_string())
}

fn write_with_backup(path: &Path, content: &str) -> Result<Option<PathBuf>, String> {
    let parent = path.parent().ok_or_else(|| "配置路径无效".to_string())?;
    fs::create_dir_all(parent).map_err(|error| format!("无法创建配置目录: {error}"))?;
    let backup = if path.exists() {
        let file_name = path.file_name().and_then(|value| value.to_str()).ok_or_else(|| "配置文件名无效".to_string())?;
        let backup_path = parent.join(format!("{file_name}.wboke-backup-{}", timestamp()?));
        fs::copy(path, &backup_path).map_err(|error| format!("无法备份原配置: {error}"))?;
        Some(backup_path)
    } else {
        None
    };
    fs::write(path, content).map_err(|error| format!("无法应用配置: {error}"))?;
    Ok(backup)
}

fn read_json_object(path: &Path) -> Result<serde_json::Map<String, Value>, String> {
    if !path.exists() {
        return Ok(serde_json::Map::new());
    }
    let text = fs::read_to_string(path).map_err(|error| format!("无法读取现有配置: {error}"))?;
    serde_json::from_str::<Value>(&text)
        .map_err(|_| "现有配置不是有效 JSON，请先修复后重试".to_string())?
        .as_object()
        .cloned()
        .ok_or_else(|| "现有配置必须是 JSON 对象".to_string())
}

fn upsert_codex_provider(existing: &str) -> String {
    let mut kept = Vec::new();
    let mut skipping_wboke = false;
    for line in existing.lines() {
        let trimmed = line.trim();
        if trimmed == "[model_providers.wboke]" {
            skipping_wboke = true;
            continue;
        }
        if skipping_wboke && trimmed.starts_with('[') {
            skipping_wboke = false;
        }
        if skipping_wboke || trimmed.starts_with("model_provider =") {
            continue;
        }
        kept.push(line);
    }
    let remainder = kept.join("\n").trim().to_string();
    format!(
        "model_provider = \"wboke\"\n{}{}\n\n[model_providers.wboke]\nname = \"WBoke API\"\nbase_url = \"{}\"\nwire_api = \"responses\"\nrequires_openai_auth = true\n",
        if remainder.is_empty() { "" } else { "\n" },
        remainder,
        API_BASE_URL
    )
}

fn apply_codex_config(api_key: &str) -> Result<ConfigApplyResult, String> {
    let root = user_home()?.join(".codex");
    let config_path = root.join("config.toml");
    let auth_path = root.join("auth.json");
    let existing = if config_path.exists() {
        fs::read_to_string(&config_path).map_err(|error| format!("无法读取 Codex 配置: {error}"))?
    } else {
        String::new()
    };
    let mut backups = Vec::new();
    if let Some(path) = write_with_backup(&config_path, &upsert_codex_provider(&existing))? {
        backups.push(path.display().to_string());
    }
    let mut auth = read_json_object(&auth_path)?;
    auth.insert("OPENAI_API_KEY".to_string(), Value::String(api_key.to_string()));
    let auth_text = serde_json::to_string_pretty(&auth).map_err(|_| "无法生成 Codex 登录配置".to_string())?;
    if let Some(path) = write_with_backup(&auth_path, &format!("{auth_text}\n"))? {
        backups.push(path.display().to_string());
    }
    Ok(ConfigApplyResult {
        tool_id: "codex-cli".to_string(),
        written_files: vec![config_path.display().to_string(), auth_path.display().to_string()],
        backup_files: backups,
    })
}

fn apply_claude_config(api_key: &str) -> Result<ConfigApplyResult, String> {
    let path = user_home()?.join(".claude").join("settings.json");
    let mut root = read_json_object(&path)?;
    let env = root.entry("env".to_string()).or_insert_with(|| json!({}));
    let env = env.as_object_mut().ok_or_else(|| "Claude 配置中的 env 必须是对象".to_string())?;
    env.insert("ANTHROPIC_AUTH_TOKEN".to_string(), Value::String(api_key.to_string()));
    env.insert("ANTHROPIC_BASE_URL".to_string(), Value::String("https://api.wboke.com".to_string()));
    let text = serde_json::to_string_pretty(&root).map_err(|_| "无法生成 Claude 配置".to_string())?;
    let backup = write_with_backup(&path, &format!("{text}\n"))?;
    Ok(ConfigApplyResult {
        tool_id: "claude-code".to_string(),
        written_files: vec![path.display().to_string()],
        backup_files: backup.into_iter().map(|value| value.display().to_string()).collect(),
    })
}

fn upsert_env(existing: &str, values: &[(&str, &str)]) -> String {
    let keys: Vec<&str> = values.iter().map(|(key, _)| *key).collect();
    let mut lines: Vec<String> = existing
        .lines()
        .filter(|line| !keys.iter().any(|key| line.trim_start().starts_with(&format!("{key}="))))
        .map(str::to_string)
        .collect();
    if !lines.is_empty() && !lines.last().is_some_and(|line| line.is_empty()) {
        lines.push(String::new());
    }
    lines.extend(values.iter().map(|(key, value)| format!("{key}={value}")));
    format!("{}\n", lines.join("\n"))
}

fn apply_gemini_config(api_key: &str) -> Result<ConfigApplyResult, String> {
    let path = user_home()?.join(".gemini").join(".env");
    let existing = if path.exists() {
        fs::read_to_string(&path).map_err(|error| format!("无法读取 Gemini 配置: {error}"))?
    } else {
        String::new()
    };
    let content = upsert_env(
        &existing,
        &[
            ("GEMINI_API_KEY", api_key),
            ("GOOGLE_GEMINI_BASE_URL", API_BASE_URL),
        ],
    );
    let backup = write_with_backup(&path, &content)?;
    Ok(ConfigApplyResult {
        tool_id: "gemini-cli".to_string(),
        written_files: vec![path.display().to_string()],
        backup_files: backup.into_iter().map(|value| value.display().to_string()).collect(),
    })
}

#[tauri::command]
async fn apply_tool_config(
    state: tauri::State<'_, AuthState>,
    tool_id: String,
) -> Result<ConfigApplyResult, String> {
    let session = current_session(&state)?;
    let user_id = session.user_id.ok_or_else(|| "请先完成登录".to_string())?;
    let api_key = ensure_api_key(&session.client, user_id).await?;
    match tool_id.as_str() {
        "codex-cli" => apply_codex_config(&api_key),
        "claude-code" => apply_claude_config(&api_key),
        "gemini-cli" => apply_gemini_config(&api_key),
        _ => Err("不支持的配置目标".to_string()),
    }
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
            apply_tool_config
        ])
        .run(tauri::generate_context!())
        .expect("failed to run WBoke desktop");
}

#[cfg(test)]
mod tests {
    use super::{mask_key, upsert_codex_provider, upsert_env};

    #[test]
    fn replaces_existing_codex_provider_without_touching_other_sections() {
        let input = r#"model_provider = "old"
model = "gpt-test"

[model_providers.wboke]
name = "Old WBoke"
base_url = "https://old.example/v1"

[mcp_servers.demo]
command = "demo"
"#;
        let result = upsert_codex_provider(input);
        assert!(result.starts_with("model_provider = \"wboke\""));
        assert_eq!(result.matches("[model_providers.wboke]").count(), 1);
        assert!(result.contains("[mcp_servers.demo]"));
        assert!(result.contains("model = \"gpt-test\""));
        assert!(!result.contains("old.example"));
    }

    #[test]
    fn replaces_only_managed_environment_keys() {
        let result = upsert_env(
            "OTHER=value\nGEMINI_API_KEY=old\n",
            &[("GEMINI_API_KEY", "new"), ("GOOGLE_GEMINI_BASE_URL", "https://api.wboke.com/v1")],
        );
        assert!(result.contains("OTHER=value"));
        assert!(!result.contains("GEMINI_API_KEY=old"));
        assert!(result.contains("GEMINI_API_KEY=new"));
    }

    #[test]
    fn masks_api_key_for_display() {
        assert_eq!(mask_key("sk-1234567890abcd"), "sk-1**********abcd");
    }
}
