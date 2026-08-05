/**
 * WebRTC peer connection manager.
 * Handles creating, maintaining, and destroying RTCPeerConnection instances.
 * Separated from React for testability and clean architecture.
 */

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export interface PeerCallbacks {
  onTrack: (userId: string, stream: MediaStream) => void;
  onIceCandidate: (userId: string, candidate: RTCIceCandidate) => void;
  onConnectionStateChange: (userId: string, state: RTCPeerConnectionState) => void;
}

export class WebRTCManager {
  private peers: Map<string, RTCPeerConnection> = new Map();
  private callbacks: PeerCallbacks;
  private localStream: MediaStream | null = null;

  constructor(callbacks: PeerCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Set the local stream. Adds tracks to all existing connections.
   */
  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
    // Add tracks to any existing peers
    for (const [, connection] of this.peers) {
      stream.getTracks().forEach((track) => {
        // Avoid adding duplicate tracks
        const existingSenders = connection.getSenders();
        const alreadyAdded = existingSenders.some(
          (s) => s.track?.id === track.id,
        );
        if (!alreadyAdded) {
          connection.addTrack(track, stream);
        }
      });
    }
  }

  /**
   * Create a new peer connection for a given userId.
   */
  createPeerConnection(userId: string): RTCPeerConnection {
    // Clean up existing connection if any
    if (this.peers.has(userId)) {
      this.removePeer(userId);
    }

    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        connection.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming tracks
    connection.ontrack = (event) => {
      if (event.streams[0]) {
        this.callbacks.onTrack(userId, event.streams[0]);
      }
    };

    // Handle ICE candidates
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.callbacks.onIceCandidate(userId, event.candidate);
      }
    };

    // Monitor connection state
    connection.onconnectionstatechange = () => {
      this.callbacks.onConnectionStateChange(userId, connection.connectionState);
    };

    this.peers.set(userId, connection);
    return connection;
  }

  /**
   * Create an SDP offer for a peer.
   */
  async createOffer(userId: string): Promise<RTCSessionDescriptionInit> {
    const connection = this.peers.get(userId);
    if (!connection) {
      throw new Error(`No peer connection for ${userId}`);
    }

    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    return offer;
  }

  /**
   * Handle an incoming SDP offer. Creates answer.
   */
  async handleOffer(
    userId: string,
    offer: RTCSessionDescriptionInit,
  ): Promise<RTCSessionDescriptionInit> {
    let connection = this.peers.get(userId);
    if (!connection) {
      connection = this.createPeerConnection(userId);
    }

    await connection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    return answer;
  }

  /**
   * Handle an incoming SDP answer.
   */
  async handleAnswer(
    userId: string,
    answer: RTCSessionDescriptionInit,
  ): Promise<void> {
    const connection = this.peers.get(userId);
    if (!connection) return;

    await connection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  /**
   * Handle an incoming ICE candidate.
   */
  async handleIceCandidate(
    userId: string,
    candidate: RTCIceCandidateInit,
  ): Promise<void> {
    const connection = this.peers.get(userId);
    if (!connection) return;

    try {
      await connection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.warn(`[WebRTC] Failed to add ICE candidate for ${userId}:`, error);
    }
  }

  /**
   * Replace video track on all peer connections (for screen share / camera swap).
   * Uses replaceTrack() — no renegotiation needed.
   */
  async replaceVideoTrack(newTrack: MediaStreamTrack): Promise<void> {
    const replacePromises: Promise<void>[] = [];

    for (const [, connection] of this.peers) {
      const sender = connection
        .getSenders()
        .find((s) => s.track?.kind === "video");
      if (sender) {
        replacePromises.push(sender.replaceTrack(newTrack));
      }
    }

    await Promise.all(replacePromises);
  }

  /**
   * Remove and close a peer connection.
   */
  removePeer(userId: string): void {
    const connection = this.peers.get(userId);
    if (connection) {
      connection.ontrack = null;
      connection.onicecandidate = null;
      connection.onconnectionstatechange = null;
      connection.close();
      this.peers.delete(userId);
    }
  }

  /**
   * Check if a peer connection exists.
   */
  hasPeer(userId: string): boolean {
    return this.peers.has(userId);
  }

  /**
   * Get peer count.
   */
  getPeerCount(): number {
    return this.peers.size;
  }

  /**
   * Close all connections and clean up.
   */
  destroy(): void {
    for (const [userId] of this.peers) {
      this.removePeer(userId);
    }
    this.peers.clear();
    this.localStream = null;
  }
}
