import { useState } from 'react'
import { Play } from 'lucide-react'
import Img from './Img'
// Shows a local thumbnail and only loads YouTube's iframe after the user clicks play.
export default function LiteYouTube({ video }) {
  const [playing, setPlaying] = useState(false)
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
          title={video.title}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0"
          aria-label={`Putar: ${video.title}`}
        >
          <Img
            img={video.thumb}
            alt=""
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <span className="text-accent-500 absolute top-1/2 left-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 shadow-xl transition-transform group-hover:scale-110">
            <Play className="ml-0.5 size-6 fill-current" />
          </span>
        </button>
      )}
    </div>
  )
}
