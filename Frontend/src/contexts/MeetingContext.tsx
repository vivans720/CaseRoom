import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import { useSocketContext } from "./SocketContext";
import { useAuth } from "../hooks/useAuth";
import { WebRTCManager } from "../services/webrtcManager";
import type {
  MeetingPeer,
  PeerMediaState,
  MeetingViewMode,
  CaseRole,
} from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MeetingJoinedPayload {
  meetingId: string;
  caseId: string;
  role: CaseRole;
  participants: Array<{
    userId: string;
    name: string;
    profilePictureUrl?: string | null;
  }>;
}

interface MeetingContextValue {
  // State
  isInMeeting: boolean;
  viewMode: MeetingViewMode;
  layoutMode: "grid" | "speaker";
  localStream: MediaStream | null;
  videoAvailable: boolean;
  peers: Map<string, MeetingPeer>;
  mediaState: PeerMediaState;
  screenStream: MediaStream | null;
  meetingCaseId: string | null;
  userRole: CaseRole | null;
  meetingError: string | null;
  activeSpeakerId: string | null;
  pinnedUserId: string | null;
  isHandRaised: boolean;
  isLocked: boolean;
  isAudioOnly: boolean;
  durationSeconds: number;

  // Actions
  joinMeeting: (caseId: string) => Promise<void>;
  leaveMeeting: () => void;
  toggleCamera: () => void;
  toggleMic: () => void;
  toggleRaiseHand: () => void;
  toggleLock: () => void;
  muteAll: () => void;
  removeParticipant: (targetUserId: string) => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  setPinnedUserId: (userId: string | null) => void;
  setLayoutMode: (mode: "grid" | "speaker") => void;
  toggleAudioOnly: () => void;
  setViewMode: (mode: MeetingViewMode) => void;
  minimize: () => void;
  expand: () => void;
  clearError: () => void;
}

const MeetingContext = createContext<MeetingContextValue | null>(null);

// ─── Media Helpers ────────────────────────────────────────────────────────────

async function getMediaStream(
  isObserver: boolean,
): Promise<{ stream: MediaStream; videoAvailable: boolean }> {
  const audioConstraints = true;
  const videoConstraints = isObserver ? false : true;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: audioConstraints,
    });

    // Observer: mute mic by default
    if (isObserver) {
      stream.getAudioTracks().forEach((t) => {
        t.enabled = false;
      });
    }

    return { stream, videoAvailable: !isObserver && stream.getVideoTracks().length > 0 };
  } catch {
    // Camera failed, try audio only
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (isObserver) {
        stream.getAudioTracks().forEach((t) => {
          t.enabled = false;
        });
      }

      return { stream, videoAvailable: false };
    } catch {
      throw new Error("Cannot access microphone. Please check permissions.");
    }
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const MeetingProvider = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const { socket } = useSocketContext();
  const { user } = useAuth();

  // State
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [viewMode, setViewMode] = useState<MeetingViewMode>("expanded");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [videoAvailable, setVideoAvailable] = useState(false);
  const [peers, setPeers] = useState<Map<string, MeetingPeer>>(new Map());
  const [mediaState, setMediaState] = useState<PeerMediaState>({
    audio: true,
    video: true,
    screenShare: false,
  });
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [meetingCaseId, setMeetingCaseId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<CaseRole | null>(null);
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"grid" | "speaker">("grid");
  const [isLocked, setIsLocked] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);

  // Live duration counter
  useEffect(() => {
    if (!isInMeeting) {
      setDurationSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isInMeeting]);

  // Refs for stable access in callbacks
  const webrtcRef = useRef<WebRTCManager | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const caseIdRef = useRef<string | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);

  // Keep refs in sync
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    caseIdRef.current = meetingCaseId;
  }, [meetingCaseId]);

  // ─── Cleanup function ────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    // Stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    // Stop screen share
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
    }

    // Destroy WebRTC connections
    if (webrtcRef.current) {
      webrtcRef.current.destroy();
      webrtcRef.current = null;
    }

    // Reset state
    setIsInMeeting(false);
    setViewMode("expanded");
    setLocalStream(null);
    setVideoAvailable(false);
    setPeers(new Map());
    setMediaState({ audio: true, video: true, screenShare: false });
    setScreenStream(null);
    setMeetingCaseId(null);
    setUserRole(null);
    setActiveSpeakerId(null);
    setPinnedUserId(null);
    setIsHandRaised(false);
    cameraTrackRef.current = null;
  }, [screenStream]);

  // ─── Join Meeting ─────────────────────────────────────────────────────────

  const joinMeeting = useCallback(
    async (caseId: string) => {
      if (!socket || !user) return;
      if (isInMeeting) return;

      setMeetingError(null);

      try {
        // We don't know role yet, will be set by server response.
        // Try getting media optimistically (with video).
        const { stream, videoAvailable: vidAvail } = await getMediaStream(false);

        setLocalStream(stream);
        localStreamRef.current = stream;
        setVideoAvailable(vidAvail);

        // Save camera track for screen share revert
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          cameraTrackRef.current = videoTrack;
        }

        // Create WebRTC manager
        const manager = new WebRTCManager({
          onTrack: (userId, remoteStream) => {
            setPeers((prev) => {
              const next = new Map(prev);
              const existing = next.get(userId);
              if (existing) {
                next.set(userId, { ...existing, stream: remoteStream });
              }
              return next;
            });
          },
          onIceCandidate: (userId, candidate) => {
            socket.emit("meeting:ice-candidate", {
              targetUserId: userId,
              candidate: candidate.toJSON(),
            });
          },
          onConnectionStateChange: (userId, state) => {
            if (state === "failed" || state === "disconnected") {
              console.warn(`[WebRTC] Connection ${state} with ${userId}`);
            }
          },
        });

        manager.setLocalStream(stream);
        webrtcRef.current = manager;

        // Set meeting state
        setMeetingCaseId(caseId);
        caseIdRef.current = caseId;

        // Emit join to server
        socket.emit("meeting:join", { caseId });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to join meeting";
        setMeetingError(message);
        cleanup();
      }
    },
    [socket, user, isInMeeting, cleanup],
  );

  // ─── Leave Meeting ────────────────────────────────────────────────────────

  const leaveMeeting = useCallback(() => {
    if (!socket || !caseIdRef.current) return;

    socket.emit("meeting:leave", { caseId: caseIdRef.current });
    cleanup();
  }, [socket, cleanup]);

  // ─── Media Toggles ────────────────────────────────────────────────────────

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current || !videoAvailable) return;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    videoTrack.enabled = !videoTrack.enabled;
    const newState: PeerMediaState = {
      ...mediaState,
      video: videoTrack.enabled,
    };
    setMediaState(newState);

    if (socket && caseIdRef.current) {
      socket.emit("meeting:toggle-media", {
        caseId: caseIdRef.current,
        mediaState: newState,
      });
    }
  }, [videoAvailable, mediaState, socket]);

  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) return;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    const newState: PeerMediaState = {
      ...mediaState,
      audio: audioTrack.enabled,
    };
    setMediaState(newState);

    if (socket && caseIdRef.current) {
      socket.emit("meeting:toggle-media", {
        caseId: caseIdRef.current,
        mediaState: newState,
      });
    }
  }, [mediaState, socket]);

  const toggleRaiseHand = useCallback(() => {
    if (!socket || !caseIdRef.current) return;
    const newHandState = !isHandRaised;
    setIsHandRaised(newHandState);

    const newState: PeerMediaState = {
      ...mediaState,
      isHandRaised: newHandState,
    };
    setMediaState(newState);

    socket.emit("meeting:raise-hand", {
      caseId: caseIdRef.current,
      isHandRaised: newHandState,
    });
    socket.emit("meeting:toggle-media", {
      caseId: caseIdRef.current,
      mediaState: newState,
    });
  }, [socket, isHandRaised, mediaState]);

  const toggleLock = useCallback(() => {
    if (!socket || !caseIdRef.current) return;
    socket.emit("meeting:lock-toggle", { caseId: caseIdRef.current });
  }, [socket]);

  const muteAll = useCallback(() => {
    if (!socket || !caseIdRef.current) return;
    socket.emit("meeting:host-mute-all", { caseId: caseIdRef.current });
  }, [socket]);

  const removeParticipant = useCallback(
    (targetUserId: string) => {
      if (!socket || !caseIdRef.current) return;
      socket.emit("meeting:host-remove-user", {
        caseId: caseIdRef.current,
        targetUserId,
      });
    },
    [socket],
  );

  const toggleAudioOnly = useCallback(() => {
    setIsAudioOnly((prev) => !prev);
  }, []);

  // ─── Screen Share ─────────────────────────────────────────────────────────

  const startScreenShare = useCallback(async () => {
    if (!webrtcRef.current || !socket || !caseIdRef.current) return;
    if (userRole === "Observer") return;

    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const screenTrack = screen.getVideoTracks()[0];

      // Replace video track on all peers
      await webrtcRef.current.replaceVideoTrack(screenTrack);

      setScreenStream(screen);
      const newState: PeerMediaState = {
        ...mediaState,
        video: true,
        screenShare: true,
      };
      setMediaState(newState);

      socket.emit("meeting:screen-share-started", {
        caseId: caseIdRef.current,
      });
      socket.emit("meeting:toggle-media", {
        caseId: caseIdRef.current,
        mediaState: newState,
      });

      // Handle user stopping share via browser UI
      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (error) {
      console.warn("[Meeting] Screen share cancelled or failed:", error);
    }
  }, [socket, userRole, mediaState]);

  const stopScreenShare = useCallback(() => {
    if (!webrtcRef.current || !socket || !caseIdRef.current) return;
    if (!screenStream) return;

    // Stop screen tracks
    screenStream.getTracks().forEach((t) => t.stop());
    setScreenStream(null);

    // Revert to camera track
    const isCameraEnabled = cameraTrackRef.current ? cameraTrackRef.current.enabled : false;
    if (cameraTrackRef.current) {
      webrtcRef.current
        .replaceVideoTrack(cameraTrackRef.current)
        .catch(console.error);
    }

    const newState: PeerMediaState = {
      ...mediaState,
      video: isCameraEnabled,
      screenShare: false,
    };
    setMediaState(newState);

    socket.emit("meeting:screen-share-stopped", {
      caseId: caseIdRef.current,
    });
    socket.emit("meeting:toggle-media", {
      caseId: caseIdRef.current,
      mediaState: newState,
    });
  }, [socket, screenStream, mediaState]);

  // ─── View Mode ────────────────────────────────────────────────────────────

  const minimize = useCallback(() => setViewMode("pip"), []);
  const expand = useCallback(() => setViewMode("expanded"), []);
  const clearError = useCallback(() => setMeetingError(null), []);

  // ─── Socket Event Listeners ───────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    // Server confirmed join
    const onJoined = (data: MeetingJoinedPayload) => {
      setIsInMeeting(true);
      setUserRole(data.role);

      // Adjust media for Observer
      if (data.role === "Observer" && localStreamRef.current) {
        // Mute mic
        localStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = false;
        });
        // Turn off camera
        localStreamRef.current.getVideoTracks().forEach((t) => {
          t.enabled = false;
        });
        setMediaState({ audio: false, video: false, screenShare: false });
      }

      // Create offers to existing participants
      if (webrtcRef.current && data.participants.length > 0) {
        data.participants.forEach(async (participant) => {
          // Add peer to state
          setPeers((prev) => {
            const next = new Map(prev);
            next.set(participant.userId, {
              userId: participant.userId,
              name: participant.name,
              profilePictureUrl: participant.profilePictureUrl,
              stream: null,
              mediaState: { audio: true, video: true, screenShare: false },
            });
            return next;
          });

          // Create connection and send offer
          if (webrtcRef.current) {
            webrtcRef.current.createPeerConnection(participant.userId);
            try {
              const offer = await webrtcRef.current.createOffer(
                participant.userId,
              );
              socket.emit("meeting:offer", {
                targetUserId: participant.userId,
                signal: offer,
              });
            } catch (err) {
              console.error(
                `[WebRTC] Failed to create offer for ${participant.userId}:`,
                err,
              );
            }
          }
        });
      }
    };

    // New user joined
    const onUserJoined = async (data: {
      userId: string;
      name: string;
      profilePictureUrl?: string | null;
    }) => {
      // Add peer to state
      setPeers((prev) => {
        const next = new Map(prev);
        next.set(data.userId, {
          userId: data.userId,
          name: data.name,
          profilePictureUrl: data.profilePictureUrl,
          stream: null,
          mediaState: { audio: true, video: true, screenShare: false },
        });
        return next;
      });

      // The new joiner creates offers to us. We wait for their offer.
      // But if we haven't created a connection yet, prepare one.
      if (webrtcRef.current && !webrtcRef.current.hasPeer(data.userId)) {
        webrtcRef.current.createPeerConnection(data.userId);
      }
    };

    // Received SDP offer
    const onOffer = async (data: {
      fromUserId: string;
      signal: RTCSessionDescriptionInit;
    }) => {
      if (!webrtcRef.current) return;

      // Add peer if not known yet
      setPeers((prev) => {
        if (prev.has(data.fromUserId)) return prev;
        const next = new Map(prev);
        next.set(data.fromUserId, {
          userId: data.fromUserId,
          name: data.fromUserId, // Will be updated
          stream: null,
          mediaState: { audio: true, video: true, screenShare: false },
        });
        return next;
      });

      try {
        const answer = await webrtcRef.current.handleOffer(
          data.fromUserId,
          data.signal,
        );
        socket.emit("meeting:answer", {
          targetUserId: data.fromUserId,
          signal: answer,
        });
      } catch (err) {
        console.error(
          `[WebRTC] Failed to handle offer from ${data.fromUserId}:`,
          err,
        );
      }
    };

    // Received SDP answer
    const onAnswer = async (data: {
      fromUserId: string;
      signal: RTCSessionDescriptionInit;
    }) => {
      if (!webrtcRef.current) return;
      try {
        await webrtcRef.current.handleAnswer(data.fromUserId, data.signal);
      } catch (err) {
        console.error(
          `[WebRTC] Failed to handle answer from ${data.fromUserId}:`,
          err,
        );
      }
    };

    // Received ICE candidate
    const onIceCandidate = async (data: {
      fromUserId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      if (!webrtcRef.current) return;
      await webrtcRef.current.handleIceCandidate(
        data.fromUserId,
        data.candidate,
      );
    };

    // User left
    const onUserLeft = (data: { userId: string }) => {
      if (webrtcRef.current) {
        webrtcRef.current.removePeer(data.userId);
      }
      setPeers((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    };

    // Meeting ended
    const onEnded = () => {
      cleanup();
    };

    // Peer media state changed
    const onMediaState = (data: {
      userId: string;
      mediaState: PeerMediaState;
    }) => {
      setPeers((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.userId);
        if (existing) {
          next.set(data.userId, { ...existing, mediaState: data.mediaState });
        }
        return next;
      });
    };

    // Peer screen share events
    const onScreenShareStarted = (data: { userId: string }) => {
      setPeers((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.userId);
        if (existing) {
          next.set(data.userId, {
            ...existing,
            mediaState: { ...existing.mediaState, video: true, screenShare: true },
          });
        }
        return next;
      });
    };

    const onScreenShareStopped = (data: { userId: string }) => {
      setPeers((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.userId);
        if (existing) {
          next.set(data.userId, {
            ...existing,
            mediaState: { ...existing.mediaState, screenShare: false },
          });
        }
        return next;
      });
    };

    const onUserHandRaised = (data: { userId: string; isHandRaised: boolean }) => {
      setPeers((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.userId);
        if (existing) {
          next.set(data.userId, {
            ...existing,
            mediaState: { ...existing.mediaState, isHandRaised: data.isHandRaised },
            isHandRaised: data.isHandRaised,
          });
        }
        return next;
      });
    };

    const onForceMute = () => {
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
      }
      setMediaState((prev) => ({ ...prev, audio: false }));
    };

    const onUserKicked = (data: { targetUserId: string; removedBy: string }) => {
      if (user && user._id === data.targetUserId) {
        cleanup();
        setMeetingError(`You were removed from the meeting by ${data.removedBy}`);
      } else {
        setPeers((prev) => {
          const next = new Map(prev);
          next.delete(data.targetUserId);
          return next;
        });
      }
    };

    const onLockChanged = (data: { isLocked: boolean }) => {
      setIsLocked(data.isLocked);
    };

    // Error from server
    const onError = (data: { message: string }) => {
      setMeetingError(data.message);
    };

    socket.on("meeting:joined", onJoined);
    socket.on("meeting:user-joined", onUserJoined);
    socket.on("meeting:offer", onOffer);
    socket.on("meeting:answer", onAnswer);
    socket.on("meeting:ice-candidate", onIceCandidate);
    socket.on("meeting:user-left", onUserLeft);
    socket.on("meeting:ended", onEnded);
    socket.on("meeting:media-state", onMediaState);
    socket.on("meeting:screen-share-started", onScreenShareStarted);
    socket.on("meeting:screen-share-stopped", onScreenShareStopped);
    socket.on("meeting:user-hand-raised", onUserHandRaised);
    socket.on("meeting:force-mute", onForceMute);
    socket.on("meeting:user-kicked", onUserKicked);
    socket.on("meeting:lock-changed", onLockChanged);
    socket.on("meeting:error", onError);

    return () => {
      socket.off("meeting:joined", onJoined);
      socket.off("meeting:user-joined", onUserJoined);
      socket.off("meeting:offer", onOffer);
      socket.off("meeting:answer", onAnswer);
      socket.off("meeting:ice-candidate", onIceCandidate);
      socket.off("meeting:user-left", onUserLeft);
      socket.off("meeting:ended", onEnded);
      socket.off("meeting:media-state", onMediaState);
      socket.off("meeting:screen-share-started", onScreenShareStarted);
      socket.off("meeting:screen-share-stopped", onScreenShareStopped);
      socket.off("meeting:user-hand-raised", onUserHandRaised);
      socket.off("meeting:force-mute", onForceMute);
      socket.off("meeting:user-kicked", onUserKicked);
      socket.off("meeting:lock-changed", onLockChanged);
      socket.off("meeting:error", onError);
    };
  }, [socket, cleanup, user]);

  // ─── Context Value ────────────────────────────────────────────────────────

  const value: MeetingContextValue = {
    isInMeeting,
    viewMode,
    layoutMode,
    localStream,
    videoAvailable,
    peers,
    mediaState,
    screenStream,
    meetingCaseId,
    userRole,
    meetingError,
    activeSpeakerId,
    pinnedUserId,
    isHandRaised,
    isLocked,
    isAudioOnly,
    durationSeconds,
    joinMeeting,
    leaveMeeting,
    toggleCamera,
    toggleMic,
    toggleRaiseHand,
    toggleLock,
    muteAll,
    removeParticipant,
    startScreenShare,
    stopScreenShare,
    setPinnedUserId,
    setLayoutMode,
    toggleAudioOnly,
    setViewMode,
    minimize,
    expand,
    clearError,
  };

  return (
    <MeetingContext.Provider value={value}>{children}</MeetingContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useMeetingContext = (): MeetingContextValue => {
  const context = useContext(MeetingContext);
  if (!context) {
    throw new Error("useMeetingContext must be used within a MeetingProvider");
  }
  return context;
};
