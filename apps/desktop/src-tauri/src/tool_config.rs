use rusqlite::{backup::Backup, params, Connection, OpenFlags};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use toml_edit::{value, DocumentMut};

pub const DEFAULT_MODEL: &str = "gpt-5.5";
pub const OPENAI_BASE_URL: &str = "https://www.wboke.com/v1";
pub const COMPATIBLE_BASE_URL: &str = "https://www.wboke.com";
const CC_SWITCH_SCHEMA_VERSION: i32 = 13;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolDetection {
    pub id: String,
    pub installed: bool,
    pub version: Option<String>,
    pub config_path: String,
    pub adapter_status: String,
    pub restore_available: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigApplyResult {
    pub tool_id: String,
    pub written_files: Vec<String>,
    pub backup_files: Vec<String>,
    pub restore_available: bool,
    pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreResult {
    pub tool_id: String,
    pub restored_files: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct BackupManifest {
    tool_id: String,
    created_at: u64,
    entries: Vec<BackupEntry>,
}

#[derive(Debug, Serialize, Deserialize)]
struct BackupEntry {
    target: String,
    backup: Option<String>,
    kind: BackupKind,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
enum BackupKind {
    File,
    Sqlite,
}

struct FileMutation {
    path: PathBuf,
    content: String,
}

fn timestamp() -> Result<u64, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_millis() as u64)
        .map_err(|_| "系统时间无效".to_string())
}

pub fn user_home() -> Result<PathBuf, String> {
    std::env::var_os("USERPROFILE")
        .or_else(|| std::env::var_os("HOME"))
        .map(PathBuf::from)
        .ok_or_else(|| "无法确定用户目录".to_string())
}

fn backup_root(tool_id: &str) -> Result<PathBuf, String> {
    Ok(user_home()?.join(".liumai-desktop").join("backups").join(tool_id))
}

fn latest_manifest_path(tool_id: &str) -> Result<PathBuf, String> {
    Ok(backup_root(tool_id)?.join("latest.json"))
}

pub fn restore_available(tool_id: &str) -> bool {
    latest_manifest_path(tool_id).is_ok_and(|path| path.exists())
}

fn save_manifest(manifest: &BackupManifest) -> Result<(), String> {
    let path = latest_manifest_path(&manifest.tool_id)?;
    let parent = path.parent().ok_or_else(|| "备份清单路径无效".to_string())?;
    fs::create_dir_all(parent).map_err(|error| format!("无法创建备份目录: {error}"))?;
    let text = serde_json::to_string_pretty(manifest).map_err(|error| format!("无法生成备份清单: {error}"))?;
    fs::write(path, format!("{text}\n")).map_err(|error| format!("无法保存备份清单: {error}"))
}

fn read_json_object(path: &Path) -> Result<serde_json::Map<String, Value>, String> {
    if !path.exists() {
        return Ok(serde_json::Map::new());
    }
    let text = fs::read_to_string(path).map_err(|error| format!("无法读取 {}: {error}", path.display()))?;
    serde_json::from_str::<Value>(&text)
        .map_err(|error| format!("{} 不是有效 JSON: {error}", path.display()))?
        .as_object()
        .cloned()
        .ok_or_else(|| format!("{} 必须是 JSON 对象", path.display()))
}

fn codex_content(existing: &str) -> Result<String, String> {
    let mut document = if existing.trim().is_empty() {
        DocumentMut::new()
    } else {
        existing.parse::<DocumentMut>().map_err(|error| format!("现有 Codex 配置不是有效 TOML: {error}"))?
    };
    document["model_provider"] = value("liumai");
    document["model"] = value(DEFAULT_MODEL);
    document["model_providers"]["liumai"]["name"] = value("六脉神剑API");
    document["model_providers"]["liumai"]["base_url"] = value(OPENAI_BASE_URL);
    document["model_providers"]["liumai"]["wire_api"] = value("responses");
    document["model_providers"]["liumai"]["requires_openai_auth"] = value(true);
    if let Some(providers) = document.get_mut("model_providers").and_then(|item| item.as_table_mut()) {
        providers.remove("wboke");
    }
    Ok(format!("{}\n", document.to_string().trim_end()))
}

fn codex_mutations(api_key: &str) -> Result<Vec<FileMutation>, String> {
    let root = user_home()?.join(".codex");
    let config_path = root.join("config.toml");
    let auth_path = root.join("auth.json");
    let existing = if config_path.exists() {
        fs::read_to_string(&config_path).map_err(|error| format!("无法读取 Codex 配置: {error}"))?
    } else {
        String::new()
    };
    let mut auth = read_json_object(&auth_path)?;
    auth.insert("OPENAI_API_KEY".to_string(), Value::String(api_key.to_string()));
    let auth_text = serde_json::to_string_pretty(&auth).map_err(|error| format!("无法生成 Codex 登录配置: {error}"))?;
    Ok(vec![
        FileMutation { path: config_path, content: codex_content(&existing)? },
        FileMutation { path: auth_path, content: format!("{auth_text}\n") },
    ])
}

fn claude_mutations(api_key: &str) -> Result<Vec<FileMutation>, String> {
    let path = user_home()?.join(".claude").join("settings.json");
    let mut root = read_json_object(&path)?;
    let env = root.entry("env".to_string()).or_insert_with(|| json!({}));
    let env = env.as_object_mut().ok_or_else(|| "Claude 配置中的 env 必须是对象".to_string())?;
    for (key, value) in [
        ("ANTHROPIC_AUTH_TOKEN", api_key),
        ("ANTHROPIC_BASE_URL", COMPATIBLE_BASE_URL),
        ("ANTHROPIC_MODEL", DEFAULT_MODEL),
        ("ANTHROPIC_DEFAULT_HAIKU_MODEL", DEFAULT_MODEL),
        ("ANTHROPIC_DEFAULT_SONNET_MODEL", DEFAULT_MODEL),
        ("ANTHROPIC_DEFAULT_OPUS_MODEL", DEFAULT_MODEL),
    ] {
        env.insert(key.to_string(), Value::String(value.to_string()));
    }
    let text = serde_json::to_string_pretty(&root).map_err(|error| format!("无法生成 Claude 配置: {error}"))?;
    Ok(vec![FileMutation { path, content: format!("{text}\n") }])
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

fn gemini_mutations(api_key: &str) -> Result<Vec<FileMutation>, String> {
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
            ("GOOGLE_GEMINI_BASE_URL", COMPATIBLE_BASE_URL),
            ("GEMINI_MODEL", DEFAULT_MODEL),
        ],
    );
    Ok(vec![FileMutation { path, content }])
}

fn restore_file_entry(entry: &BackupEntry) -> Result<(), String> {
    let target = PathBuf::from(&entry.target);
    if let Some(backup) = &entry.backup {
        let parent = target.parent().ok_or_else(|| "恢复路径无效".to_string())?;
        fs::create_dir_all(parent).map_err(|error| format!("无法创建恢复目录: {error}"))?;
        fs::copy(backup, &target).map_err(|error| format!("无法恢复 {}: {error}", target.display()))?;
    } else if target.exists() {
        fs::remove_file(&target).map_err(|error| format!("无法移除新建配置 {}: {error}", target.display()))?;
    }
    Ok(())
}

fn apply_file_transaction(tool_id: &str, mutations: Vec<FileMutation>) -> Result<ConfigApplyResult, String> {
    let created_at = timestamp()?;
    let directory = backup_root(tool_id)?.join(created_at.to_string());
    fs::create_dir_all(&directory).map_err(|error| format!("无法创建备份目录: {error}"))?;
    let mut entries = Vec::new();
    for (index, mutation) in mutations.iter().enumerate() {
        let backup = if mutation.path.exists() {
            let backup_path = directory.join(format!("{index}.bak"));
            fs::copy(&mutation.path, &backup_path).map_err(|error| format!("无法备份 {}: {error}", mutation.path.display()))?;
            Some(backup_path.display().to_string())
        } else {
            None
        };
        entries.push(BackupEntry {
            target: mutation.path.display().to_string(),
            backup,
            kind: BackupKind::File,
        });
    }

    for (index, mutation) in mutations.iter().enumerate() {
        let result = (|| {
            let parent = mutation.path.parent().ok_or_else(|| "配置路径无效".to_string())?;
            fs::create_dir_all(parent).map_err(|error| format!("无法创建配置目录: {error}"))?;
            fs::write(&mutation.path, &mutation.content).map_err(|error| format!("无法写入 {}: {error}", mutation.path.display()))?;
            let written = fs::read_to_string(&mutation.path)
                .map_err(|error| format!("无法校验 {}: {error}", mutation.path.display()))?;
            if written != mutation.content {
                return Err(format!("{} 写入后校验失败", mutation.path.display()));
            }
            Ok::<(), String>(())
        })();
        if let Err(error) = result {
            for entry in entries.iter().take(index + 1).rev() {
                let _ = restore_file_entry(entry);
            }
            return Err(format!("{error}；已回滚本次更改"));
        }
    }

    let manifest = BackupManifest { tool_id: tool_id.to_string(), created_at, entries };
    if let Err(error) = save_manifest(&manifest) {
        for entry in manifest.entries.iter().rev() {
            let _ = restore_file_entry(entry);
        }
        return Err(format!("{error}；已回滚本次更改"));
    }
    Ok(ConfigApplyResult {
        tool_id: tool_id.to_string(),
        written_files: mutations.iter().map(|mutation| mutation.path.display().to_string()).collect(),
        backup_files: manifest.entries.iter().filter_map(|entry| entry.backup.clone()).collect(),
        restore_available: true,
        message: "配置已验证、备份并应用".to_string(),
    })
}

fn sqlite_backup(source_path: &Path, destination_path: &Path) -> Result<(), String> {
    let source = Connection::open_with_flags(source_path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| format!("无法打开 CC Switch 数据库: {error}"))?;
    let mut destination = Connection::open(destination_path).map_err(|error| format!("无法创建 CC Switch 备份: {error}"))?;
    let backup = Backup::new(&source, &mut destination).map_err(|error| format!("无法初始化 CC Switch 备份: {error}"))?;
    backup
        .run_to_completion(64, Duration::from_millis(20), None)
        .map_err(|error| format!("无法完成 CC Switch 备份: {error}"))
}

fn sqlite_restore(backup_path: &Path, target_path: &Path) -> Result<(), String> {
    let source = Connection::open_with_flags(backup_path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| format!("无法打开 CC Switch 备份: {error}"))?;
    let mut destination = Connection::open(target_path).map_err(|error| format!("无法打开 CC Switch 数据库: {error}"))?;
    let backup = Backup::new(&source, &mut destination).map_err(|error| format!("无法初始化 CC Switch 恢复: {error}"))?;
    backup
        .run_to_completion(64, Duration::from_millis(20), None)
        .map_err(|error| format!("无法恢复 CC Switch 数据库: {error}"))
}

fn cc_switch_db_path() -> Result<PathBuf, String> {
    Ok(user_home()?.join(".cc-switch").join("cc-switch.db"))
}

fn cc_switch_schema_version(path: &Path) -> Result<i32, String> {
    let connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| format!("无法读取 CC Switch 数据库: {error}"))?;
    connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|error| format!("无法读取 CC Switch 数据库版本: {error}"))
}

fn upsert_cc_switch_providers(
    connection: &mut Connection,
    api_key: &str,
    created_at: u64,
) -> Result<(), String> {
    connection
        .busy_timeout(Duration::from_secs(3))
        .map_err(|error| format!("无法设置 CC Switch 数据库等待时间: {error}"))?;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("无法开始 CC Switch 事务，请关闭 CC Switch 后重试: {error}"))?;
    for app_type in ["codex", "claude", "gemini"] {
        let settings = serde_json::to_string(&cc_switch_settings(app_type, api_key)?)
            .map_err(|error| format!("无法生成 CC Switch 配置: {error}"))?;
        transaction
            .execute(
                "INSERT INTO providers (id, app_type, name, settings_config, website_url, category, created_at, notes, meta, is_current, in_failover_queue)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, '{}', 0, 0)
                 ON CONFLICT(id, app_type) DO UPDATE SET name=excluded.name, settings_config=excluded.settings_config,
                    website_url=excluded.website_url, category=excluded.category, notes=excluded.notes",
                params![
                    "liumai-api",
                    app_type,
                    "六脉神剑API",
                    settings,
                    "https://www.wboke.com",
                    "custom",
                    created_at as i64,
                    "由六脉神剑 Desktop 管理",
                ],
            )
            .map_err(|error| format!("无法写入 CC Switch {app_type} 供应商: {error}"))?;
    }
    transaction
        .commit()
        .map_err(|error| format!("无法提交 CC Switch 配置: {error}"))?;

    let managed_count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM providers WHERE id = 'liumai-api' AND app_type IN ('codex', 'claude', 'gemini')",
            [],
            |row| row.get(0),
        )
        .map_err(|error| format!("无法校验 CC Switch 配置: {error}"))?;
    if managed_count != 3 {
        return Err(format!("CC Switch 配置校验失败：应写入 3 项，实际为 {managed_count} 项"));
    }
    Ok(())
}

fn cc_switch_settings(app_type: &str, api_key: &str) -> Result<Value, String> {
    match app_type {
        "codex" => Ok(json!({
            "auth": { "OPENAI_API_KEY": api_key },
            "config": codex_content("")?,
        })),
        "claude" => Ok(json!({ "env": {
            "ANTHROPIC_AUTH_TOKEN": api_key,
            "ANTHROPIC_BASE_URL": COMPATIBLE_BASE_URL,
            "ANTHROPIC_MODEL": DEFAULT_MODEL,
            "ANTHROPIC_DEFAULT_HAIKU_MODEL": DEFAULT_MODEL,
            "ANTHROPIC_DEFAULT_SONNET_MODEL": DEFAULT_MODEL,
            "ANTHROPIC_DEFAULT_OPUS_MODEL": DEFAULT_MODEL,
        }})),
        "gemini" => Ok(json!({ "env": {
            "GEMINI_API_KEY": api_key,
            "GOOGLE_GEMINI_BASE_URL": COMPATIBLE_BASE_URL,
            "GEMINI_MODEL": DEFAULT_MODEL,
        }})),
        _ => Err("不支持的 CC Switch 应用类型".to_string()),
    }
}

fn apply_cc_switch(api_key: &str) -> Result<ConfigApplyResult, String> {
    let path = cc_switch_db_path()?;
    if !path.exists() {
        return Err("未检测到 CC Switch 数据库".to_string());
    }
    let schema_version = cc_switch_schema_version(&path)?;
    if schema_version != CC_SWITCH_SCHEMA_VERSION {
        return Err(format!(
            "CC Switch 数据库版本 {schema_version} 未经验证；当前仅支持 schema {CC_SWITCH_SCHEMA_VERSION}"
        ));
    }
    let created_at = timestamp()?;
    let directory = backup_root("cc-switch")?.join(created_at.to_string());
    fs::create_dir_all(&directory).map_err(|error| format!("无法创建 CC Switch 备份目录: {error}"))?;
    let backup_path = directory.join("cc-switch.db");
    sqlite_backup(&path, &backup_path)?;

    let mut connection = Connection::open(&path).map_err(|error| format!("无法打开 CC Switch 数据库: {error}"))?;
    if let Err(error) = upsert_cc_switch_providers(&mut connection, api_key, created_at) {
        drop(connection);
        let _ = sqlite_restore(&backup_path, &path);
        return Err(format!("{error}；已恢复 CC Switch 数据库"));
    }
    drop(connection);
    let manifest = BackupManifest {
        tool_id: "cc-switch".to_string(),
        created_at,
        entries: vec![BackupEntry {
            target: path.display().to_string(),
            backup: Some(backup_path.display().to_string()),
            kind: BackupKind::Sqlite,
        }],
    };
    if let Err(error) = save_manifest(&manifest) {
        sqlite_restore(&backup_path, &path)
            .map_err(|restore_error| format!("{error}；回滚 CC Switch 失败: {restore_error}"))?;
        return Err(format!("{error}；已恢复 CC Switch 数据库"));
    }
    Ok(ConfigApplyResult {
        tool_id: "cc-switch".to_string(),
        written_files: vec![path.display().to_string()],
        backup_files: vec![backup_path.display().to_string()],
        restore_available: true,
        message: "已向 CC Switch 添加 Codex、Claude 和 Gemini 供应商；请在 CC Switch 中切换到六脉神剑API".to_string(),
    })
}

pub fn apply_tool(tool_id: &str, api_key: &str) -> Result<ConfigApplyResult, String> {
    match tool_id {
        "codex-cli" => apply_file_transaction(tool_id, codex_mutations(api_key)?),
        "claude-code" => apply_file_transaction(tool_id, claude_mutations(api_key)?),
        "gemini-cli" => apply_file_transaction(tool_id, gemini_mutations(api_key)?),
        "cc-switch" => apply_cc_switch(api_key),
        _ => Err("不支持的配置目标".to_string()),
    }
}

pub fn restore_tool(tool_id: &str) -> Result<RestoreResult, String> {
    let manifest_path = latest_manifest_path(tool_id)?;
    let text = fs::read_to_string(&manifest_path).map_err(|_| "没有可恢复的配置备份".to_string())?;
    let manifest: BackupManifest = serde_json::from_str(&text).map_err(|error| format!("备份清单损坏: {error}"))?;
    let mut restored_files = Vec::new();
    for entry in manifest.entries.iter().rev() {
        match entry.kind {
            BackupKind::File => restore_file_entry(entry)?,
            BackupKind::Sqlite => {
                let backup = entry.backup.as_ref().ok_or_else(|| "CC Switch 备份缺失".to_string())?;
                sqlite_restore(Path::new(backup), Path::new(&entry.target))?;
            }
        }
        restored_files.push(entry.target.clone());
    }
    fs::remove_file(manifest_path).map_err(|error| format!("配置已恢复，但无法清理恢复标记: {error}"))?;
    Ok(RestoreResult { tool_id: tool_id.to_string(), restored_files })
}

fn command_version(command: &str) -> Option<String> {
    let output = std::process::Command::new(command).arg("--version").output().ok()?;
    if !output.status.success() {
        return None;
    }
    let line = String::from_utf8_lossy(&output.stdout).lines().next()?.trim().to_string();
    (!line.is_empty()).then_some(line.chars().take(120).collect())
}

pub fn detect_tools() -> Vec<ToolDetection> {
    let home = user_home().unwrap_or_default();
    let mut tools = Vec::new();
    for (id, command, path) in [
        ("codex-cli", "codex", home.join(".codex").join("config.toml")),
        ("claude-code", "claude", home.join(".claude").join("settings.json")),
        ("gemini-cli", "gemini", home.join(".gemini").join(".env")),
    ] {
        let version = command_version(command);
        tools.push(ToolDetection {
            id: id.to_string(),
            installed: version.is_some(),
            version,
            config_path: path.display().to_string(),
            adapter_status: "available".to_string(),
            restore_available: restore_available(id),
        });
    }
    let cc_path = home.join(".cc-switch").join("cc-switch.db");
    let (installed, version, status) = if cc_path.exists() {
        match cc_switch_schema_version(&cc_path) {
            Ok(schema) if schema == CC_SWITCH_SCHEMA_VERSION => (true, Some(format!("schema {schema}")), "available"),
            Ok(schema) => (true, Some(format!("schema {schema}")), "unsupported"),
            Err(_) => (true, None, "unsupported"),
        }
    } else {
        (false, None, "available")
    };
    tools.push(ToolDetection {
        id: "cc-switch".to_string(),
        installed,
        version,
        config_path: cc_path.display().to_string(),
        adapter_status: status.to_string(),
        restore_available: restore_available("cc-switch"),
    });
    tools
}

#[cfg(test)]
mod tests {
    use super::{codex_content, upsert_cc_switch_providers, upsert_env, COMPATIBLE_BASE_URL, DEFAULT_MODEL};
    use rusqlite::Connection;

    #[test]
    fn codex_update_is_structured_and_preserves_unmanaged_sections() {
        let input = r#"model_provider = "old"
model = "old-model"

[model_providers.other]
base_url = "https://other.example/v1"

[mcp_servers.demo]
command = "demo"
"#;
        let result = codex_content(input).expect("valid TOML");
        let parsed = result.parse::<toml_edit::DocumentMut>().expect("result TOML");
        assert_eq!(parsed["model_provider"].as_str(), Some("liumai"));
        assert_eq!(parsed["model"].as_str(), Some(DEFAULT_MODEL));
        assert_eq!(parsed["model_providers"]["other"]["base_url"].as_str(), Some("https://other.example/v1"));
        assert_eq!(parsed["mcp_servers"]["demo"]["command"].as_str(), Some("demo"));
    }

    #[test]
    fn environment_update_preserves_unmanaged_values() {
        let result = upsert_env(
            "OTHER=value\nGEMINI_API_KEY=old\n",
            &[("GEMINI_API_KEY", "new"), ("GOOGLE_GEMINI_BASE_URL", COMPATIBLE_BASE_URL)],
        );
        assert!(result.contains("OTHER=value"));
        assert!(!result.contains("GEMINI_API_KEY=old"));
        assert!(result.contains("GEMINI_API_KEY=new"));
    }

    #[test]
    fn codex_update_rejects_malformed_toml() {
        assert!(codex_content("model = [").is_err());
    }

    #[test]
    fn codex_update_is_idempotent() {
        let first = codex_content("").expect("first update");
        let second = codex_content(&first).expect("second update");
        assert_eq!(first, second);
    }

    #[test]
    fn cc_switch_upsert_creates_and_updates_all_managed_providers() {
        let mut connection = Connection::open_in_memory().expect("in-memory database");
        connection
            .execute_batch(
                "CREATE TABLE providers (
                    id TEXT NOT NULL,
                    app_type TEXT NOT NULL,
                    name TEXT NOT NULL,
                    settings_config TEXT NOT NULL,
                    website_url TEXT,
                    category TEXT,
                    created_at INTEGER,
                    sort_index INTEGER,
                    notes TEXT,
                    icon TEXT,
                    icon_color TEXT,
                    meta TEXT NOT NULL DEFAULT '{}',
                    is_current BOOLEAN NOT NULL DEFAULT 0,
                    in_failover_queue BOOLEAN NOT NULL DEFAULT 0,
                    PRIMARY KEY (id, app_type)
                );",
            )
            .expect("providers schema");

        upsert_cc_switch_providers(&mut connection, "sk-first", 1).expect("initial upsert");
        upsert_cc_switch_providers(&mut connection, "sk-second", 2).expect("idempotent upsert");

        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM providers WHERE id = 'liumai-api'", [], |row| row.get(0))
            .expect("provider count");
        assert_eq!(count, 3);
        let settings: String = connection
            .query_row(
                "SELECT settings_config FROM providers WHERE id = 'liumai-api' AND app_type = 'codex'",
                [],
                |row| row.get(0),
            )
            .expect("codex settings");
        assert!(settings.contains("sk-second"));
        assert!(!settings.contains("sk-first"));
    }
}
