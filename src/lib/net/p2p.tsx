"use client";

/**
 * Serverless P2P transport via Trystero (nostr strategy, no backend).
 * The HOST is authoritative: it broadcasts snapshots; guests send join/answer events.
 * Falls back gracefully to local mode when P2P is unavailable.
 */
import * as React from "react";
import { joinRoom as trysteroJoin, selfId, type Room } from "trystero";

const APP_ID = "millionaire-party-v1";

export interface P2PEvents {
  onPeerJoin: (peerId: string) => void;
  onSnapshot: (snap: unknown) => void;
  onAnswer: (msg: { playerName: string; choice: number | null }) => void;
}

type Actions = {
  sendSnap: (s: string) => Promise<void>;
  sendAnswer: (m: { playerName: string; choice: number | null }) => Promise<void>;
  sendHello: (m: { name: string }) => Promise<void>;
};

export function useP2P(code: string | null, enabled: boolean, events: P2PEvents) {
  const roomRef = React.useRef<Room | null>(null);
  const actionsRef = React.useRef<Actions | null>(null);
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

      const snapAction = room.makeAction<string>("snap");
      const answerAction = room.makeAction<{ playerName: string; choice: number | null }>("ans");
      const helloAction = room.makeAction<{ name: string }>("hello");
      actionsRef.current = { sendSnap: snapAction.send, sendAnswer: answerAction.send, sendHello: helloAction.send };

      snapAction.onMessage = (msg) => {
        try {
          eventsRef.current.onSnapshot(JSON.parse(msg));
        } catch {}
      };
      answerAction.onMessage = (msg) => eventsRef.current.onSnapshot(msg);
      helloAction.onMessage = () => {};

      room.onPeerJoin = (id: string) => {
        if (disposed) return;
        setPeers((p) => (p.includes(id) ? p : [...p, id]));
        eventsRef.current.onPeerJoin(id);
      };
      room.onPeerLeave = (id: string) => {
        if (disposed) return;
        setPeers((p) => p.filter((x) => x !== id));
      };
      // Mark transport ready asynchronously (avoids sync setState-in-effect cascade).
      queueMicrotask(() => {
        if (!disposed) setConnected(true);
      });
    } catch {
      queueMicrotask(() => setConnected(false));
    }
    return () => {
      disposed = true;
      const r = room;
      roomRef.current = null;
      actionsRef.current = null;
      setConnected(false);
      if (r) {
        try {
          void r.leave();
        } catch {}
      }
    };
  }, [code, enabled]);

  const broadcast = React.useCallback((snap: unknown) => {
    try {
      void actionsRef.current?.sendSnap(JSON.stringify(snap));
    } catch {}
  }, []);

  const sendAnswerMsg = React.useCallback((msg: { playerName: string; choice: number | null }) => {
    try {
      void actionsRef.current?.sendAnswer(msg);
    } catch {}
  }, []);

  return { peers, connected, myPeerId: selfId, broadcast, sendAnswerMsg };
}
