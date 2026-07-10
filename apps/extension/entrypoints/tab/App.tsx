import { AccountProvider, useAccount } from "./account";
import { Layout } from "./Layout";
import { VrcProvider } from "./vrc";

const LOGIN_URL = "https://vrchat.com/home/login";

function SessionGate() {
  const { phase, refresh } = useAccount();

  if (phase === "loading") {
    return (
      <main className="wrap">
        <p className="mstatus">読み込み中…</p>
      </main>
    );
  }

  if (phase === "anonymous") {
    return (
      <main className="wrap">
        <header className="site-header rise d1">
          <span className="brand">VRC Toolkit</span>
        </header>
        <h1 className="view-title rise d1">ログインが必要です</h1>
        <div className="card rise d2">
          <p className="hint">VRChat にログインしてください</p>
          <a className="submit" href={LOGIN_URL} target="_blank" rel="noopener noreferrer">
            VRChat にログイン
          </a>
          <div className="mhead">
            <button type="button" className="refresh" onClick={refresh}>
              再読み込み
            </button>
          </div>
        </div>
      </main>
    );
  }

  return <Layout />;
}

export function App() {
  return (
    <VrcProvider>
      <AccountProvider>
        <SessionGate />
      </AccountProvider>
    </VrcProvider>
  );
}
