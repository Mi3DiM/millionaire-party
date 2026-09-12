import type { ReactNode } from "react";
import { RoomTransport } from "@/components/room/RoomSync";

/**
 * Room segment layout: mounts the P2P transport ONCE for the whole room
 * session. It persists across lobby <-> game <-> results navigation, so the
 * WebRTC channel is never torn down by route changes.
 */
export default function RoomLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <RoomTransport />
      {children}
    </>
  );
}
