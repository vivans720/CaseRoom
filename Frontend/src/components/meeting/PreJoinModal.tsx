import { useEffect, useRef, useState, type JSX } from "react";
import { getAvailableDevices, type MediaDeviceInfoSimple } from "../../utils/deviceUtils";
import { Avatar } from "../ui/Avatar";

interface PreJoinModalProps {
  isOpen: boolean;
  onJoin: () => void;
  onCancel: () => void;
  userName: string;
  userProfilePicture?: string | null;
  caseTitle?: string;
}

export const PreJoinModal = ({
  isOpen,
  onJoin,
  onCancel,
  userName,
  userProfilePicture,
  caseTitle,
}: PreJoinModalProps): JSX.Element | null => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);

  const [devices, setDevices] = useState<{
    audioInputs: MediaDeviceInfoSimple[];
    videoInputs: MediaDeviceInfoSimple[];
    audioOutputs: MediaDeviceInfoSimple[];
  }>({ audioInputs: [], videoInputs: [], audioOutputs: [] });

  const [selectedMic, setSelectedMic] = useState<string>("");
  const [selectedCam, setSelectedCam] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize media & devices
  useEffect(() => {
    if (!isOpen) return;

    let localMediaStream: MediaStream | null = null;

    const init = async () => {
      try {
        const available = await getAvailableDevices();
        setDevices(available);
        if (available.audioInputs.length > 0) setSelectedMic(available.audioInputs[0].deviceId);
        if (available.videoInputs.length > 0) setSelectedCam(available.videoInputs[0].deviceId);

        localMediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        setStream(localMediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = localMediaStream;
          videoRef.current.play().catch(() => {});
        }

        // Setup audio level meter
        const audioCtx = new AudioContext();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(localMediaStream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateMeter = () => {
          analyser.getByteFrequencyData(dataArray);
          const sum = dataArray.reduce((acc, val) => acc + val, 0);
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(updateMeter);
        };
        updateMeter();
      } catch (err) {
        console.error("Failed to access media in PreJoinModal:", err);
      }
    };

    init();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (localMediaStream) localMediaStream.getTracks().forEach((t) => t.stop());
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => (t.enabled = !isMicOn));
    }
    setIsMicOn(!isMicOn);
  };

  const toggleCam = () => {
    if (stream) {
      stream.getVideoTracks().forEach((t) => (t.enabled = !isCamOn));
    }
    setIsCamOn(!isCamOn);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col text-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-base">Ready to join meeting?</h2>
            {caseTitle && (
              <p className="text-xs text-slate-400 font-medium">Case: {caseTitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-white transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Video Preview */}
        <div className="relative aspect-video bg-black/50 overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!isCamOn ? "hidden" : ""}`}
          />
          {!isCamOn && (
            <div className="flex flex-col items-center gap-3">
              <Avatar name={userName} src={userProfilePicture} size="xl" />
              <span className="text-xs font-semibold text-slate-400">Camera is off</span>
            </div>
          )}

          {/* Controls overlay on preview */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
            <button
              type="button"
              onClick={toggleMic}
              className={`p-2.5 rounded-full text-sm font-bold transition-all ${
                isMicOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-rose-500 text-white"
              }`}
            >
              {isMicOn ? "🎙️ Mic On" : "🔇 Mic Off"}
            </button>
            <button
              type="button"
              onClick={toggleCam}
              className={`p-2.5 rounded-full text-sm font-bold transition-all ${
                isCamOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-rose-500 text-white"
              }`}
            >
              {isCamOn ? "📹 Cam On" : "📷 Cam Off"}
            </button>
          </div>
        </div>

        {/* Mic Volume Level Bar */}
        <div className="px-6 pt-3 flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400 w-16">Mic Level:</span>
          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-75"
              style={{ width: `${isMicOn ? audioLevel : 0}%` }}
            />
          </div>
        </div>

        {/* Device Selectors */}
        <div className="p-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">
                Microphone
              </label>
              <select
                value={selectedMic}
                onChange={(e) => setSelectedMic(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {devices.audioInputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId} className="bg-slate-900 text-white">
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">
                Camera
              </label>
              <select
                value={selectedCam}
                onChange={(e) => setSelectedCam(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {devices.videoInputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId} className="bg-slate-900 text-white">
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onJoin}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5B4CF3] to-[#8B2EFF] text-xs font-extrabold text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            Join Meeting Now
          </button>
        </div>
      </div>
    </div>
  );
};
