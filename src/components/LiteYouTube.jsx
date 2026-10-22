import { useEffect, useRef, useState } from 'react'
import { Play } from 'lucide-react'
import Img from './Img'

// Shows a local thumbnail and only loads YouTube's iframe after the user presses play.
//   portrait  9:16 frame for YouTube Shorts. A portrait thumbnail fills it; an older 4:3 hqdefault
//             thumbnail of a Short is the portrait frame with blurred side bars, so the centred
//             cover crop still shows exactly the Short.
//   priority  the page's LCP image (first video)
export default function LiteYouTube({ video, portrait = false, priority = false, sizes }) {
  const [playing, setPlaying] = useState(false)
  const frame = useRef(null)

  // The play button disappears when the player mounts; hand focus to the player so keyboard and
  // screen reader users are not dropped back to the top of the page.
  useEffect(() => {
    if (playing) frame.current?.focus()
  }, [playing])

  return (
    <div className={`relative overflow-hidden rounded-lg bg-slate-900 ${portrait ? 'aspect-[9/16]' : 'aspect-video'}`}>
      {playing ? (
        <iframe
          ref={frame}
          src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&playsinline=1`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          // The wrapper clips anything outside it, so the focus ring is drawn inside the button.
          className="group focus-ring-inset absolute inset-0 cursor-pointer rounded-[inherit] focus-visible:outline-3"
          aria-label={`Putar video: ${video.title}`}
        >
          <Img
            img={video.thumb}
            priority={priority}
            sizes={sizes}
            alt=""
            className="size-full object-cover transition-opacity group-hover:opacity-90"
          />
          <span
            className="text-accent-600 absolute top-1/2 left-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 shadow-[var(--shadow-card)] transition-colors group-hover:bg-white"
            aria-hidden
          >
            <Play className="ml-0.5 size-5 fill-current" />
          </span>
        </button>
      )}
    </div>
  )
}
