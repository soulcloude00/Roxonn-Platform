import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

// Load custom icon font CSS
if (typeof window !== 'undefined') {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/video-js-icons.css';
  if (!document.querySelector(`link[href="${link.href}"]`)) {
    document.head.appendChild(link);
  }
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  onReady?: (player: any) => void;
  maxDuration?: number; // Maximum duration in seconds (for preview mode)
  isPreview?: boolean; // Whether this is a preview video
  onPreviewEnd?: () => void; // Callback when preview ends
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  onReady,
  maxDuration,
  isPreview = false,
  onPreviewEnd
}) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const previewEndedRef = useRef<boolean>(false);

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current) {
      const videoElement = document.createElement('video-js');
      videoElement.classList.add('vjs-big-play-centered');

      if (videoRef.current) {
        videoRef.current.appendChild(videoElement);
      }

      const player = playerRef.current = videojs(videoElement, {
        controls: true,
        responsive: true,
        fluid: true,
        preload: 'metadata', // Changed from 'auto' to 'metadata' for faster initial load
        poster: poster,
        controlBar: {
          skipButtons: {
            forward: 10,
            backward: 10
          }
        },
        playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
        html5: {
          vhs: {
            enableLowInitialPlaylist: true,
            smoothQualityChange: true,
            overrideNative: true
          },
          nativeVideoTracks: false,
          nativeAudioTracks: false,
          nativeTextTracks: false
        },
        // Optimize buffering
        liveui: false,
        liveTracker: {
          trackingThreshold: 0
        }
      }, () => {
        player.src({
          src,
          type: 'video/mp4',
        });
        if (onReady) {
          onReady(player);
        }
      });

      // If this is a preview with max duration, enforce the limit
      if (isPreview && maxDuration && maxDuration > 0) {
        let lastCheckedTime = 0;
        const checkInterval = 0.5; // Check every 0.5 seconds instead of on every timeupdate

        player.on('timeupdate', () => {
          const currentTime = player.currentTime();

          // Only check at intervals to reduce frequency
          if (currentTime - lastCheckedTime < checkInterval && currentTime < maxDuration) {
            return;
          }
          lastCheckedTime = currentTime;

          // If user seeks forward beyond max duration, reset to max duration
          if (currentTime > maxDuration) {
            player.currentTime(maxDuration);
            player.pause();

            // Trigger preview end callback only once
            if (!previewEndedRef.current && onPreviewEnd) {
              previewEndedRef.current = true;
              onPreviewEnd();
            }
          }

          // If reached max duration during normal playback
          if (currentTime >= maxDuration - 0.1 && !player.paused()) {
            player.pause();

            // Trigger preview end callback only once
            if (!previewEndedRef.current && onPreviewEnd) {
              previewEndedRef.current = true;
              onPreviewEnd();
            }
          }
        });

        // Also prevent seeking beyond maxDuration
        player.on('seeking', () => {
          const currentTime = player.currentTime();
          if (currentTime > maxDuration) {
            player.currentTime(maxDuration);
          }
        });
      }
    } else {
      // Update the source if it changes
      const player = playerRef.current;
      player.src({ src, type: 'video/mp4' });
      if (poster) {
        player.poster(poster);
      }

      // Reset preview ended flag when source changes
      previewEndedRef.current = false;
    }
  }, [src, poster, onReady, maxDuration, isPreview, onPreviewEnd]);

  // Dispose the Video.js player when the component unmounts
  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  return (
    <div data-vjs-player>
      <div ref={videoRef} className="rounded-lg overflow-hidden" />
    </div>
  );
};

export default VideoPlayer;

