import { useCallback, useEffect, useState } from "react";
import { Layout } from "./Layout";
import { useVrc, VrcProvider } from "./vrc";

const LOGIN_URL = "https://vrchat.com/home/login";

// The session cannot be resolved yet ("loading"), no authenticated vrchat.com
// session was found ("anonymous"), or the account is established ("authed").
type SessionPhase = "loading" | "anonymous" | "authed";

function SessionGate() {
  const client = useVrc();
  const [phase, setPhase] = useState<SessionPhase>("loading");

  const check = useCallback(() => {
    setPhase("loading");
    client.auth
      .currentUser()
      .then((user) => {
        // currentUser() returns null on 401 (unauthenticated); a body without an
        // id means the session is not fully established (e.g. 2FA pending).
        setPhase(user?.id ? "authed" : "anonymous");
      })
      .catch(() => {
        // Any non-401 transport/API failure: treat as no usable session and
        // let the user retry rather than crash the shell.
        setPhase("anonymous");
      });
  }, [client]);

  useEffect(() => {
    check();
  }, [check]);

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
            <button type="button" className="refresh" onClick={check}>
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
      <SessionGate />
    </VrcProvider>
  );
}
