export interface MediaDeviceInfoSimple {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export interface SupportStatus {
  webRTC: boolean;
  mediaDevices: boolean;
  sinkId: boolean;
  pictureInPicture: boolean;
}

/**
 * Check browser feature support.
 */
export const checkBrowserSupport = (): SupportStatus => {
  const webRTC = typeof RTCPeerConnection !== "undefined";
  const mediaDevices = Boolean(navigator?.mediaDevices?.getUserMedia);
  const sinkId = "setSinkId" in HTMLMediaElement.prototype;
  const pictureInPicture = "pictureInPictureEnabled" in document || "requestPictureInPicture" in HTMLVideoElement.prototype;

  return {
    webRTC,
    mediaDevices,
    sinkId,
    pictureInPicture,
  };
};

/**
 * Get list of available input and output devices.
 */
export const getAvailableDevices = async (): Promise<{
  audioInputs: MediaDeviceInfoSimple[];
  videoInputs: MediaDeviceInfoSimple[];
  audioOutputs: MediaDeviceInfoSimple[];
}> => {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return { audioInputs: [], videoInputs: [], audioOutputs: [] };
    }

    const devices = await navigator.mediaDevices.enumerateDevices();

    const audioInputs = devices
      .filter((d) => d.kind === "audioinput")
      .map((d, idx) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${idx + 1}`,
        kind: d.kind,
      }));

    const videoInputs = devices
      .filter((d) => d.kind === "videoinput")
      .map((d, idx) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${idx + 1}`,
        kind: d.kind,
      }));

    const audioOutputs = devices
      .filter((d) => d.kind === "audiooutput")
      .map((d, idx) => ({
        deviceId: d.deviceId,
        label: d.label || `Speaker ${idx + 1}`,
        kind: d.kind,
      }));

    return { audioInputs, videoInputs, audioOutputs };
  } catch (error) {
    console.error("Failed to enumerate devices:", error);
    return { audioInputs: [], videoInputs: [], audioOutputs: [] };
  }
};

/**
 * Change audio output device for a media element (speaker selection).
 */
export const setAudioOutputDevice = async (
  element: HTMLMediaElement,
  deviceId: string,
): Promise<boolean> => {
  try {
    if ("setSinkId" in element) {
      // @ts-ignore
      await element.setSinkId(deviceId);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to set audio output device:", error);
    return false;
  }
};
