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
  pinnedUserId?: string | null;
  onTogglePin?: (userId: string | null) => void;
  currentUserId?: string;
}

/**
 * Responsive video grid layout with Screen Share & Pinned Spotlight mode.
 */
export const VideoGrid = ({
  localStream,
  localMediaState,
  videoAvailable,
  localName,
  localProfilePicture,
  peers,
  pinnedUserId,
  onTogglePin,
  currentUserId = "",
}: VideoGridProps): JSX.Element => {
  const peerArray = Array.from(peers.values());
  const totalParticipants = peerArray.length + 1; // +1 for local

  // Check if local or remote peer is sharing screen
  const isLocalScreenSharing = localMediaState.screenShare;
  const screenSharingPeer = peerArray.find((p) => p.mediaState.screenShare);

  // Check for pinned participant
  const pinnedPeer = pinnedUserId ? peerArray.find((p) => p.userId === pinnedUserId) : null;
  const isLocalPinned = pinnedUserId === currentUserId;

  const spotlightUser = isLocalScreenSharing
    ? "local"
    : screenSharingPeer
      ? screenSharingPeer.userId
      : isLocalPinned
        ? "local"
        : pinnedPeer
          ? pinnedPeer.userId
          : null;

  // Spotlight Mode for Screen Sharing or Pinned Tile
  if (spotlightUser) {
    const isMainLocal = spotlightUser === "local";

    return (
      <div className="meeting-spotlight">
        {/* Main featured spotlight tile */}
        <div className="meeting-spotlight__main">
          {isMainLocal ? (
            <VideoTile
              stream={localStream}
              name={localName}
              profilePictureUrl={localProfilePicture}
              mediaState={localMediaState}
              isLocal
              isVideoAvailable={videoAvailable}
              isPinned={isLocalPinned}
              onTogglePin={onTogglePin ? () => onTogglePin(isLocalPinned ? null : currentUserId) : undefined}
            />
          ) : (
            <VideoTile
              stream={screenSharingPeer?.stream || pinnedPeer?.stream || null}
              name={screenSharingPeer?.name || pinnedPeer?.name || "Participant"}
              profilePictureUrl={screenSharingPeer?.profilePictureUrl || pinnedPeer?.profilePictureUrl}
              mediaState={screenSharingPeer?.mediaState || pinnedPeer!.mediaState}
              isPinned={pinnedUserId === (screenSharingPeer?.userId || pinnedPeer?.userId)}
              onTogglePin={onTogglePin ? () => onTogglePin(pinnedUserId === (screenSharingPeer?.userId || pinnedPeer?.userId) ? null : (screenSharingPeer?.userId || pinnedPeer!.userId)) : undefined}
            />
          )}
        </div>

        {/* Thumbnail strip of other participants */}
        <div className="meeting-spotlight__strip">
          {!isMainLocal && (
            <VideoTile
              stream={localStream}
              name={localName}
              profilePictureUrl={localProfilePicture}
              mediaState={localMediaState}
              isLocal
              isVideoAvailable={videoAvailable}
              onTogglePin={onTogglePin ? () => onTogglePin(currentUserId) : undefined}
            />
          )}
          {peerArray
            .filter((p) => p.userId !== (isMainLocal ? "" : spotlightUser))
            .map((peer) => (
              <VideoTile
                key={peer.userId}
                stream={peer.stream}
                name={peer.name}
                profilePictureUrl={peer.profilePictureUrl}
                mediaState={peer.mediaState}
                onTogglePin={onTogglePin ? () => onTogglePin(peer.userId) : undefined}
              />
            ))}
        </div>
      </div>
    );
  }

  // Regular Grid Layout
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
        onTogglePin={onTogglePin ? () => onTogglePin(currentUserId) : undefined}
      />

      {/* Remote videos */}
      {peerArray.map((peer) => (
        <VideoTile
          key={peer.userId}
          stream={peer.stream}
          name={peer.name}
          profilePictureUrl={peer.profilePictureUrl}
          mediaState={peer.mediaState}
          isPinned={pinnedUserId === peer.userId}
          onTogglePin={onTogglePin ? () => onTogglePin(peer.userId) : undefined}
        />
      ))}
    </div>
  );
};
