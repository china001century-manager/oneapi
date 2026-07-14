import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, LoaderCircle, Mail, ShieldCheck } from 'lucide-react';
import {
  finishPortalLogin,
  loadPortalStatus,
  login,
  register,
  sendVerificationCode,
  verifyTwoFactor,
  type PortalStatus,
  type PortalUser,
} from '../lib/auth';
import { TurnstileWidget } from './TurnstileWidget';

type AuthMode = 'sign-in' | 'sign-up';

const initialStatus: PortalStatus = {
  email_verification: true,
  password_login_enabled: true,
  password_register_enabled: true,
  register_enabled: true,
  turnstile_check: false,
  turnstile_site_key: '',
};

export function AuthPage({ mode }: { mode: AuthMode }) {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [status, setStatus] = useState(initialStatus);
  const [statusReady, setStatusReady] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [invitationCode, setInvitationCode] = useState(params.get('aff') ?? '');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [pending, setPending] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void loadPortalStatus()
      .then((value) => { if (active) setStatus(value); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : '无法读取注册状态'); })
      .finally(() => { if (active) setStatusReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const resetChallenge = useCallback(() => {
    setTurnstileToken('');
    setTurnstileReset((value) => value + 1);
  }, []);

  const sendCode = useCallback(async () => {
    setError('');
    if (!email.includes('@')) { setError('请先输入有效的个人邮箱'); return; }
    if (status.turnstile_check && !turnstileToken) { setError('请先完成安全验证'); return; }
    setSendingCode(true);
    try {
      await sendVerificationCode(email.trim(), turnstileToken);
      setCooldown(60);
      if (status.turnstile_check) resetChallenge();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '验证码发送失败');
      if (status.turnstile_check) resetChallenge();
    } finally {
      setSendingCode(false);
    }
  }, [email, resetChallenge, status.turnstile_check, turnstileToken]);

  const completeLogin = useCallback((user: PortalUser) => finishPortalLogin(user), []);

  const submit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      if (requiresTwoFactor) {
        completeLogin(await verifyTwoFactor(twoFactorCode.trim()));
        return;
      }
      if (status.turnstile_check && !turnstileToken) throw new Error('请先完成安全验证');
      if (mode === 'sign-up') {
        await register({
          username: username.trim(),
          email: email.trim(),
          password,
          verificationCode: verificationCode.trim(),
          invitationCode: invitationCode.trim(),
          turnstileToken,
        });
        window.location.assign(`/sign-in?registered=1&email=${encodeURIComponent(email.trim())}`);
        return;
      }
      const result = await login(email.trim(), password, turnstileToken);
      if (result.require_2fa) {
        setRequiresTwoFactor(true);
        setPassword('');
        resetChallenge();
        return;
      }
      completeLogin(result as PortalUser);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '操作失败，请稍后重试');
      if (status.turnstile_check) resetChallenge();
    } finally {
      setPending(false);
    }
  }, [completeLogin, email, invitationCode, mode, password, requiresTwoFactor, resetChallenge, status.turnstile_check, turnstileToken, twoFactorCode, username, verificationCode]);

  const registrationDisabled = mode === 'sign-up' && statusReady && (!status.register_enabled || !status.password_register_enabled);
  const loginDisabled = mode === 'sign-in' && statusReady && !status.password_login_enabled;

  return (
    <main className="auth-shell">
      <section className="auth-context">
        <a className="auth-brand" href="/"><span>W</span><strong>WBoke API</strong></a>
        <div>
          <p className="section-label">安全账户</p>
          <h1>{mode === 'sign-up' ? '创建你的 API 账户' : '登录 WBoke API'}</h1>
          <p>一个账户管理余额、API Key、消费记录与桌面端配置。桌面客户端使用同一账号登录。</p>
        </div>
        <div className="auth-trust">
          <span><ShieldCheck size={18} /> HTTPS 加密传输</span>
          <span><KeyRound size={18} /> 每位用户独立 API Key</span>
          <span><Mail size={18} /> 个人邮箱验证码</span>
        </div>
      </section>

      <section className="auth-panel">
        <form className="auth-form" onSubmit={submit}>
          <a className="auth-back" href="/"><ArrowLeft size={16} /> 返回首页</a>
          <header>
            <p className="section-label">{requiresTwoFactor ? '二次验证' : mode === 'sign-up' ? '公开注册' : '账户登录'}</p>
            <h2>{requiresTwoFactor ? '输入身份验证器代码' : mode === 'sign-up' ? '注册账户' : '欢迎回来'}</h2>
            {params.get('registered') === '1' && <div className="auth-success"><CheckCircle2 size={17} /> 注册成功，请登录客户端同一账号</div>}
          </header>

          {requiresTwoFactor ? (
            <label><span>验证码或备用码</span><input value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} autoComplete="one-time-code" required autoFocus /></label>
          ) : (
            <>
              {mode === 'sign-up' && <label><span>用户名</span><input value={username} onChange={(event) => setUsername(event.target.value)} minLength={2} maxLength={20} autoComplete="username" required /></label>}
              <label><span>个人邮箱</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={50} required /></label>
              {mode === 'sign-up' && status.email_verification && (
                <label><span>邮箱验证码</span><div className="verification-input"><input value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={8} required /><button type="button" onClick={() => void sendCode()} disabled={sendingCode || cooldown > 0}>{sendingCode ? '发送中' : cooldown > 0 ? `${cooldown}s` : '发送验证码'}</button></div></label>
              )}
              <label><span>密码</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={20} autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} required /><small>8-20 位，请勿与其他网站共用</small></label>
              {mode === 'sign-up' && <label><span>邀请码 <em>可选</em></span><input value={invitationCode} onChange={(event) => setInvitationCode(event.target.value)} maxLength={32} autoComplete="off" /></label>}
              {status.turnstile_check && status.turnstile_site_key && <TurnstileWidget siteKey={status.turnstile_site_key} resetKey={turnstileReset} onToken={setTurnstileToken} />}
            </>
          )}

          {(registrationDisabled || loginDisabled) && <p className="form-error" role="alert">当前暂未开放此登录方式，请联系管理员。</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-large auth-submit" type="submit" disabled={pending || registrationDisabled || loginDisabled}>
            {pending ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}
            {pending ? '处理中' : requiresTwoFactor ? '完成验证' : mode === 'sign-up' ? '创建账户' : '登录'}
          </button>
          <p className="auth-switch">{mode === 'sign-up' ? '已有账户？' : '还没有账户？'} <a href={mode === 'sign-up' ? '/sign-in' : '/sign-up'}>{mode === 'sign-up' ? '直接登录' : '免费注册'}</a></p>
        </form>
      </section>
    </main>
  );
}
