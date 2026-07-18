import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Desktop UI error', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <main className="fatal-error" role="alert">
          <div>
            <p className="eyebrow">客户端界面异常</p>
            <h1>页面未能正常显示</h1>
            <p>请重启客户端；若问题持续，请将发生时间和操作步骤发给管理员。</p>
            <button className="button button--primary" type="button" onClick={() => window.location.reload()}>
              重新载入
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
