import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleUserRound,
  Clipboard,
  Code2,
  Coins,
  Copy,
  ExternalLink,
  Gauge,
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  RefreshCw,
  ServerCog,
  Settings2,
  ShieldCheck,
  WalletCards,
  Wrench,
  X,
} from 'lucide-react';
import type { DashboardSnapshot, ModelPrice, ToolState, ViewId } from './types';
import { newApiClient } from './lib/api';
import { appConfig } from './lib/config';
import { applyToolConfig, detectTools, openOfficialUrl, openRecharge } from './lib/platform';
import { StatusBadge } from './components/StatusBadge';
import './styles.css';

const navItems: Array<{ id: ViewId; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: '概览', icon: LayoutDashboard },
  { id: 'tools', label: '开发工具', icon: Wrench },
  { id: 'models', label: '模型与价格', icon: ServerCog },
  { id: 'account', label: '账户', icon: CircleUserRound },
];

function formatCny(value: number, digits = 2): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: digits }).format(value);
}

function formatTokens(value: number): string {
  return new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function LoginScreen({ onLogin, onVerifyTwoFactor }: { onLogin: (email: string, password: string) => Promise<boolean>; onVerifyTwoFactor: (code: string) => Promise<void> }) {
  const [email, setEmail] = useState(appConfig.demoMode ? 'member@wboke.com' : '');
  const [password, setPassword] = useState(appConfig.demoMode ? 'wboke-demo' : '');
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
      } else {
        const needsCode = await onLogin(email.trim(), password);
        if (needsCode) {
          setRequiresTwoFactor(true);
          setPassword('');
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '登录失败');
    } finally {
      setPending(false);
    }
  }, [email, onLogin, onVerifyTwoFactor, password, requiresTwoFactor, twoFactorCode]);

  return (
    <main className="login-shell">
      <section className="login-brand" aria-label="WBoke API">
        <div className="brand-lockup brand-lockup--large"><span>W</span><strong>WBoke API</strong></div>
        <div className="login-brand__copy">
          <p className="eyebrow">固定企业网关</p>
          <h1>开发工具的统一 API 入口</h1>
          <p>账户、额度与模型价格由公司网关统一管理。</p>
        </div>
        <div className="login-brand__meta"><ShieldCheck size={18} /> 香港节点 · HTTPS</div>
      </section>
      <section className="login-panel">
        <form className="login-form" onSubmit={submit}>
          <div>
            <p className="eyebrow">{requiresTwoFactor ? '二次验证' : '账户登录'}</p>
            <h2>{requiresTwoFactor ? '输入身份验证器代码' : '进入控制台'}</h2>
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
                <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={20} required />
              </label>
            </>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button--primary button--full" type="submit" disabled={pending}>
            {pending ? <LoaderCircle className="spin" size={18} /> : <ArrowUpRight size={18} />}
            {pending ? '正在验证' : requiresTwoFactor ? '完成验证' : '登录'}
          </button>
          {!requiresTwoFactor && <button className="text-link" type="button" onClick={() => void openOfficialUrl(`${appConfig.portalOrigin}/sign-up`)}>注册账户（邀请码可选） <ExternalLink size={14} /></button>}
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

function Overview({ snapshot, syncing, onSync, onRecharge }: { snapshot: DashboardSnapshot; syncing: boolean; onSync: () => void; onRecharge: () => void }) {
  const availableModels = snapshot.models.filter((model) => model.status === 'available').length;
  return (
    <div className="page-stack">
      <header className="page-heading">
        <div><p className="eyebrow">账户概览</p><h1>下午好，{snapshot.account.displayName}</h1></div>
        <div className="heading-actions">
          <button className="button button--secondary" type="button" onClick={onSync} disabled={syncing}><RefreshCw className={syncing ? 'spin' : ''} size={17} />同步</button>
          <button className="button button--primary" type="button" onClick={onRecharge}><Coins size={17} />充值</button>
        </div>
      </header>

      <section className="balance-band">
        <div className="balance-main"><span>可用余额</span><strong>{formatCny(snapshot.account.balanceCny)}</strong><small>最近同步：{snapshot.syncedAt}</small></div>
        <div className="metric"><span>可用模型</span><strong>{availableModels}</strong><small>共 {snapshot.models.length} 个</small></div>
        <div className="metric"><span>当前倍率</span><strong>{snapshot.account.groupMultiplier.toFixed(2)}×</strong><small>{snapshot.account.group}</small></div>
      </section>

      <div className="overview-grid">
        <section className="surface endpoint-panel">
          <div className="section-title"><div><p className="eyebrow">连接信息</p><h2>企业 API</h2></div><StatusBadge tone="success">连接正常</StatusBadge></div>
          <dl className="connection-list">
            <div><dt>Base URL</dt><dd><code>{snapshot.account.baseUrl}</code><CopyButton value={snapshot.account.baseUrl} label="复制 Base URL" /></dd></div>
            <div><dt>API Key</dt><dd><code>{snapshot.account.apiKeyMasked}</code><CopyButton value={snapshot.account.apiKey ?? snapshot.account.apiKeyMasked} label="复制 API Key" /></dd></div>
          </dl>
          <button className="panel-link" type="button" onClick={() => void openOfficialUrl(`${appConfig.portalOrigin}/keys`)}>管理 API Key <ChevronRight size={16} /></button>
        </section>

        <section className="surface usage-panel">
          <div className="section-title"><div><p className="eyebrow">最近消费</p><h2>用量流水</h2></div><Clipboard size={19} /></div>
          <div className="usage-list">
            {snapshot.usage.map((item) => <div className="usage-row" key={item.id}><div><strong>{item.model}</strong><span>{item.time}</span></div><div><span>{formatTokens(item.tokens)} tokens</span><strong>{formatCny(item.costCny)}</strong></div></div>)}
          </div>
          <button className="panel-link" type="button" onClick={() => void openOfficialUrl(`${appConfig.portalOrigin}/usage-logs`)}>查看全部记录 <ChevronRight size={16} /></button>
        </section>
      </div>
    </div>
  );
}

function ConfigDialog({ tool, account, onClose }: { tool: ToolState; account: DashboardSnapshot['account']; onClose: () => void }) {
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState('');
  const [applyError, setApplyError] = useState('');
  const rows = tool.id === 'claude-code'
    ? [['ANTHROPIC_BASE_URL', account.baseUrl.replace(/\/v1$/, '')], ['ANTHROPIC_AUTH_TOKEN', account.apiKeyMasked]]
    : tool.id === 'gemini-cli'
      ? [['GOOGLE_GEMINI_BASE_URL', account.baseUrl], ['GEMINI_API_KEY', account.apiKeyMasked]]
      : [['OPENAI_BASE_URL', account.baseUrl], ['OPENAI_API_KEY', account.apiKeyMasked]];
  const apply = useCallback(async () => {
    setApplying(true);
    setResult('');
    setApplyError('');
    try {
      const value = await applyToolConfig(tool.id);
      setResult(`已写入 ${value.writtenFiles.length} 个配置文件，并创建 ${value.backupFiles.length} 个备份。重启 ${tool.name} 后生效。`);
    } catch (reason) {
      setApplyError(reason instanceof Error ? reason.message : '配置失败');
    } finally {
      setApplying(false);
    }
  }, [tool.id, tool.name]);
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="config-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p className="eyebrow">配置预览</p><h2 id="config-title">{tool.name}</h2></div><button className="icon-button" type="button" aria-label="关闭" title="关闭" onClick={onClose}><X size={19} /></button></header>
        <div className="dialog-status"><StatusBadge tone={tool.installed ? 'success' : 'warning'}>{tool.installed ? '已检测到' : '未检测到'}</StatusBadge><span>{tool.configPath}</span></div>
        <div className="config-preview">{rows.map(([key, value]) => <div key={key}><span>{key}</span><code>{value}</code></div>)}</div>
        <p className="dialog-note">确认后将先备份现有文件，再写入 WBoke Base URL 与当前账户的 API Key。不会修改其他供应商配置。</p>
        {result && <p className="form-success" role="status">{result}</p>}
        {applyError && <p className="form-error" role="alert">{applyError}</p>}
        <footer><button className="button button--secondary" type="button" onClick={onClose}>关闭</button><button className="button button--primary" type="button" disabled={applying || !tool.installed} onClick={() => void apply()}>{applying ? <LoaderCircle className="spin" size={17} /> : <Settings2 size={17} />}{applying ? '正在配置' : tool.installed ? '备份并应用' : '未检测到工具'}</button></footer>
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
        {tools.map((tool) => <article className="tool-row" key={tool.id}>
          <div className="tool-icon"><Code2 size={21} /></div>
          <div className="tool-copy"><h2>{tool.name}</h2><p>{tool.description}</p></div>
          <div className="tool-path"><span>配置位置</span><code>{tool.configPath}</code></div>
          <StatusBadge tone={tool.installed ? 'success' : 'warning'}>{tool.installed ? '已安装' : '未检测到'}</StatusBadge>
          <button className="button button--secondary" type="button" onClick={() => setSelected(tool)}>查看配置 <ChevronRight size={16} /></button>
        </article>)}
      </section>
      {selected && <ConfigDialog tool={selected} account={snapshot.account} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ModelStatus({ model }: { model: ModelPrice }) {
  if (model.status === 'available') return <StatusBadge tone="success">可用</StatusBadge>;
  if (model.status === 'degraded') return <StatusBadge tone="warning">拥堵</StatusBadge>;
  return <StatusBadge tone="neutral">暂停</StatusBadge>;
}

function ModelsView({ models }: { models: ModelPrice[] }) {
  const [family, setFamily] = useState('全部');
  const families = useMemo(() => ['全部', ...Array.from(new Set(models.map((model) => model.family)))], [models]);
  const visible = family === '全部' ? models : models.filter((model) => model.family === family);
  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">实时销售价格</p><h1>模型与价格</h1></div><StatusBadge tone="neutral">人民币 / 百万 tokens</StatusBadge></header>
      <div className="segmented" aria-label="模型供应商">{families.map((item) => <button className={family === item ? 'active' : ''} type="button" key={item} onClick={() => setFamily(item)}>{item}</button>)}</div>
      <section className="model-table" aria-label="模型价格表">
        <div className="model-row model-row--head"><span>模型</span><span>输入价格</span><span>输出价格</span><span>延迟</span><span>状态</span></div>
        {visible.map((model) => <div className="model-row" key={model.id}><div><strong>{model.name}</strong><small>{model.id}</small></div><code>{formatCny(model.inputCnyPerMillion)}</code><code>{formatCny(model.outputCnyPerMillion)}</code><span>{model.latencyMs} ms</span><ModelStatus model={model} /></div>)}
      </section>
    </div>
  );
}

function AccountView({ snapshot, onLogout }: { snapshot: DashboardSnapshot; onLogout: () => void }) {
  const items = [
    { icon: WalletCards, title: '充值与兑换', detail: '官方链小铺充值码', action: () => void openRecharge() },
    { icon: KeyRound, title: 'API Key 管理', detail: '创建、撤销与限额', action: () => void openOfficialUrl(`${appConfig.portalOrigin}/keys`) },
    { icon: Gauge, title: '消费记录', detail: '模型、tokens 与扣费', action: () => void openOfficialUrl(`${appConfig.portalOrigin}/usage-logs`) },
  ];
  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">账户设置</p><h1>{snapshot.account.email}</h1></div><button className="button button--danger" type="button" onClick={onLogout}><LogOut size={17} />退出登录</button></header>
      <section className="account-summary"><div><span>用户组</span><strong>{snapshot.account.group}</strong></div><div><span>计费倍率</span><strong>{snapshot.account.groupMultiplier.toFixed(2)}×</strong></div><div><span>账户状态</span><strong className="success-text">正常</strong></div></section>
      <section className="settings-list">{items.map(({ icon: Icon, title, detail, action }) => <button type="button" key={title} onClick={action}><Icon size={20} /><span><strong>{title}</strong><small>{detail}</small></span><ChevronRight size={18} /></button>)}</section>
    </div>
  );
}

function AppShell({ snapshot, onLogout, onSync, syncing }: { snapshot: DashboardSnapshot; onLogout: () => void; onSync: () => void; syncing: boolean }) {
  const [view, setView] = useState<ViewId>('overview');
  const [tools, setTools] = useState<ToolState[]>([]);
  const refreshTools = useCallback(() => { void detectTools().then(setTools); }, []);
  useEffect(refreshTools, [refreshTools]);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup"><span>W</span><strong>WBoke API</strong></div>
        <nav>{navItems.map(({ id, label, icon: Icon }) => <button className={view === id ? 'active' : ''} type="button" key={id} aria-label={label} title={label} onClick={() => setView(id)}><Icon size={19} /><span>{label}</span></button>)}</nav>
        <div className="sidebar-footer"><div className="connection-dot" /><div><strong>香港节点</strong><span>api.wboke.com</span></div></div>
      </aside>
      <main className="content">
        {view === 'overview' && <Overview snapshot={snapshot} syncing={syncing} onSync={onSync} onRecharge={() => void openRecharge()} />}
        {view === 'tools' && <ToolsView tools={tools} snapshot={snapshot} onRefresh={refreshTools} />}
        {view === 'models' && <ModelsView models={snapshot.models} />}
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
