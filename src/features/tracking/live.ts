// The STOMP-over-WebSocket connection for live tracking (API.md "Tracking", design document 4.5).
import { Client } from "@stomp/stompjs";

/** ws(s)://<backend>/api/v1/ws/public (anyone) or /api/v1/ws (logged in: the SD_TOKEN cookie is checked). */
function socketUrl(staff: boolean): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
  return `${base.replace(/^http/, "ws")}/ws${staff ? "" : "/public"}`;
}

export interface LiveSubscription<T> {
  /** Staff connection (cookie checked), needed for /topic/live. */
  staff?: boolean;
  topic: string;
  onMessage: (message: T) => void;
  /** Called on every (re)connect, after subscribing: reload what may have been missed while away. */
  onConnected?: () => void;
  onConnectionChange: (connected: boolean) => void;
}

/**
 * Connects, subscribes to one topic and reconnects by itself (every 5 s). A STOMP ERROR (refused subscription) stops
 * it, because retrying would be refused again. Returns a function that disconnects.
 */
export function subscribeLive<T>({ staff = false, topic, onMessage, onConnected, onConnectionChange }: LiveSubscription<T>) {
  const client = new Client({
    brokerURL: socketUrl(staff),
    reconnectDelay: 5_000,
    heartbeatIncoming: 20_000,
    heartbeatOutgoing: 20_000,
  });
  client.onConnect = () => {
    client.subscribe(topic, (frame) => {
      try {
        onMessage(JSON.parse(frame.body) as T);
      } catch {
        // A message that isn't JSON is ignored.
      }
    });
    onConnectionChange(true);
    onConnected?.();
  };
  client.onWebSocketClose = () => onConnectionChange(false);
  client.onStompError = () => {
    onConnectionChange(false);
    void client.deactivate();
  };
  client.activate();
  return () => {
    void client.deactivate();
  };
}
