import { AvatarsGrid } from "./me/AvatarsGrid";
import { StatusCard } from "./me/StatusCard";

// StatsView is out of scope (history-dependent, not ported).
export function MeView() {
  return (
    <>
      <StatusCard />
      <AvatarsGrid />
    </>
  );
}
