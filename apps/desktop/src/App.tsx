import { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleUserRound,
  Coins,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldCheck,
  WalletCards,
  Wrench,
  X,
} from 'lucide-react';
import type { DashboardSnapshot, ToolState, ViewId } from './types';
import { newApiClient } from './lib/api';
import { appConfig } from './lib/config';
import { applyToolConfig, detectTools, openOfficialUrl, openRecharge, restoreToolConfig } from './lib/platform';
import { StatusBadge } from './components/StatusBadge';
import './styles.css';

const navItems: Array<{ id: ViewId; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: '概览', icon: LayoutDashboard },
  { id: 'tools', label: '开发工具', icon: Wrench },
  { id: 'account', label: '账户', icon: CircleUserRound },
];

function formatCny(value: number): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value);
}

function LoginScreen({ onLogin, onVerifyTwoFactor }: { onLogin: (email: string, password: string) => Promise<boolean>; onVerifyTwoFactor: (code: string) => Promise<void> }) {
  const [email, setEmail] = useState(appConfig.demoMode ? 'member@wboke.com' : '');
  const [password, setPassword] = useState(appConfig.demoMode ? 'wboke-demo' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const submit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      if (requiresTwoFactor) {
        await onVerifyTwoFactor(twoFactorCode.trim());
      } else if (await onLogin(email.trim(), password)) {
        setRequiresTwoFactor(true);
        setPassword('');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '登录失败');
    } finally {
      setPending(false);
    }
  }, [email, onLogin, onVerifyTwoFactor, password, requiresTwoFactor, twoFactorCode]);

  const openRegistration = useCallback(() => void openOfficialUrl(`${appConfig.portalOrigin}/sign-up`), []);
  const openReset = useCallback(() => void openOfficialUrl(`${appConfig.portalOrigin}/reset`), []);

  return (
    <main className="login-shell">
      <section className="login-brand" aria-label="六脉神剑API">
        <div className="brand-lockup brand-lockup--large"><span>六</span><strong>六脉神剑API</strong></div>
        <div className="login-brand__copy">
          <p className="eyebrow">Windows 客户端</p>
          <h1>登录并配置开发工具</h1>
          <p>账户与额度由正式网关统一管理。</p>
        </div>
        <div className="login-brand__meta"><ShieldCheck size={18} /> HTTPS · www.wboke.com</div>
      </section>
      <section className="login-panel">
        <form className="login-form" onSubmit={submit}>
          <div>
            <p className="eyebrow">{requiresTwoFactor ? '二次验证' : '账户登录'}</p>
            <h2>{requiresTwoFactor ? '输入身份验证器代码' : '进入客户端'}</h2>
          </div>
          {appConfig.demoMode && <div className="demo-notice">开发演示模式</div>}
          {requiresTwoFactor ? (
            <label>
              <span>验证码或备用码</span>
              <input autoFocus autoComplete="one-time-code" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} required />
            </label>
          ) : (
            <>
              <label>
                <span>个人邮箱</span>
                <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </label>
              <label>
                <span>密码</span>
                <span className="password-field">
                  <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={64} required />
                  <button type="button" className="password-toggle" title={showPassword ? '隐藏密码' : '显示密码'} aria-label={showPassword ? '隐藏密码' : '显示密码'} onClick={() => setShowPassword((value) => !value)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>
            </>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button--primary button--full" type="submit" disabled={pending}>
            {pending ? <LoaderCircle className="spin" size={18} /> : <ArrowUpRight size={18} />}
            {pending ? '正在验证' : requiresTwoFactor ? '完成验证' : '登录'}
          </button>
          {!requiresTwoFactor && (
            <div className="login-links">
              <button className="text-link" type="button" onClick={openReset}>忘记密码 <ExternalLink size={14} /></button>
              <button className="text-link" type="button" onClick={openRegistration}>注册账户 <ExternalLink size={14} /></button>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }, [value]);
  return <button className="icon-button" type="button" title={label} aria-label={label} onClick={() => void copy()}>{copied ? <Check size={17} /> : <Copy size={17} />}</button>;
}

function Overview({ snapshot, syncing, onSync }: { snapshot: DashboardSnapshot; syncing: boolean; onSync: () => void }) {
  const openKeys = useCallback(() => void openOfficialUrl(`${appConfig.portalOrigin}/keys`), []);
  const openWallet = useCallback(() => void openOfficialUrl(`${appConfig.portalOrigin}/wallet`), []);
  const openUsage = useCallback(() => void openOfficialUrl(`${appConfig.portalOrigin}/usage-logs`), []);
  return (
    <div className="page-stack">
      <header className="page-heading">
        <div><p className="eyebrow">账户概览</p><h1>{snapshot.account.displayName}</h1></div>
        <div className="heading-actions">
          <button className="button button--secondary" type="button" onClick={onSync} disabled={syncing}><RefreshCw className={syncing ? 'spin' : ''} size={17} />同步</button>
          <button className="button button--primary" type="button" onClick={() => void openRecharge()}><Coins size={17} />购买兑换码</button>
        </div>
      </header>

      <section className="balance-band">
        <div className="balance-main"><span>可用余额</span><strong>{formatCny(snapshot.account.balanceCny)}</strong><small>最近同步：{snapshot.syncedAt}</small></div>
        <div className="metric"><span>用户组</span><strong>{snapshot.account.group}</strong><small>{snapshot.account.email}</small></div>
        <div className="metric"><span>专用 Key</span><strong>已就绪</strong><small>{snapshot.account.apiKeyMasked}</small></div>
      </section>

      <div className="overview-grid">
        <section className="surface endpoint-panel">
          <div className="section-title"><div><p className="eyebrow">连接信息</p><h2>OpenAI 兼容端点</h2></div><StatusBadge tone="success">服务在线</StatusBadge></div>
          <dl className="connection-list">
            <div><dt>Base URL</dt><dd><code>{snapshot.account.baseUrl}</code><CopyButton value={snapshot.account.baseUrl} label="复制 Base URL" /></dd></div>
            <div><dt>API Key</dt><dd><code>{snapshot.account.apiKeyMasked}</code></dd></div>
          </dl>
          <button className="panel-link" type="button" onClick={openKeys}>管理 API Key <ChevronRight size={16} /></button>
        </section>

        <section className="surface quick-actions">
          <div className="section-title"><div><p className="eyebrow">网站账户</p><h2>额度与记录</h2></div><WalletCards size={19} /></div>
          <button className="settings-link" type="button" onClick={openWallet}><WalletCards size={19} /><span><strong>钱包与兑换</strong><small>查看余额并输入兑换码</small></span><ChevronRight size={17} /></button>
          <button className="settings-link" type="button" onClick={openUsage}><KeyRound size={19} /><span><strong>使用日志</strong><small>核对模型、Tokens 与扣费</small></span><ChevronRight size={17} /></button>
        </section>
      </div>
    </div>
  );
}

function ConfigDialog({ tool, account, onClose, onChanged }: { tool: ToolState; account: DashboardSnapshot['account']; onClose: () => void; onChanged: () => void }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const rows = tool.id === 'claude-code'
    ? [['ANTHROPIC_BASE_URL', appConfig.portalOrigin], ['ANTHROPIC_AUTH_TOKEN', account.apiKeyMasked]]
    : tool.id === 'gemini-cli'
      ? [['GOOGLE_GEMINI_BASE_URL', appConfig.portalOrigin], ['GEMINI_API_KEY', account.apiKeyMasked]]
      : tool.id === 'cc-switch'
        ? [['供应商', '六脉神剑API'], ['目标', 'Codex / Claude / Gemini']]
        : [['OpenAI Base URL', account.baseUrl], ['OPENAI_API_KEY', account.apiKeyMasked]];

  const apply = useCallback(async () => {
    setPending(true);
    setResult('');
    setError('');
    try {
      const value = await applyToolConfig(tool.id);
      setResult(value.message);
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '配置失败');
    } finally {
      setPending(false);
    }
  }, [onChanged, tool.id]);

  const restore = useCallback(async () => {
    if (!window.confirm(`恢复 ${tool.name} 上一次配置？当前配置会被替换。`)) return;
    setPending(true);
    setResult('');
    setError('');
    try {
      const files = await restoreToolConfig(tool.id);
      setResult(`已恢复 ${files.length} 个配置文件。`);
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '恢复失败');
    } finally {
      setPending(false);
    }
  }, [onChanged, tool.id, tool.name]);

  const supported = tool.adapterStatus === 'available';
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="config-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p className="eyebrow">配置预览</p><h2 id="config-title">{tool.name}</h2></div><button className="icon-button" type="button" aria-label="关闭" title="关闭" onClick={onClose}><X size={19} /></button></header>
        <div className="dialog-status">
          <StatusBadge tone={!tool.installed || !supported ? 'warning' : 'success'}>{!tool.installed ? '未检测到' : supported ? '可配置' : '版本不兼容'}</StatusBadge>
          <span>{tool.configPath}</span>
        </div>
        <div className="config-preview">{rows.map(([key, item]) => <div key={key}><span>{key}</span><code>{item}</code></div>)}</div>
        <p className="dialog-note">应用前自动备份；完整 Key 只在 Rust 配置层使用，不进入界面状态。</p>
        {result && <p className="form-success" role="status">{result}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <footer>
          <button className="button button--secondary" type="button" onClick={onClose}>关闭</button>
          {tool.restoreAvailable && <button className="button button--secondary" type="button" disabled={pending} onClick={() => void restore()}><RotateCcw size={17} />恢复上次配置</button>}
          <button className="button button--primary" type="button" disabled={pending || !tool.installed || !supported} onClick={() => void apply()}>{pending ? <LoaderCircle className="spin" size={17} /> : <Settings2 size={17} />}{pending ? '正在处理' : '备份并应用'}</button>
        </footer>
      </section>
    </div>
  );
}

function ToolsView({ tools, snapshot, onRefresh }: { tools: ToolState[]; snapshot: DashboardSnapshot; onRefresh: () => void }) {
  const [selected, setSelected] = useState<ToolState | null>(null);
  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">本机接入</p><h1>开发工具</h1></div><button className="button button--secondary" type="button" onClick={onRefresh}><RefreshCw size={17} />重新检测</button></header>
      <section className="tool-list">
        {tools.map((tool) => (
          <article className="tool-row" key={tool.id}>
            <div className="tool-icon"><Wrench size={21} /></div>
            <div className="tool-copy"><h2>{tool.name}</h2><p>{tool.version ?? tool.description}</p></div>
            <div className="tool-path"><span>配置位置</span><code>{tool.configPath}</code></div>
            <StatusBadge tone={tool.installed && tool.adapterStatus === 'available' ? 'success' : 'warning'}>{!tool.installed ? '未安装' : tool.adapterStatus === 'available' ? '已支持' : '版本不兼容'}</StatusBadge>
            <button className="button button--secondary" type="button" onClick={() => setSelected(tool)}>查看配置 <ChevronRight size={16} /></button>
          </article>
        ))}
      </section>
      {selected && <ConfigDialog tool={selected} account={snapshot.account} onClose={() => setSelected(null)} onChanged={onRefresh} />}
    </div>
  );
}

function AccountView({ snapshot, onLogout }: { snapshot: DashboardSnapshot; onLogout: () => void }) {
  const items = [
    { icon: WalletCards, title: '购买兑换码', detail: '公司指定链小铺', action: () => void openRecharge() },
    { icon: Coins, title: '钱包与兑换', detail: '充值、兑换和余额', action: () => void openOfficialUrl(`${appConfig.portalOrigin}/wallet`) },
    { icon: KeyRound, title: 'API Key 管理', detail: '创建、撤销与限额', action: () => void openOfficialUrl(`${appConfig.portalOrigin}/keys`) },
  ];
  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">账户设置</p><h1>{snapshot.account.email}</h1></div><button className="button button--danger" type="button" onClick={onLogout}><LogOut size={17} />退出登录</button></header>
      <section className="account-summary"><div><span>用户组</span><strong>{snapshot.account.group}</strong></div><div><span>API 地址</span><strong>{snapshot.account.baseUrl}</strong></div><div><span>账户状态</span><strong className="success-text">正常</strong></div></section>
      <section className="settings-list">{items.map(({ icon: Icon, title, detail, action }) => <button type="button" key={title} onClick={action}><Icon size={20} /><span><strong>{title}</strong><small>{detail}</small></span><ChevronRight size={18} /></button>)}</section>
    </div>
  );
}

function AppShell({ snapshot, onLogout, onSync, syncing }: { snapshot: DashboardSnapshot; onLogout: () => void; onSync: () => void; syncing: boolean }) {
  const [view, setView] = useState<ViewId>('overview');
  const [tools, setTools] = useState<ToolState[]>([]);
  const [toolError, setToolError] = useState('');
  const refreshTools = useCallback(() => {
    setToolError('');
    void detectTools()
      .then(setTools)
      .catch(() => setToolError('本机工具检测失败，请重试或重启客户端。'));
  }, []);
  useEffect(refreshTools, [refreshTools]);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup"><span>六</span><strong>六脉神剑API</strong></div>
        <nav>{navItems.map(({ id, label, icon: Icon }) => <button className={view === id ? 'active' : ''} type="button" key={id} aria-label={label} title={label} onClick={() => setView(id)}><Icon size={19} /><span>{label}</span></button>)}</nav>
        <div className="sidebar-footer"><div className="connection-dot" /><div><strong>正式网关</strong><span>www.wboke.com</span></div></div>
      </aside>
      <main className="content">
        {view === 'overview' && <Overview snapshot={snapshot} syncing={syncing} onSync={onSync} />}
        {view === 'tools' && <>{toolError && <p className="form-error" role="alert">{toolError}</p>}<ToolsView tools={tools} snapshot={snapshot} onRefresh={refreshTools} /></>}
        {view === 'account' && <AccountView snapshot={snapshot} onLogout={onLogout} />}
      </main>
    </div>
  );
}

export default function App() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [syncing, setSyncing] = useState(false);
  const login = useCallback(async (email: string, password: string) => {
    const result = await newApiClient.login(email, password);
    if (result.snapshot) setSnapshot(result.snapshot);
    return result.requiresTwoFactor;
  }, []);
  const verifyTwoFactor = useCallback(async (code: string) => setSnapshot(await newApiClient.verifyTwoFactor(code)), []);
  const sync = useCallback(async () => {
    setSyncing(true);
    try { setSnapshot(await newApiClient.sync()); } finally { setSyncing(false); }
  }, []);
  const logout = useCallback(async () => {
    await newApiClient.logout();
    setSnapshot(null);
  }, []);
  if (!snapshot) return <LoginScreen onLogin={login} onVerifyTwoFactor={verifyTwoFactor} />;
  return <AppShell snapshot={snapshot} syncing={syncing} onSync={() => void sync()} onLogout={() => void logout()} />;
}
