"use client";

/**
 * Serverless P2P transport via Trystero (nostr strategy, no backend).
 * The HOST is authoritative: it broadcasts snapshots; guests send hello/ready/answer/wager.
 * Action namespaces are versioned ("mp-*-v1") so old/broken clients can't interfere.
 */
import * as React from "react";
import { joinRoom as trysteroJoin, selfId, type Room } from "trystero";
import type { GuestMsg, HostSnapshot } from "@/lib/net/protocol";
import { noteError, noteSent, snapshotBytes } from "@/lib/net/protocol";

const APP_ID = "millionaire-party-v1";
const SNAP_NS = "mp-snap-v1";
const EVT_NS = "mp-evt-v1";

export interface P2PEvents {
  onPeerJoin: (peerId: string) => void;
  onPeerLeave: (peerId: string) => void;
  onSnapshot: (snap: HostSnapshot, fromPeerId: string) => void;
  onGuestMsg: (msg: GuestMsg, fromPeerId: string) => void;
}

export function useP2P(code: string | null, enabled: boolean, events: P2PEvents) {
  const roomRef = React.useRef<Room | null>(null);
  const snapRef = React.useRef<{ send: (d: HostSnapshot, o?: { target?: string | string[] }) => Promise<void> } | null>(null);
  const evtRef = React.useRef<{ send: (d: GuestMsg, o?: { target?: string | string[] }) => Promise<void> } | null>(null);
  const [peers, setPeers] = React.useState<string[]>([]);
  const [connected, setConnected] = React.useState(false);
  const eventsRef = React.useRef(events);
  React.useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  React.useEffect(() => {
    if (!code || !enabled) return;
    let disposed = false;
    let room: Room | null = null;
    try {
      room = trysteroJoin({ appId: APP_ID }, code.toUpperCase());
      roomRef.current = room;

      // Note: no generic here — trystero's DataPayload constraint wants an index
      // signature; we validate + narrow at runtime instead (isSnapshot/isGuestMsg).
      const snapAction = room.makeAction(SNAP_NS);
      const evtAction = room.makeAction(EVT_NS);
      snapRef.current = snapAction as unknown as {
        send: (d: HostSnapshot, o?: { target?: string | string[] }) => Promise<void>;
      };
      evtRef.current = evtAction as unknown as {
        send: (d: GuestMsg, o?: { target?: string | string[] }) => Promise<void>;
      };

      snapAction.onMessage = (msg, ctx) => {
        if (disposed || !isSnapshot(msg)) return;
        try {
          eventsRef.current.onSnapshot(msg, ctx.peerId);
        } catch {}
      };
      evtAction.onMessage = (msg, ctx) => {
        if (disposed || !isGuestMsg(msg)) return;
        try {
          eventsRef.current.onGuestMsg(msg, ctx.peerId);
        } catch {}
      };

      room.onPeerJoin = (id: string) => {
        if (disposed) return;
        setPeers((p) => (p.includes(id) ? p : [...p, id]));
        try {
          eventsRef.current.onPeerJoin(id);
        } catch {}
      };
      room.onPeerLeave = (id: string) => {
        if (disposed) return;
        setPeers((p) => p.filter((x) => x !== id));
        try {
          eventsRef.current.onPeerLeave(id);
        } catch {}
      };
      // Mark transport ready asynchronously (avoids sync setState-in-effect cascade).
      queueMicrotask(() => {
        if (!disposed) setConnected(true);
      });
    } catch {
      queueMicrotask(() => {
        if (!disposed) setConnected(false);
      });
    }
    return () => {
      disposed = true;
      const r = room;
      roomRef.current = null;
      snapRef.current = null;
      evtRef.current = null;
      setPeers([]);
      setConnected(false);
      if (r) {
        try {
          void r.leave();
        } catch {}
      }
    };
  }, [code, enabled]);

  const broadcastSnapshot = React.useCallback((snap: HostSnapshot) => {
    try {
      noteSent(snapshotBytes(snap));
      void snapRef.current?.send(snap)?.catch((e) => noteError(e));
    } catch (e) {
      noteError(e);
    }
  }, []);

  const sendSnapshotTo = React.useCallback((snap: HostSnapshot, peerId: string) => {
    try {
      noteSent(snapshotBytes(snap));
      void snapRef.current?.send(snap, { target: peerId })?.catch((e) => noteError(e));
    } catch (e) {
      noteError(e);
    }
  }, []);

  const sendToHost = React.useCallback((msg: GuestMsg) => {
    try {
      void evtRef.current?.send(msg)?.catch((e) => noteError(e));
    } catch (e) {
      noteError(e);
    }
  }, []);

  return { peers, connected, myPeerId: selfId, broadcastSnapshot, sendSnapshotTo, sendToHost };
}

function isSnapshot(v: unknown): v is HostSnapshot {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    o.v === 1 &&
    typeof o.code === "string" &&
    Array.isArray(o.players) &&
    typeof o.questionTotal === "number" &&
    (o.question === null || typeof o.question === "object")
  );
}

function isGuestMsg(v: unknown): v is GuestMsg {
  if (!v || typeof v !== "object") return false;
  const k = (v as Record<string, unknown>).kind;
  return k === "hello" || k === "ready" || k === "answer" || k === "wager" || k === "bye" || k === "ack";
}
