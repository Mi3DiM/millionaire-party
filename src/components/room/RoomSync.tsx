"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GameIcon } from "@/components/ui/GameIcon";
import { useP2P } from "@/lib/net/p2p";
import type { GuestMsg, HostSnapshot } from "@/lib/net/protocol";
import { netStats, noteRecv, snapshotBytes } from "@/lib/net/protocol";
import { setP2POutbox, useRoom } from "@/lib/game/store";

/**
 * P2P sync bridge (host-authoritative).
 *
 * - <RoomTransport/> is HEADLESS and must be mounted ONCE per room session
 *   (see src/app/room/[code]/layout.tsx). It survives lobby<->game<->results
 *   navigation, so the WebRTC channel is never torn down by route changes
 *   (simultaneous leave+rejoin on both sides was killing the channel).
 * - <RoomStatus/> is pure UI (banner + collapsed diagnostics) for pages.
 *
 * Resilience: slim snapshots, per-snapshot acks (host detects half-open
 * links), offline grace before removal, re-link by playerId, auto + manual
 * soft-rejoin, and a page-reload hatch (fresh peer identity kills ghosts).
 */

// Module-level holders (not React refs) so P2P event callbacks — registered once
// with useP2P — can always reach the latest senders.
const senderBox: {
  snapshotTo: null | ((snap: HostSnapshot, peerId: string) => void);
  sendEvt: null | ((msg: GuestMsg) => void);
  hello: null | (() => void);
} = { snapshotTo: null, sendEvt: null, hello: null };
const peerToPlayer = new Map<string, string>();
const removalTimers = new Map<string, ReturnType<typeof setTimeout>>();
/** Host-side last-ack per remote player (half-open link detection). */
const ackBox = new Map<string, { seq: number; at: number }>();
const netBox = { lastRejoin: 0 };
/** UI-triggered transport controls (wired by RoomTransport). */
const netCtl: { reconnect: () => void } = { reconnect: () => {} };

const STALE_MS = 12000;
const ACK_DEAD_MS = 10000;
const REMOVE_GRACE_MS = 30000;
const REJOIN_COOLDOWN_MS = 20000;
const RELOAD_AFTER_REJOINS = 2;

function clearRemoval(playerId: string) {
  const t = removalTimers.get(playerId);
  if (t) {
    clearTimeout(t);
    removalTimers.delete(playerId);
  }
}

export function RoomTransport() {
  const params = useParams<{ code: string }>();
  const routeCode = (params.code ?? "").toUpperCase();
  const code = useRoom((s) => s.code);
  const isHost = useRoom((s) => s.isHost);
  const mode = useRoom((s) => s.mode);
  const setP2p = useRoom((s) => s.setP2p);
  const p2pStale = useRoom((s) => s.p2pStale);
  // Transport power switch (auto/manual reconnect toggles this off briefly).
  const [netOn, setNetOn] = React.useState(true);

  // Guests always try P2P (joinRoom sets role guest). Hosts only in p2p mode.
  const enabled = !!code && netOn && (isHost ? mode === "p2p" : true);

  // Restore guest identity after a page reload (same playerId => host re-links).
  React.useEffect(() => {
    if (!useRoom.getState().code && routeCode) {
      useRoom.getState().restoreGuestSession(routeCode);
    }
  }, [routeCode]);

  const reconnect = React.useCallback(() => {
    netBox.lastRejoin = Date.now();
    queueMicrotask(() => {
      const st = useRoom.getState();
      st.setP2p({ p2pRejoins: st.p2pRejoins + 1 });
    });
    setNetOn(false);
    setTimeout(() => setNetOn(true), 800);
  }, []);

  React.useEffect(() => {
    netCtl.reconnect = reconnect;
  }, [reconnect]);

  const handleSnapshot = React.useCallback((snap: HostSnapshot) => {
    const st = useRoom.getState();
    if (st.isHost) return;
    noteRecv(snapshotBytes(snap));
    st.applySnapshot(snap);
    if (st.meId) senderBox.sendEvt?.({ kind: "ack", playerId: st.meId, seq: snap.seq });
  }, []);

  const handleGuestMsg = React.useCallback((msg: GuestMsg, fromPeer: string) => {
    const st = useRoom.getState();
    if (!st.isHost) return;
    netStats.guestMsgs += 1;
    if (msg.kind === "hello" || msg.kind === "ready" || msg.kind === "ack") {
      peerToPlayer.set(fromPeer, msg.playerId);
      // Re-link cancels any pending grace-removal.
      clearRemoval(msg.playerId);
    }
    if (msg.kind === "bye") {
      peerToPlayer.delete(fromPeer);
      clearRemoval(msg.playerId);
    }
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
      case "ack": {
        ackBox.set(msg.playerId, { seq: msg.seq, at: Date.now() });
        const cur = useRoom.getState().players.find((p) => p.id === msg.playerId);
        if (cur && !cur.isHost && cur.connection !== "connected") {
          st.setRemoteConnection(msg.playerId, "connected");
        }
        break;
      }
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
      // Host may have missed our first hello (handshake race): re-announce.
      setTimeout(() => senderBox.hello?.(), 600);
    }
  }, []);

  const handlePeerLeave = React.useCallback((peerId: string) => {
    const st = useRoom.getState();
    if (!st.isHost) return;
    const playerId = peerToPlayer.get(peerId);
    peerToPlayer.delete(peerId);
    if (!playerId) return;
    // Transient drops are common on mobile: mark offline, remove only after grace.
    st.setRemoteConnection(playerId, "offline");
    clearRemoval(playerId);
    removalTimers.set(
      playerId,
      setTimeout(() => {
        removalTimers.delete(playerId);
        const cur = useRoom.getState().players.find((p) => p.id === playerId);
        if (cur && !cur.isHost && cur.connection !== "connected") {
          useRoom.getState().removeRemotePlayer(playerId);
        }
      }, REMOVE_GRACE_MS)
    );
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
    senderBox.sendEvt = (msg) => sendToHost(msg);
    return () => {
      senderBox.snapshotTo = null;
      senderBox.sendEvt = null;
    };
  }, [sendSnapshotTo, sendToHost]);

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

  // Guest hello: initial + retries until first snapshot, and while stale.
  const meId = useRoom((s) => s.meId);
  const meName = useRoom((s) => s.players.find((p) => p.id === s.meId)?.name ?? "");
  const meAvatar = useRoom((s) => s.players.find((p) => p.id === s.meId)?.avatarId ?? "star");
  React.useEffect(() => {
    if (!enabled || isHost || !connected || !meId) return;
    const hello = () => sendToHost({ kind: "hello", playerId: meId, name: meName, avatarId: meAvatar });
    senderBox.hello = hello;
    hello();
    const t = setInterval(() => {
      const st = useRoom.getState();
      if (st.p2pLastHostAt == null || st.p2pStale) hello();
    }, 3000);
    return () => {
      clearInterval(t);
      senderBox.hello = null;
    };
  }, [enabled, isHost, connected, meId, meName, meAvatar, sendToHost, p2pStale]);

  // Host broadcast: on state change + heartbeat every 2.5s.
  const status = useRoom((s) => s.status);
  const playersLen = useRoom((s) => s.players.length);
  const playersSig = useRoom((s) => s.players.map((p) => `${p.id}:${p.ready}:${p.prize}:${p.level}:${p.status}:${p.eliminated}:${p.connection}`).join("|"));
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

  // Host ack watchdog: no ack from an expected player => link (half-)dead.
  React.useEffect(() => {
    if (!enabled || !isHost || !connected) return;
    const t = setInterval(() => {
      const st = useRoom.getState();
      if (st.status !== "playing" && st.status !== "reveal" && st.status !== "lobby") return;
      const now = Date.now();
      for (const p of st.players) {
        if (p.isHost || p.isBot) continue;
        const a = ackBox.get(p.id);
        const dead = !a || now - a.at > ACK_DEAD_MS;
        if (dead && p.connection !== "offline") st.setRemoteConnection(p.id, "offline");
        else if (!dead && p.connection === "offline") st.setRemoteConnection(p.id, "connected");
      }
    }, 2000);
    return () => clearInterval(t);
  }, [enabled, isHost, connected]);

  // Guest stale-host detection (+ auto soft-rejoin with cooldown).
  React.useEffect(() => {
    if (isHost || !connected) {
      queueMicrotask(() => {
        const cur = useRoom.getState();
        if (cur.p2pStale || cur.p2pRejoins > 0) cur.setP2p({ p2pStale: false, p2pRejoins: 0 });
      });
      return;
    }
    const t = setInterval(() => {
      const last = useRoom.getState().p2pLastHostAt;
      const isStale = last != null && Date.now() - last > STALE_MS;
      queueMicrotask(() => {
        const cur = useRoom.getState();
        if (cur.p2pStale !== isStale) cur.setP2p({ p2pStale: isStale });
        if (!isStale && cur.p2pRejoins > 0) cur.setP2p({ p2pRejoins: 0 });
      });
      if (isStale && Date.now() - netBox.lastRejoin > REJOIN_COOLDOWN_MS) {
        queueMicrotask(() => reconnect());
      }
    }, 2000);
    return () => clearInterval(t);
  }, [isHost, connected, reconnect]);

  // Keep the screen awake while a shared game runs (mobile power-save kills P2P).
  React.useEffect(() => {
    if (!enabled || (status !== "playing" && status !== "reveal")) return;
    let lock: { release: () => Promise<void> } | null = null;
    let dead = false;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (kind: string) => Promise<{ release: () => Promise<void> }> };
    };
    const req = async () => {
      try {
        const l = await nav.wakeLock?.request("screen");
        if (!l) return;
        if (dead) {
          await l.release().catch(() => {});
        } else {
          lock = l;
        }
      } catch {}
    };
    void req();
    const onVis = () => {
      if (document.visibilityState === "visible") void req();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      dead = true;
      document.removeEventListener("visibilitychange", onVis);
      try {
        void lock?.release()?.catch(() => {});
      } catch {}
    };
  }, [enabled, status]);

  return null;
}

function ageStr(t: number | null, now: number): string {
  if (t == null) return "—";
  const s = Math.max(0, Math.round((now - t) / 1000));
  return s < 60 ? `${s} ث` : `${Math.floor(s / 60)} د`;
}

function DiagPanel({ peers, connected, stale, now }: { peers: number; connected: boolean; stale: boolean; now: number }) {
  const s = useRoom();
  let worstAck: number | null = null;
  if (s.isHost) {
    for (const p of s.players) {
      if (p.isHost || p.isBot) continue;
      const a = ackBox.get(p.id);
      const age = a ? now - a.at : null;
      if (age == null) {
        worstAck = null;
        break;
      }
      worstAck = worstAck == null ? age : Math.max(worstAck, age);
    }
  }
  return (
    <div dir="rtl" className="rounded-2xl border border-dashed border-[var(--border)] p-3 text-[11.5px] leading-relaxed text-[var(--muted)]">
      <b className="text-[var(--foreground)]">تشخيص P2P</b> (للدعم الفني — انسخ هذه القيم عند الإبلاغ)
      <div className="mt-1 grid grid-cols-2 gap-x-4">
        <span>الدور: {s.isHost ? "مضيف" : "ضيف"}</span>
        <span>النقل: {connected ? "مفتوح" : "مغلق"}</span>
        <span>الأقران: {peers}</span>
        <span>الحالة: {s.status} / {s.phase}</span>
        <span>لقطات مرسلة: {netStats.sentSnap} (قبل {ageStr(netStats.sentAt, now)} · {netStats.sentBytes} بايت)</span>
        <span>لقطات مستلمة: {netStats.recvSnap} (قبل {ageStr(netStats.recvAt, now)} · {netStats.recvBytes} بايت)</span>
        <span>رسائل الضيوف: {netStats.guestMsgs}</span>
        <span>لاعبون: {s.players.length} · سؤال {s.currentIndex + 1}/{Math.max(s.order.length, 1)}</span>
        <span>آخر لقطة مضيف: {ageStr(s.p2pLastHostAt, now)}</span>
        <span>متجمد: {stale ? "نعم" : "لا"}</span>
        {s.isHost && <span>أقدم إقرار: {worstAck == null ? "لا يوجد" : `${Math.round(worstAck / 1000)} ث`}</span>}
        {!s.isHost && <span>محاولات إعادة: {s.p2pRejoins}</span>}
      </div>
      {netStats.lastError && <p className="mt-1 text-[var(--danger)]">آخر خطأ: {netStats.lastError}</p>}
    </div>
  );
}

export function RoomStatus({ variant = "lobby" }: { variant?: "lobby" | "game" }) {
  const isHost = useRoom((s) => s.isHost);
  const mode = useRoom((s) => s.mode);
  const code = useRoom((s) => s.code);
  const p2pConnected = useRoom((s) => s.p2pConnected);
  const p2pPeers = useRoom((s) => s.p2pPeers);
  const p2pLastHostAt = useRoom((s) => s.p2pLastHostAt);
  const p2pStale = useRoom((s) => s.p2pStale);
  const p2pRejoins = useRoom((s) => s.p2pRejoins);
  const [showDiag, setShowDiag] = React.useState(false);
  const [diagNow, setDiagNow] = React.useState(0);

  // Diagnostics ticker (only while the panel is open).
  React.useEffect(() => {
    if (!showDiag) return;
    const t = setInterval(() => setDiagNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [showDiag]);

  const visible = !!code && (isHost ? mode === "p2p" : true);
  if (!visible) return null;

  const reloadPage = () => {
    try {
      window.location.reload();
    } catch {}
  };

  const diag = (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setShowDiag((v) => !v)}
        className="self-start text-[11px] text-[var(--muted)] underline-offset-2 hover:underline"
      >
        {showDiag ? "إخفاء التشخيص" : "تشخيص الاتصال"}
      </button>
      {showDiag && <DiagPanel peers={p2pPeers} connected={p2pConnected} stale={p2pStale} now={diagNow} />}
    </div>
  );

  const staleBox = (where: string) => (
    <div className="flex flex-col gap-2" key={where}>
      <div className="rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-center text-[13px]">
        <p>انقطع الاتصال بالمضيف — اللعبة مجمّدة بانتظار عودته. لا تغلق الصفحة.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => netCtl.reconnect()}>
            إعادة الاتصال الآن
          </Button>
          {p2pRejoins >= RELOAD_AFTER_REJOINS && (
            <Button size="sm" variant="gold" onClick={reloadPage}>
              تحديث الصفحة والعودة تلقائياً
            </Button>
          )}
        </div>
      </div>
      {diag}
    </div>
  );

  // Game view: only warn, stay quiet when healthy.
  if (variant === "game") {
    if (isHost) return diag;
    if (!p2pConnected) {
      return (
        <div className="flex flex-col gap-2">
          <p className="rounded-2xl border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-3 text-center text-[13px]">
            جارٍ إعادة الاتصال بالمضيف…
          </p>
          {diag}
        </div>
      );
    }
    if (p2pStale) return staleBox("game");
    return diag;
  }

  // Lobby view: full status.
  return (
    <div className="flex flex-col gap-2">
      {isHost ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--elevated)] px-3 py-2 text-[12.5px]">
          <span className={`inline-block h-2 w-2 rounded-full ${p2pConnected ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden />
          {!p2pConnected ? (
            <span>جارٍ فتح قناة P2P… شارك الرمز بعد الاتصال.</span>
          ) : p2pPeers === 0 ? (
            <span>القناة مفتوحة — بانتظار انضمام اللاعبين من أجهزتهم.</span>
          ) : (
            <Badge variant="success">
              <GameIcon name="users" size={14} /> متصل P2P · {p2pPeers} {p2pPeers === 1 ? "جهاز" : "أجهزة"}
            </Badge>
          )}
        </div>
      ) : !p2pConnected ? (
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--elevated)] px-3 py-2 text-[12.5px]">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" aria-hidden />
          جارٍ الاتصال بالمضيف…
        </div>
      ) : p2pLastHostAt == null ? (
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-3 py-2 text-[12.5px]">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" aria-hidden />
          متصل بالقناة… بانتظار المضيف. تأكد أن المضيف فتح نفس الرمز على جهازه.
        </div>
      ) : p2pStale ? (
        staleBox("lobby")
      ) : (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12.5px]">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          متصل بالمضيف — اضغط «مستعد» وانتظر البدء.
        </div>
      )}
      {diag}
    </div>
  );
}
