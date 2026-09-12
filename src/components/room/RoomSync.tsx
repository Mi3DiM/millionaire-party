"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { GameIcon } from "@/components/ui/GameIcon";
import { useP2P } from "@/lib/net/p2p";
import type { GuestMsg, HostSnapshot } from "@/lib/net/protocol";
import { setP2POutbox, useRoom } from "@/lib/game/store";

/**
 * P2P sync bridge (host-authoritative).
 * - Host: broadcasts sanitized snapshots, handles hello/ready/answer/wager/bye.
 * - Guest: sends hello (+retries), applies snapshots, sends ready/answer/wager via store outbox.
 * Renders a compact connection status banner.
 */

// Module-level holders (not React refs) so P2P event callbacks — registered once
// with useP2P — can always reach the latest senders. Only one RoomSync is
// mounted at a time (lobby OR game route), so sharing is safe.
const senderBox: {
  snapshotTo: null | ((snap: HostSnapshot, peerId: string) => void);
  hello: null | (() => void);
} = { snapshotTo: null, hello: null };
const peerToPlayer = new Map<string, string>();

export function RoomSync({ variant = "lobby" }: { variant?: "lobby" | "game" }) {
  const code = useRoom((s) => s.code);
  const isHost = useRoom((s) => s.isHost);
  const mode = useRoom((s) => s.mode);
  const p2pPeers = useRoom((s) => s.p2pPeers);
  const p2pLastHostAt = useRoom((s) => s.p2pLastHostAt);
  const setP2p = useRoom((s) => s.setP2p);
  const [stale, setStale] = React.useState(false);

  // Guests always try P2P (joinRoom sets role guest). Hosts only in p2p mode.
  const enabled = !!code && (isHost ? mode === "p2p" : true);

  const handleSnapshot = React.useCallback((snap: HostSnapshot) => {
    const st = useRoom.getState();
    if (st.isHost) return;
    st.applySnapshot(snap);
  }, []);

  const handleGuestMsg = React.useCallback((msg: GuestMsg, fromPeer: string) => {
    const st = useRoom.getState();
    if (!st.isHost) return;
    if (msg.kind === "hello" || msg.kind === "ready") peerToPlayer.set(fromPeer, msg.playerId);
    if (msg.kind === "bye") peerToPlayer.delete(fromPeer);
    switch (msg.kind) {
      case "hello":
        st.registerRemotePlayer({ playerId: msg.playerId, name: msg.name, avatarId: msg.avatarId });
        // Reply directly so the newcomer converges even if it missed the broadcast.
        queueMicrotask(() => {
          const snap = useRoom.getState().buildHostSnapshot();
          if (snap) senderBox.snapshotTo?.(snap, fromPeer);
        });
        break;
      case "ready":
        st.setRemoteReady(msg.playerId, msg.ready);
        break;
      case "answer":
        st.submitRemoteAnswer({ playerId: msg.playerId, questionId: msg.questionId, choice: msg.choice });
        break;
      case "wager":
        st.placeRemoteWager(msg.playerId, msg.pct);
        break;
      case "bye":
        st.removeRemotePlayer(msg.playerId);
        break;
    }
  }, []);

  const handlePeerJoin = React.useCallback((peerId: string) => {
    const st = useRoom.getState();
    if (st.isHost) {
      // New peer may have missed earlier broadcasts: push current state directly.
      setTimeout(() => {
        const snap = useRoom.getState().buildHostSnapshot();
        if (snap) senderBox.snapshotTo?.(snap, peerId);
      }, 600);
    } else {
      // Host may have missed our first hello (WebRTC handshake race): re-announce.
      setTimeout(() => senderBox.hello?.(), 600);
    }
  }, []);

  const handlePeerLeave = React.useCallback((peerId: string) => {
    const st = useRoom.getState();
    if (!st.isHost) return;
    const playerId = peerToPlayer.get(peerId);
    peerToPlayer.delete(peerId);
    if (playerId) st.removeRemotePlayer(playerId);
  }, []);

  const events = React.useMemo(
    () => ({
      onPeerJoin: handlePeerJoin,
      onPeerLeave: handlePeerLeave,
      onSnapshot: handleSnapshot,
      onGuestMsg: handleGuestMsg,
    }),
    [handlePeerJoin, handlePeerLeave, handleSnapshot, handleGuestMsg]
  );

  const { peers, connected, broadcastSnapshot, sendSnapshotTo, sendToHost } = useP2P(code, enabled, events);

  // Publish senders for the event callbacks above.
  React.useEffect(() => {
    senderBox.snapshotTo = (snap, peerId) => sendSnapshotTo(snap, peerId);
    return () => {
      senderBox.snapshotTo = null;
    };
  }, [sendSnapshotTo]);

  // Mirror transport state into the store (peers count drives lobby UI).
  React.useEffect(() => {
    queueMicrotask(() => setP2p({ p2pConnected: connected, p2pPeers: peers.length }));
  }, [connected, peers.length, setP2p]);

  // Provide guest->host outbox for store actions (toggleReady/submitAnswer/placeWager/tickTimeout).
  React.useEffect(() => {
    if (!enabled) {
      setP2POutbox(null);
      return;
    }
    setP2POutbox((msg) => sendToHost(msg));
    return () => setP2POutbox(null);
  }, [enabled, sendToHost]);

  // Guest hello: initial + retries until first snapshot arrives.
  const meId = useRoom((s) => s.meId);
  const meName = useRoom((s) => s.players.find((p) => p.id === s.meId)?.name ?? "");
  const meAvatar = useRoom((s) => s.players.find((p) => p.id === s.meId)?.avatarId ?? "star");
  React.useEffect(() => {
    if (!enabled || isHost || !connected || !meId) return;
    const hello = () => sendToHost({ kind: "hello", playerId: meId, name: meName, avatarId: meAvatar });
    senderBox.hello = hello;
    hello();
    const t = setInterval(() => {
      if (useRoom.getState().p2pLastHostAt == null) hello();
    }, 3000);
    return () => {
      clearInterval(t);
      senderBox.hello = null;
    };
  }, [enabled, isHost, connected, meId, meName, meAvatar, sendToHost]);

  // Host broadcast: on state change + heartbeat every 2.5s.
  const status = useRoom((s) => s.status);
  const playersLen = useRoom((s) => s.players.length);
  const playersSig = useRoom((s) => s.players.map((p) => `${p.id}:${p.ready}:${p.prize}:${p.level}:${p.status}:${p.eliminated}`).join("|"));
  const currentIndex = useRoom((s) => s.currentIndex);
  const phase = useRoom((s) => s.phase);
  const questionEndsAt = useRoom((s) => s.questionEndsAt);
  const awaitingStage = useRoom((s) => s.awaitingStage);
  const revealSig = useRoom((s) => (s.reveal ? `${s.reveal.correct}:${s.reveal.submissions.length}` : "none"));
  const settingsSig = useRoom((s) => JSON.stringify(s.settings));
  const bankId = useRoom((s) => s.bank?.id ?? null);
  React.useEffect(() => {
    if (!enabled || !isHost || !connected) return;
    const snap = useRoom.getState().buildHostSnapshot();
    if (snap) broadcastSnapshot(snap);
  }, [enabled, isHost, connected, broadcastSnapshot, status, playersLen, playersSig, currentIndex, phase, questionEndsAt, awaitingStage, revealSig, settingsSig, bankId]);
  React.useEffect(() => {
    if (!enabled || !isHost || !connected) return;
    const t = setInterval(() => {
      const snap = useRoom.getState().buildHostSnapshot();
      if (snap) broadcastSnapshot(snap);
    }, 2500);
    return () => clearInterval(t);
  }, [enabled, isHost, connected, broadcastSnapshot]);

  // Guest stale-host detection (freeze message per docs).
  React.useEffect(() => {
    if (isHost || !connected) {
      if (stale) queueMicrotask(() => setStale(false));
      return;
    }
    const t = setInterval(() => {
      const last = useRoom.getState().p2pLastHostAt;
      const isStale = last != null && Date.now() - last > 12000;
      queueMicrotask(() => setStale(isStale));
    }, 2000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, connected]);

  if (!enabled) return null;

  // Game view: only warn, stay quiet when healthy.
  if (variant === "game") {
    if (isHost) return null;
    if (!connected) {
      return (
        <p className="rounded-2xl border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-3 text-center text-[13px]">
          جارٍ إعادة الاتصال بالمضيف…
        </p>
      );
    }
    if (stale) {
      return (
        <p className="rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-center text-[13px]">
          انقطع الاتصال بالمضيف — اللعبة مجمّدة بانتظار عودته. لا تغلق الصفحة.
        </p>
      );
    }
    return null;
  }

  // Lobby view: full status.
  if (isHost) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--elevated)] px-3 py-2 text-[12.5px]">
        <span className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden />
        {!connected ? (
          <span>جارٍ فتح قناة P2P… شارك الرمز بعد الاتصال.</span>
        ) : p2pPeers === 0 ? (
          <span>القناة مفتوحة — بانتظار انضمام اللاعبين من أجهزتهم.</span>
        ) : (
          <Badge variant="success">
            <GameIcon name="users" size={14} /> متصل P2P · {p2pPeers} {p2pPeers === 1 ? "جهاز" : "أجهزة"}
          </Badge>
        )}
      </div>
    );
  }

  // Guest lobby status.
  if (!connected) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--elevated)] px-3 py-2 text-[12.5px]">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" aria-hidden />
        جارٍ الاتصال بالمضيف…
      </div>
    );
  }
  if (p2pLastHostAt == null) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-3 py-2 text-[12.5px]">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" aria-hidden />
        متصل بالقناة… بانتظار المضيف. تأكد أن المضيف فتح نفس الرمز على جهازه.
      </div>
    );
  }
  if (stale) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2 text-[12.5px]">
        انقطع الاتصال بالمضيف — بانتظار عودته. لا تغلق الصفحة.
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12.5px]">
      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
      متصل بالمضيف — اضغط «مستعد» وانتظر البدء.
    </div>
  );
}
