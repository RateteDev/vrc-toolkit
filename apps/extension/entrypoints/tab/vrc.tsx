import { VrcClient } from "@vrc-toolkit/core";
import { sessionTransport } from "@vrc-toolkit/core/transport/session";
import { createContext, type ReactNode, useContext, useState } from "react";

const VrcContext = createContext<VrcClient | null>(null);

export function VrcProvider({ children }: { children: ReactNode }) {
  // One client per provider instance, riding the user's existing vrchat.com
  // session cookies via the session-reuse transport (credentials: "include").
  const [client] = useState(() => new VrcClient(sessionTransport()));
  return <VrcContext.Provider value={client}>{children}</VrcContext.Provider>;
}

export function useVrc(): VrcClient {
  const client = useContext(VrcContext);
  if (!client) {
    throw new Error("useVrc must be used within a VrcProvider");
  }
  return client;
}
