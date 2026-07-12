import type { AuthUserResponse } from "@vrc-toolkit/core";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useVrc } from "./vrc";

// The session cannot be resolved yet ("loading"), no authenticated vrchat.com
// session was found ("anonymous"), or the account is established ("authed").
export type SessionPhase = "loading" | "anonymous" | "authed";

export interface Account {
  id: string;
  displayName: string;
  status: string;
  statusDescription: string;
  imageUrl: string | null;
  location: string;
}

interface AccountContextValue {
  phase: SessionPhase;
  account: Account | null;
  refresh: () => void;
  // Optimistically patch the local status, fire PUT /users/{id}, and revert on
  // failure. Either field may be omitted to change only the other.
  updateStatus: (patch: { status?: string; statusDescription?: string }) => Promise<void>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

// Low-rate freshness poll while the tab is visible. The unofficial-API policy
// forbids high-frequency polling; 60s is a gentle check, paused when hidden.
const POLL_MS = 60_000;

function toAccount(u: AuthUserResponse): Account {
  return {
    id: u.id ?? "",
    displayName: u.displayName ?? "",
    status: u.status ?? "",
    statusDescription: u.statusDescription ?? "",
    imageUrl: u.currentAvatarThumbnailImageUrl ?? u.currentAvatarImageUrl ?? null,
    location: u.location ?? "",
  };
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const client = useVrc();
  const [phase, setPhase] = useState<SessionPhase>("loading");
  const [account, setAccount] = useState<Account | null>(null);
  const accountRef = useRef<Account | null>(null);
  accountRef.current = account;
  // True while an optimistic status PUT is in flight, so a concurrent refresh
  // does not overwrite the optimistic value with the server's pre-update state.
  const updatingRef = useRef(false);

  const refresh = useCallback(() => {
    if (updatingRef.current) return;
    client.auth
      .currentUser()
      .then((u) => {
        if (u?.id) {
          setAccount(toAccount(u));
          setPhase("authed");
        } else {
          setPhase("anonymous");
        }
      })
      .catch(() => {
        // Only the initial resolution failing means "no usable session"; a
        // transient failure on a later refresh must not log an authed user out.
        setPhase((p) => (p === "loading" ? "anonymous" : p));
      });
  }, [client]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Freshness: catch external status changes (official site / in-game) the
  // moment the user returns to this tab, plus a gentle poll while it is visible.
  // Auto-refreshes are throttled so rapid focus toggling cannot burst requests.
  useEffect(() => {
    let lastAuto = 0;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastAuto < 5000) return;
      lastAuto = now;
      refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    const id = setInterval(onVisible, POLL_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(id);
    };
  }, [refresh]);

  const updateStatus = useCallback(
    async (patch: { status?: string; statusDescription?: string }) => {
      const cur = accountRef.current;
      if (!cur?.id) throw new Error("no account");
      const next = {
        status: patch.status ?? cur.status,
        statusDescription: patch.statusDescription ?? cur.statusDescription,
      };
      updatingRef.current = true;
      setAccount((a) => (a ? { ...a, ...next } : a));
      try {
        await client.users.update(cur.id, next);
      } catch (e) {
        setAccount((a) =>
          a ? { ...a, status: cur.status, statusDescription: cur.statusDescription } : a,
        );
        throw e;
      } finally {
        updatingRef.current = false;
      }
    },
    [client],
  );

  const value = useMemo<AccountContextValue>(
    () => ({ phase, account, refresh, updateStatus }),
    [phase, account, refresh, updateStatus],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within an AccountProvider");
  return ctx;
}
