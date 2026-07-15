import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Download,
  Gauge,
  KeyRound,
  Menu,
  ServerCog,
  ShieldCheck,
  TerminalSquare,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import { AuthPage } from './components/AuthPage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://www.wboke.com/v1';

const models = [
  { family: 'OpenAI', name: 'GPT Codex', status: '支持' },
  { family: 'Anthropic', name: 'Claude Sonnet', status: '支持' },
  { family: 'Gemini', name: 'Gemini Pro', status: '支持' },
  { family: 'DeepSeek', name: 'DeepSeek Chat', status: '支持' },
  { family: 'GLM', name: 'GLM Air', status: '支持' },
];

const providers = ['OpenAI', 'Anthropic', 'Gemini', 'DeepSeek', 'GLM'];

function Logo() {
  return (
    <a className="brand" href="#top" aria-label="六脉神剑API 首页">
      <img className="brand-logo" src="/brand-logo.png" alt="" />
      <span>六脉神剑API</span>
    </a>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Logo />
        <nav className={open ? 'site-nav is-open' : 'site-nav'} aria-label="主导航">
          <a href="#pricing" onClick={close}>支持模型</a>
          <a href="#access" onClick={close}>快速接入</a>
          <a href="#download" onClick={close}>客户端下载</a>
        </nav>
        <div className="header-actions">
          <a className="button button-quiet header-login" href="/sign-in">登录</a>
          <a className="button button-primary" href="/sign-up">注册并获取 Key <ArrowRight size={16} /></a>
          <button
            className="icon-button menu-button"
            type="button"
            aria-label={open ? '关闭导航' : '打开导航'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function CopyEndpoint({ compact = false }: { compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(API_BASE_URL);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={compact ? 'endpoint endpoint-compact' : 'endpoint'}>
      <span>OpenAI 兼容</span>
      <code>{API_BASE_URL}</code>
      <button className="icon-button" type="button" onClick={() => void copy()} title="复制 Base URL" aria-label="复制 Base URL">
        {copied ? <Check size={17} /> : <Copy size={17} />}
      </button>
    </div>
  );
}

function Hero() {
  return (
    <>
      <section className="hero" id="top">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="eyebrow"><span /> 香港部署 · HTTPS 安全网关</div>
            <h1>六脉神剑API</h1>
            <p className="hero-offer">一个 Key，接入主流 AI 模型</p>
            <p className="hero-description">为 Codex、Claude Code、Gemini CLI 和企业应用提供统一接口。人民币充值，按实际用量扣费，价格清楚可查。</p>
            <div className="hero-actions">
              <a className="button button-primary button-large" href="/sign-up">注册并获取 Key <ArrowRight size={18} /></a>
              <a className="button button-secondary button-large" href="#download"><Download size={18} /> 下载客户端</a>
            </div>
            <CopyEndpoint compact />
          </div>
          <div className="hero-product">
            <img className="hero-image" src="/wboke.png" alt="通向星空的钥匙孔" />
          </div>
        </div>
      </section>
      <section className="provider-strip" aria-label="支持的模型厂商">
        <div className="section-inner provider-inner">
          <span>统一接入</span>
          {providers.map((provider) => <strong key={provider}>{provider}</strong>)}
        </div>
      </section>
    </>
  );
}

function Pricing() {
  const [family, setFamily] = useState('全部');
  const visibleModels = useMemo(
    () => family === '全部' ? models : models.filter((model) => model.family === family),
    [family],
  );

  return (
    <section className="section pricing-section" id="pricing">
      <div className="section-inner">
        <div className="section-heading split-heading">
          <div>
            <p className="section-label">支持模型</p>
            <h2>主流模型，一个入口</h2>
          </div>
          <p>具体可用模型和人民币价格以用户控制台实时显示为准。</p>
        </div>
        <div className="pricing-toolbar">
          <div className="segmented" aria-label="筛选模型厂商">
            {['全部', ...providers].map((item) => (
              <button className={family === item ? 'active' : ''} type="button" key={item} onClick={() => setFamily(item)}>{item}</button>
            ))}
          </div>
          <a className="inline-link" href="/dashboard">进入控制台查看实时列表 <ChevronRight size={16} /></a>
        </div>
        <div className="pricing-table" role="table" aria-label="模型价格表">
          <div className="pricing-row pricing-head" role="row">
            <span>模型</span><span>厂商</span><span>状态</span>
          </div>
          {visibleModels.map((model) => (
            <div className="pricing-row" role="row" key={model.name}>
              <strong>{model.name}</strong>
              <span>{model.family}</span>
              <span className="availability"><i /> {model.status}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  { icon: KeyRound, number: '01', title: '验证邮箱并注册', text: '使用个人邮箱接收验证码；邀请码可选，不影响公开注册。' },
  { icon: WalletCards, number: '02', title: '购买并兑换额度', text: '从公司指定链小铺购买兑换码，在用户中心手动兑换。' },
  { icon: TerminalSquare, number: '03', title: '创建 Key 并配置', text: '复制统一接口，或使用桌面客户端检测工具并生成安全配置。' },
];

function Access() {
  return (
    <section className="section access-section" id="access">
      <div className="section-inner access-layout">
        <div className="section-heading access-heading">
          <p className="section-label">快速接入</p>
          <h2>从注册到第一次调用，只需要三步</h2>
          <p>账户、余额和 API Key 在控制台统一管理，桌面端帮助你完成本机工具配置。</p>
          <a className="button button-dark" href="#access"><BookOpen size={17} /> 查看接入说明</a>
        </div>
        <div className="step-list">
          {steps.map(({ icon: Icon, number, title, text }) => (
            <article className="step" key={number}>
              <div className="step-number">{number}</div>
              <Icon size={22} />
              <div><h3>{title}</h3><p>{text}</p></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCapabilities() {
  const items = [
    { icon: ServerCog, title: '统一模型入口', text: 'OpenAI、Anthropic、Gemini、DeepSeek 与 GLM 使用同一账户管理。' },
    { icon: Gauge, title: '透明用量明细', text: '按请求查看模型、Tokens、缓存、响应时间与实际扣费。' },
    { icon: ShieldCheck, title: '渠道安全边界', text: '审核第三方渠道主用，符合资格的官方渠道兜底，凭据只保存在服务器。' },
    { icon: Zap, title: '桌面快速配置', text: '检测 Codex CLI、Claude Code 与 Gemini CLI，配置前先预览并备份。' },
  ];

  return (
    <section className="section capability-section">
      <div className="section-inner">
        <div className="section-heading split-heading">
          <div><p className="section-label">为实际使用而设计</p><h2>官网说明清楚，控制台专注管理</h2></div>
          <p>从注册、充值到查看用量，常用入口集中在同一个账户中。</p>
        </div>
        <div className="capability-grid">
          {items.map(({ icon: Icon, title, text }) => (
            <article className="capability" key={title}>
              <Icon size={22} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DownloadSection() {
  return (
    <section className="download-section" id="download">
      <div className="section-inner download-inner">
        <div>
          <p className="section-label section-label-light">六脉神剑 Desktop</p>
          <h2>让工具配置变成一个可回退的操作</h2>
          <p>Windows 首发。识别本机工具、预览配置、创建备份，再由你确认应用。</p>
          <div className="download-points">
            <span><CheckCircle2 size={16} /> 不修改全局环境作为通用方案</span>
            <span><CheckCircle2 size={16} /> 配置写入前备份，支持恢复</span>
          </div>
        </div>
        <div className="download-actions">
          <button className="button button-light button-large" type="button" disabled><Download size={18} /> Windows 版即将开放</button>
          <a className="inline-link inline-link-light" href="#access">查看支持的工具 <ArrowRight size={16} /></a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-dots" aria-hidden="true" />
      <div className="section-inner footer-inner">
        <div className="footer-top">
          <div><Logo /><p>主流 AI 模型的统一 API 接入与桌面配置工具。</p></div>
          <nav aria-label="产品链接"><strong>产品</strong><a href="#pricing">支持模型</a><a href="#download">客户端下载</a><a href="/dashboard">用户控制台</a></nav>
          <nav aria-label="支持链接"><strong>支持</strong><a href="#access">接入说明</a><a href="/api/status">服务状态</a></nav>
        </div>
        <div className="footer-bottom"><span>© 2026 六脉神剑API</span><span>香港部署 · www.wboke.com</span></div>
      </div>
    </footer>
  );
}

export function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  if (path === '/sign-in' || path === '/login') return <AuthPage mode="sign-in" />;
  if (path === '/sign-up' || path === '/register') return <AuthPage mode="sign-up" />;
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Pricing />
        <Access />
        <ProductCapabilities />
        <DownloadSection />
      </main>
      <Footer />
    </>
  );
}
