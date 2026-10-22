import site from '../data/site.json'
import { useVideos } from '../lib/data'
import PageHeader from '../components/PageHeader'
import LiteYouTube from '../components/LiteYouTube'
import Seo from '../components/Seo'
import { YouTubeIcon } from '../components/icons'

export default function Videos() {
  const { data } = useVideos()
  const channel = site.socials.find((s) => s.name === 'youtube')?.url

  return (
    <>
      <Seo
        title="Video Review"
        description="Unboxing, komparasi, dan review HP terbaru dari channel YouTube Complete Selular."
      />
      <PageHeader title="Video Review" subtitle="Unboxing, komparasi, dan rekomendasi HP dari channel YouTube kami.">
        {channel && (
          <a
            href={channel}
            target="_blank"
            rel="noopener"
            className="btn mt-6 bg-[#ff0000] text-white hover:bg-[#d90000]"
          >
            <YouTubeIcon className="size-5" /> Subscribe channel
          </a>
        )}
      </PageHeader>
      <div className="container-page py-10">
        <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {data
            ? data.map((v) => (
                <div key={v.id}>
                  <LiteYouTube video={v} />
                  <h3 className="mt-3 line-clamp-2 font-semibold text-slate-900">{v.title}</h3>
                </div>
              ))
            : Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton aspect-video rounded-2xl" />)}
        </div>
      </div>
    </>
  )
}
