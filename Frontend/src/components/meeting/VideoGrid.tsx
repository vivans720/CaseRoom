import type { JSX } from "react";
import { VideoTile } from "./VideoTile";
import type { MeetingPeer, PeerMediaState } from "../../types";

interface VideoGridProps {
  localStream: MediaStream | null;
  localMediaState: PeerMediaState;
  videoAvailable: boolean;
  localName: string;
  localProfilePicture?: string | null;
  peers: Map<string, MeetingPeer>;
}

/**
 * Responsive video grid layout.
 * 1 peer: full width, 2: side by side, 3-4: 2x2, 5-6: 3x2
 */
export const VideoGrid = ({
  localStream,
  localMediaState,
  videoAvailable,
  localName,
  localProfilePicture,
  peers,
}: VideoGridProps): JSX.Element => {
  const peerArray = Array.from(peers.values());
  const totalParticipants = peerArray.length + 1; // +1 for local

  const getGridClass = (): string => {
    if (totalParticipants <= 1) return "meeting-grid--1";
    if (totalParticipants === 2) return "meeting-grid--2";
    if (totalParticipants <= 4) return "meeting-grid--4";
    return "meeting-grid--6";
  };

  return (
    <div className={`meeting-grid ${getGridClass()}`}>
      {/* Local video */}
      <VideoTile
        stream={localStream}
        name={localName}
        profilePictureUrl={localProfilePicture}
        mediaState={localMediaState}
        isLocal
        isVideoAvailable={videoAvailable}
      />

      {/* Remote videos */}
      {peerArray.map((peer) => (
        <VideoTile
          key={peer.userId}
          stream={peer.stream}
          name={peer.name}
          profilePictureUrl={peer.profilePictureUrl}
          mediaState={peer.mediaState}
        />
      ))}
    </div>
  );
};
