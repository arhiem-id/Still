import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="w-full py-3 px-4 border border-hairline-light dark:border-hairline-dark bg-paper-low dark:bg-ink-low flex items-center justify-between gap-3 text-left hover:border-still-taupe transition-colors cursor-pointer"
      >
        <div className="min-w-0">
          <p className="font-mono text-[9.5px] tracking-[0.12em] text-still-taupe">
            OFFLINE APP · INSTALLABLE
          </p>
          <p className="text-[12.5px] font-medium mt-0.5 truncate">
            Install STILL. on your device
          </p>
        </div>
        <span className="px-2.5 py-1.5 bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink text-[10.5px] font-medium tracking-[0.06em] inline-flex items-center gap-1.5 shrink-0">
          <Download className="w-3 h-3" strokeWidth={1.7} />
          <span>Install</span>
        </span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="w-full py-3 px-4 border border-hairline-light dark:border-hairline-dark bg-paper-low dark:bg-ink-low flex items-center justify-between gap-3 text-left hover:border-still-taupe transition-colors cursor-pointer"
        >
          <div className="min-w-0">
            <p className="font-mono text-[9.5px] tracking-[0.12em] text-still-taupe">
              OFFLINE APP · SAFARI
            </p>
            <p className="text-[12.5px] font-medium mt-0.5 truncate">
              Add STILL. to Home Screen
            </p>
          </div>
          <span className="font-mono text-[10px] tracking-[0.08em] text-still-taupe shrink-0">
            GUIDE →
          </span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Install STILL. on iOS"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-6"
          >
            <div className="w-full max-w-[360px] bg-still-paper dark:bg-still-ink border border-hairline-light dark:border-hairline-dark p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[9.5px] tracking-[0.12em] text-still-taupe">
                    INSTALL ON IPHONE / IPAD
                  </p>
                  <h3 className="font-serif text-[22px] mt-1">
                    Add STILL. to Home Screen
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Close install guide"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper cursor-pointer"
                >
                  <X className="w-4 h-4" strokeWidth={1.6} />
                </button>
              </div>
              <ol className="mt-4 space-y-2 text-[13px] leading-[1.6] text-muted-ink dark:text-muted-paper list-decimal list-inside">
                <li>
                  Tap the <strong className="text-still-ink dark:text-still-paper font-medium">Share</strong> icon in Safari&apos;s toolbar.
                </li>
                <li>
                  Scroll down and tap{' '}
                  <strong className="text-still-ink dark:text-still-paper font-medium">
                    Add to Home Screen
                  </strong>
                  .
                </li>
                <li>
                  Tap <strong className="text-still-ink dark:text-still-paper font-medium">Add</strong> to launch STILL. full-screen offline.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full h-10 bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink text-xs font-medium tracking-[0.06em] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
