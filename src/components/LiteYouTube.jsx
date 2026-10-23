import { useEffect, useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { readableTitle } from '../lib/format'
import Img from './Img'

// Shows a local thumbnail and only loads YouTube's iframe after the user presses play.
//   portrait  9:16 frame for YouTube Shorts. A portrait thumbnail fills it; an older 4:3 hqdefault
//             thumbnail of a Short is the portrait frame with blurred side bars, so the centred
//             cover crop still shows exactly the Short.
//   priority  the page's LCP image (first video)
//   className sizing of the frame (width/max-width); the aspect ratio is fixed
// Playback belongs to one video: passing a different `video` (or a new `key`) shows its thumbnail
// again instead of keeping the previous player running.
export default function LiteYouTube({ video, portrait = false, priority = false, sizes, className = '' }) {
  const [playingId, setPlayingId] = useState(null)
  const playing = playingId === video.id
  const frame = useRef(null)
  const title = readableTitle(video.title)

  // The play button disappears when the player mounts; hand focus to the player so keyboard and
  // screen reader users are not dropped back to the top of the page.
  useEffect(() => {
    if (playing) frame.current?.focus()
  }, [playing])

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-slate-900 ${portrait ? 'aspect-[9/16]' : 'aspect-video'} ${className}`}
    >
      {playing ? (
        <iframe
          ref={frame}
          src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&playsinline=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlayingId(video.id)}
          // The wrapper clips anything outside it, so the focus ring is drawn inside the button.
          className="group focus-ring-inset absolute inset-0 cursor-pointer rounded-[inherit] focus-visible:outline-3"
          aria-label={`Putar video: ${title}`}
        >
          <Img
            img={video.thumb}
            priority={priority}
            sizes={sizes}
            alt=""
            className="size-full object-cover transition-opacity group-hover:opacity-90"
          />
          <span
            className="group-hover:bg-accent-600 absolute top-1/2 left-1/2 grid h-9 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg bg-black/70 text-white transition-colors"
            aria-hidden
          >
            <Play className="size-4 fill-current" />
          </span>
        </button>
      )}
    </div>
  )
}
