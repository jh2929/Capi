import { invoke } from "@tauri-apps/api/core";

export interface CastDevice {
  id: string;
  name: string;
  type: "chromecast" | "android_tv" | "smart_tv" | "airplay" | "speaker";
  model?: string;
  ip?: string;
  port?: number;
  location?: string;
  control_url?: string;
}

export type CastState = "disconnected" | "connecting" | "connected";

export interface CastSession {
  state: CastState;
  device: CastDevice | null;
  volume: number;
  muted: boolean;
  isScanning: boolean;
}

type Listener = (session: CastSession) => void;

class CastManager {
  private session: CastSession = {
    state: "disconnected",
    device: null,
    volume: 1,
    muted: false,
    isScanning: false
  };

  private listeners: Set<Listener> = new Set();
  private availableDevices: CastDevice[] = [];

  constructor() {
    this.scanDevices();
  }

  public getSession(): CastSession {
    return { ...this.session };
  }

  public getAvailableDevices(): CastDevice[] {
    return [...this.availableDevices];
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.session);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener({ ...this.session });
    }
  }

  public async scanDevices(): Promise<CastDevice[]> {
    this.session = { ...this.session, isScanning: true };
    this.notify();

    try {
      // Call Rust backend SSDP and local subnet discovery
      const found = await invoke<CastDevice[]>("descubrir_dispositivos_cast");
      if (Array.isArray(found) && found.length > 0) {
        this.availableDevices = found;
      }
    } catch (err) {
      console.warn("[CastManager] Error discovering network cast devices:", err);
    } finally {
      this.session = { ...this.session, isScanning: false };
      this.notify();
    }

    return this.availableDevices;
  }

  public addManualDevice(ip: string, name: string = "Smart TV"): CastDevice {
    const cleanIp = ip.trim();
    const newDev: CastDevice = {
      id: `manual_${cleanIp}`,
      name: name || `Smart TV (${cleanIp})`,
      type: "smart_tv",
      model: "Dispositivo LAN",
      ip: cleanIp,
      port: 8080
    };

    const existingIdx = this.availableDevices.findIndex(d => d.ip === cleanIp);
    if (existingIdx >= 0) {
      this.availableDevices[existingIdx] = newDev;
    } else {
      this.availableDevices.unshift(newDev);
    }
    this.notify();
    return newDev;
  }

  public async transmitTrack(track?: { id?: string; title?: string; artist?: string; url?: string; thumbnail?: string }): Promise<void> {
    if (this.session.state !== "connected" || !this.session.device || !this.session.device.ip) return;
    const dev = this.session.device;
    try {
      await invoke("transmitir_a_dispositivo", {
        ip: dev.ip,
        port: dev.port || 8080,
        streamUrl: track?.url || "",
        title: track?.title || "Capi Audio Stream",
        artist: track?.artist || "Capi Music",
        thumbnail: track?.thumbnail || null,
        controlUrl: dev.control_url || null,
        trackId: track?.id || null
      });
    } catch (err) {
      console.warn("[CastManager] Error transmitting track to TV:", err);
    }
  }

  public async connect(
    device: CastDevice, 
    audioElement?: HTMLAudioElement | null,
    currentTrack?: { id?: string; title?: string; artist?: string; url?: string; thumbnail?: string }
  ): Promise<void> {
    this.session = {
      ...this.session,
      state: "connecting",
      device
    };
    this.notify();

    // 1. Try native Web RemotePlayback API if browser/Webview supports it
    if (audioElement && "remote" in audioElement && (audioElement as any).remote) {
      try {
        (audioElement as any).remote.prompt().catch(() => {});
      } catch (_) {}
    }

    // 2. Call backend transmit command with UPnP/DLNA & DIAL parameters
    if (device.ip) {
      try {
        await invoke("transmitir_a_dispositivo", {
          ip: device.ip,
          port: device.port || 8080,
          streamUrl: currentTrack?.url || "",
          title: currentTrack?.title || "Capi Audio Stream",
          artist: currentTrack?.artist || "Capi Music",
          thumbnail: currentTrack?.thumbnail || null,
          controlUrl: device.control_url || null,
          trackId: currentTrack?.id || null
        });
      } catch (err) {
        console.warn("[CastManager] Transmit command notice:", err);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    this.session = {
      ...this.session,
      state: "connected",
      device
    };
    this.notify();
  }

  public disconnect(): void {
    this.session = {
      ...this.session,
      state: "disconnected",
      device: null
    };
    this.notify();
  }

  public setVolume(vol: number): void {
    this.session = {
      ...this.session,
      volume: Math.max(0, Math.min(1, vol))
    };
    this.notify();
  }

  public toggleMute(): void {
    this.session = {
      ...this.session,
      muted: !this.session.muted
    };
    this.notify();
  }
}

export const castManager = new CastManager();
