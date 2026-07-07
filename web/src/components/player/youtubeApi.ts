let apiPromise: Promise<void> | null = null;

/** Loads the YouTube IFrame Player API once and resolves when `YT` is ready. */
export function loadYouTubeApi(): Promise<void> {
  const w = window as unknown as {
    YT?: { Player: unknown };
    onYouTubeIframeAPIReady?: () => void;
  };
  if (w.YT && w.YT.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<void>((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return apiPromise;
}
