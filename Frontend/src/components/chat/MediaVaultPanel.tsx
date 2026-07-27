import { useState, useEffect, useCallback, type JSX } from "react";
import type { VaultItem, VaultCategory } from "../../types";
import { getCaseVaultItems } from "../../services/messageService";
import { Spinner } from "../ui/Spinner";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { ImagePreviewModal } from "./ImagePreviewModal";

interface MediaVaultPanelProps {
  caseId: string;
  onClose: () => void;
  onJumpToMessage: (messageId: string) => void;
}

const TABS: { id: VaultCategory; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "📦" },
  { id: "image", label: "Images", icon: "🖼️" },
  { id: "media", label: "Media", icon: "🎬" },
  { id: "document", label: "Docs", icon: "📄" },
  { id: "link", label: "Links", icon: "🔗" },
];

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const MediaVaultPanel = ({
  caseId,
  onClose,
  onJumpToMessage,
}: MediaVaultPanelProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState<VaultCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<VaultItem | null>(null);

  const fetchVault = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCaseVaultItems(caseId, activeTab, searchQuery);
      setItems(data.items || []);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [caseId, activeTab, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchVault();
    }, 200);

    return () => clearTimeout(timer);
  }, [fetchVault]);

  const handleDownload = async (item: VaultItem) => {
    if (!item.fileUrl) return;
    try {
      const res = await fetch(item.fileUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = item.fileName || "attachment";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(item.fileUrl, "_blank");
    }
  };

  return (
    <aside
      id="media-vault-panel"
      data-testid="media-vault-panel"
      className="w-full md:w-[300px] border-l border-slate-200/80 bg-white/90 backdrop-blur-xl flex flex-col h-full shrink-0 animate-in slide-in-from-right duration-200 z-20"
      aria-label="Files & Media Vault"
    >
      {/* Header */}
      <div className="h-16 border-b border-slate-100 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">
            📁
          </span>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm leading-tight tracking-tight">
              Files & Media
            </h3>
            <p className="text-[11px] font-semibold text-[#5B4CF3]">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-100 shrink-0">
        <div className="relative">
          <input
            type="text"
            data-testid="vault-search-input"
            placeholder="Search vault..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[44px] pl-9 pr-3 text-xs bg-slate-50/70 border border-slate-200/90 rounded-xl focus:outline-none focus:border-[#6C4CF1] focus:bg-white focus:ring-4 focus:ring-[#6C4CF1]/12 text-slate-900 placeholder:text-slate-400 transition-all"
          />
          <span className="absolute left-3 top-3 text-slate-400 text-xs">
            🔍
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2 text-xs text-text-tertiary hover:text-text-primary"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 p-2 border-b border-border overflow-x-auto no-scrollbar shrink-0 bg-surface-secondary/50">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              data-testid={`category-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors
                ${
                  isActive
                    ? "bg-white text-primary shadow-sm border border-border/50 font-semibold"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Body / Content */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Spinner size="md" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4 text-text-tertiary">
            <span className="text-3xl mb-2" aria-hidden="true">
              📭
            </span>
            <p className="text-sm font-medium text-text-secondary">
              No items found
            </p>
            <p className="text-xs mt-1">
              {searchQuery
                ? "Try adjusting your search query"
                : "No files or media shared in this category yet."}
            </p>
          </div>
        ) : activeTab === "image" ? (
          /* Grid View for Images */
          <div className="grid grid-cols-2 gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-lg border border-border overflow-hidden bg-surface-secondary aspect-square flex items-center justify-center cursor-pointer hover:border-primary/50 transition-all"
              >
                <img
                  src={item.fileUrl}
                  alt={item.fileName || "Image attachment"}
                  className="w-full h-full object-cover"
                  onClick={() => setPreviewItem(item)}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  <button
                    type="button"
                    onClick={() => setPreviewItem(item)}
                    className="p-1.5 bg-white/90 rounded-full text-xs text-text-primary hover:bg-white"
                    title="Preview & Annotate"
                  >
                    👁️
                  </button>
                  <button
                    type="button"
                    data-testid={`download-btn-${item.id}`}
                    onClick={() => handleDownload(item)}
                    className="p-1.5 bg-white/90 rounded-full text-xs text-text-primary hover:bg-white"
                    title="Download"
                  >
                    ⬇️
                  </button>
                  <button
                    type="button"
                    onClick={() => onJumpToMessage(item.messageId)}
                    className="p-1.5 bg-white/90 rounded-full text-xs text-text-primary hover:bg-white"
                    title="View in Chat"
                  >
                    💬
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View for Documents, Media, Links, and All */
          <div className="space-y-2">
            {items.map((item) => {
              const isLink = item.type === "link";
              const isDoc = item.type === "document";
              const isImg = item.type === "image";
              const isAudioOrVideo = item.type === "video" || item.type === "audio";

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-border hover:border-primary/40 bg-white hover:bg-surface-secondary/50 transition-all flex flex-col gap-2 group"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="text-xl shrink-0 mt-0.5" aria-hidden="true">
                      {isLink
                        ? "🔗"
                        : isDoc
                          ? "📄"
                          : isImg
                            ? "🖼️"
                            : isAudioOrVideo
                              ? "🎬"
                              : "📎"}
                    </span>
                    <div className="min-w-0 flex-1">
                      {isLink ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline block truncate"
                          title={item.url}
                        >
                          {item.url}
                        </a>
                      ) : (
                        <span
                          className="text-sm font-medium text-text-primary block truncate"
                          title={item.fileName}
                        >
                          {item.fileName}
                        </span>
                      )}

                      <div className="flex items-center gap-2 text-xs text-text-tertiary mt-0.5">
                        {item.sender?.name && <span>{item.sender.name}</span>}
                        {item.createdAt && <span>· {formatDate(item.createdAt)}</span>}
                        {item.fileSize && <span>· {formatFileSize(item.fileSize)}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Item Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                    {(isDoc || isImg) && item.fileUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewItem(item)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors flex items-center gap-1"
                      >
                        <span>👁️</span> Preview & Annotate
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onJumpToMessage(item.messageId)}
                      className="text-xs text-text-secondary hover:text-primary px-2 py-1 rounded hover:bg-surface-hover transition-colors flex items-center gap-1"
                    >
                      <span>💬</span> View in Chat
                    </button>
                    {!isLink && item.fileUrl && (
                      <button
                        type="button"
                        data-testid={`download-btn-${item.id}`}
                        onClick={() => handleDownload(item)}
                        className="text-xs font-medium text-primary hover:bg-primary-light/50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                      >
                        <span>⬇️</span> Download
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Document Preview & Annotation Modal */}
      {previewItem && previewItem.fileUrl && (
        <DocumentPreviewModal
          isOpen={true}
          onClose={() => setPreviewItem(null)}
          fileUrl={previewItem.fileUrl}
          fileName={previewItem.fileName}
          caseId={caseId}
          messageId={previewItem.messageId}
          fileMimeType={previewItem.fileMimeType}
        />
      )}

      {/* Image Preview Modal */}
      {previewImageUrl && (
        <ImagePreviewModal
          isOpen={Boolean(previewImageUrl)}
          imageUrl={previewImageUrl}
          onClose={() => setPreviewImageUrl(null)}
        />
      )}
    </aside>
  );
};
