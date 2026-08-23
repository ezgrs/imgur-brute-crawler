import { useEffect, useMemo, useState } from "react"
import type React from "react"
import {
  AlertCircle,
  ArrowDownToLine,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileImage,
  Image as ImageIcon,
  Info,
  Maximize2,
  RefreshCw,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const MINIO_BASE_URL = "http://192.168.18.34:9000"
const BACKEND_URL = "http://192.168.18.34:8080"
const PAGE_SIZE = 24

interface ImageItem {
  id: string
  width: number
  height: number
  mimeType: string
}

interface ApiResponse {
  content: ImageItem[]
  number: number
  totalPages: number
  totalElements: number
  first: boolean
  last: boolean
}

export default function ImageGallery() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null)

  const fetchImages = async (pageNumber: number) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${BACKEND_URL}/images?page=${pageNumber}&size=${PAGE_SIZE}`,
      )

      if (!response.ok) {
        throw new Error(`Erro ${response.status}`)
      }

      const json: ApiResponse = await response.json()
      setData(json)
      setPage(pageNumber)
      return json
    } catch (err) {
      console.error("Failed to load images:", err)
      setError("Unable to load images.")
      return null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchImages(0)
  }, [])

  const getThumbnailUrl = (id: string) => `${MINIO_BASE_URL}/thumbnails/${id}`
  const getImageUrl = (id: string) => `${MINIO_BASE_URL}/images/${id}`
  const getImgurUrl = (id: string) => `https://imgur.com/${id.split(".")[0]}`

  const handleDownload = async (id: string, mimeType: string) => {
    const extension = mimeType.split("/")[1] || "jpg"
    const url = getImageUrl(id)

    try {
      const res = await fetch(url)

      if (!res.ok) {
        throw new Error(`Erro ${res.status}`)
      }

      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = `${id}.${extension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error("Failed to download image:", err)
    }
  }

  const selectedIndex = data?.content.findIndex(
    (item) => item.id === selectedImage?.id,
  )
  const canOpenPrevious = Boolean(
    data &&
      selectedImage &&
      selectedIndex !== undefined &&
      selectedIndex >= 0 &&
      (selectedIndex > 0 || !data.first),
  )
  const canOpenNext = Boolean(
    data &&
      selectedImage &&
      selectedIndex !== undefined &&
      selectedIndex >= 0 &&
      (selectedIndex < data.content.length - 1 || !data.last),
  )

  const navigateSelectedImage = async (direction: "previous" | "next") => {
    if (
      !data ||
      !selectedImage ||
      selectedIndex === undefined ||
      selectedIndex < 0
    ) {
      return
    }

    if (direction === "previous") {
      if (selectedIndex > 0) {
        setSelectedImage(data.content[selectedIndex - 1])
        return
      }

      if (!data.first) {
        const previousPage = await fetchImages(data.number - 1)
        const previousImage = previousPage?.content.at(-1)

        if (previousImage) {
          setSelectedImage(previousImage)
        }
      }

      return
    }

    if (selectedIndex < data.content.length - 1) {
      setSelectedImage(data.content[selectedIndex + 1])
      return
    }

    if (!data.last) {
      const nextPage = await fetchImages(data.number + 1)
      const nextImage = nextPage?.content[0]

      if (nextImage) {
        setSelectedImage(nextImage)
      }
    }
  }

  const hasImages = Boolean(data?.content.length)
  const currentRange = useMemo(() => {
    if (!data || data.totalElements === 0) {
      return "0 images"
    }

    const first = data.number * PAGE_SIZE + 1
    const last = Math.min((data.number + 1) * PAGE_SIZE, data.totalElements)
    return `${first}-${last} of ${data.totalElements}`
  }, [data])

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <div className="mx-auto flex min-h-screen w-full max-w-[1920px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-20 -mx-4 border-b border-neutral-200/80 bg-neutral-50/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-left text-xl font-semibold tracking-normal text-neutral-950 sm:text-2xl">
                Imgurdex
              </h1>
              <p className="mt-1 text-left text-sm text-neutral-500">
                {loading && !data ? "Loading images..." : currentRange}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchImages(page)}
                disabled={loading}
                title="Refresh"
              >
                <RefreshCw className={loading ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              {data && (
                <PaginationController
                  data={data}
                  loading={loading}
                  onPageChange={fetchImages}
                />
              )}
            </div>
          </div>
        </header>

        <section className="flex flex-1 flex-col py-4 sm:py-5">
          {loading && !data && <GallerySkeleton />}

          {error && !loading && (
            <EmptyState
              icon={<AlertCircle className="h-6 w-6" />}
              title="Failed to load"
              description={error}
              action={
                <Button size="sm" onClick={() => fetchImages(page)}>
                  Try again
                </Button>
              }
            />
          )}

          {!loading && !error && !hasImages && (
            <EmptyState
              icon={<ImageIcon className="h-6 w-6" />}
              title="No images found"
              description="Images returned by the backend will appear here."
            />
          )}

          {data && hasImages && (
            <div
              aria-busy={loading}
              className="grid flex-1 grid-cols-2 gap-2.5 transition-opacity sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8"
            >
              {data.content.map((item) => (
                <ImageTile
                  key={item.id}
                  item={item}
                  imageUrl={getImageUrl(item.id)}
                  thumbnailUrl={getThumbnailUrl(item.id)}
                  onDownload={handleDownload}
                  onSelect={() => setSelectedImage(item)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedImage && (
        <ImageDetailsDialog
          key={selectedImage.id}
          image={selectedImage}
          imageUrl={getImageUrl(selectedImage.id)}
          imgurUrl={getImgurUrl(selectedImage.id)}
          onClose={() => setSelectedImage(null)}
          onDownload={handleDownload}
          onPrevious={() => navigateSelectedImage("previous")}
          onNext={() => navigateSelectedImage("next")}
          canPrevious={canOpenPrevious}
          canNext={canOpenNext}
          navigating={loading}
        />
      )}
    </main>
  )
}

type ImageTileProps = {
  item: ImageItem
  thumbnailUrl: string
  imageUrl: string
  onDownload: (id: string, mimeType: string) => void
  onSelect: () => void
}

function ImageTile({
  item,
  thumbnailUrl,
  imageUrl,
  onDownload,
  onSelect,
}: ImageTileProps) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <Card className="group aspect-square overflow-hidden rounded-md border-neutral-200 bg-white p-0 shadow-none ring-0 transition duration-200 hover:border-neutral-300 hover:shadow-sm">
      <CardContent className="relative h-full w-full bg-neutral-100 p-0">
        <button
          type="button"
          className="block h-full w-full text-left"
          onClick={onSelect}
          aria-label={`Open details for image ${item.id}`}
        >
          {!imageFailed ? (
            <img
              src={thumbnailUrl}
              alt={`Image ${item.id}`}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-300">
              <ImageIcon className="h-9 w-9" />
            </div>
          )}
        </button>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-linear-to-t from-black/65 via-black/20 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <div className="min-w-0 text-left text-[11px] leading-tight text-white/85">
            <div className="truncate font-medium text-white">{item.id}</div>
            <div>
              {item.width} x {item.height}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="icon-sm"
              variant="secondary"
              className="rounded-full bg-white/95 text-neutral-950 shadow-sm hover:bg-white"
              onClick={() => window.open(imageUrl, "_blank")}
              title="Open in new tab"
            >
              <ExternalLink />
            </Button>

            <Button
              size="icon-sm"
              variant="secondary"
              className="rounded-full bg-white/95 text-neutral-950 shadow-sm hover:bg-white"
              onClick={() => onDownload(item.id, item.mimeType)}
              title="Download image"
            >
              <Download />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

type ImageDetailsDialogProps = {
  image: ImageItem
  imageUrl: string
  imgurUrl: string
  onClose: () => void
  onDownload: (id: string, mimeType: string) => void
  onPrevious: () => void
  onNext: () => void
  canPrevious: boolean
  canNext: boolean
  navigating: boolean
}

function ImageDetailsDialog({
  image,
  imageUrl,
  imgurUrl,
  onClose,
  onDownload,
  onPrevious,
  onNext,
  canPrevious,
  canNext,
  navigating,
}: ImageDetailsDialogProps) {
  const [copied, setCopied] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const megapixels = ((image.width * image.height) / 1_000_000).toFixed(2)
  const fileExtension = image.mimeType.split("/")[1]?.toUpperCase() || "IMG"

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }

      if (event.key === "ArrowLeft" && canPrevious && !navigating) {
        event.preventDefault()
        onPrevious()
      }

      if (event.key === "ArrowRight" && canNext && !navigating) {
        event.preventDefault()
        onNext()
      }
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [canNext, canPrevious, navigating, onClose, onNext, onPrevious])

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(imageUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch (err) {
      console.error("Failed to copy URL:", err)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-details-title"
      onMouseDown={onClose}
    >
      <div
        className="grid max-h-[94vh] w-full max-w-7xl overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-white/10 lg:grid-cols-[minmax(0,1fr)_360px]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="relative flex min-h-[48vh] items-center justify-center bg-neutral-950 lg:min-h-[760px]">
          {!imageFailed ? (
            <img
              src={imageUrl}
              alt={`Image ${image.id}`}
              className="max-h-[62vh] w-full object-contain lg:max-h-[94vh]"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-neutral-400">
              <ImageIcon className="h-12 w-12" />
              <span className="text-sm">Unable to display this image.</span>
            </div>
          )}

          <Button
            size="icon"
            variant="secondary"
            className="absolute right-3 top-3 rounded-full bg-white/95 text-neutral-950 shadow-lg hover:bg-white lg:hidden"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <X />
          </Button>

          <Button
            size="icon"
            variant="secondary"
            className="absolute left-3 top-1/2 size-10 -translate-y-1/2 rounded-full bg-white/95 text-neutral-950 shadow-lg hover:bg-white disabled:opacity-30 sm:left-4"
            onClick={onPrevious}
            disabled={!canPrevious || navigating}
            aria-label="Previous image"
            title="Previous image"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <Button
            size="icon"
            variant="secondary"
            className="absolute right-3 top-1/2 size-10 -translate-y-1/2 rounded-full bg-white/95 text-neutral-950 shadow-lg hover:bg-white disabled:opacity-30 sm:right-4"
            onClick={onNext}
            disabled={!canNext || navigating}
            aria-label="Next image"
            title="Next image"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          {navigating && (
            <div className="absolute bottom-3 left-1/2 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white/85 backdrop-blur-sm -translate-x-1/2">
              Loading...
            </div>
          )}
        </div>

        <aside className="flex min-h-0 flex-col border-t border-neutral-200 bg-white lg:border-l lg:border-t-0">
          <div className="flex items-start justify-between gap-3 border-b border-neutral-200 p-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">
                Image details
              </p>
              <h2
                id="image-details-title"
                className="mt-1 truncate text-lg font-semibold text-neutral-950"
                title={image.id}
              >
                {image.id}
              </h2>
            </div>

            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onClose}
              aria-label="Close"
              title="Close"
              className="hidden lg:inline-flex"
            >
              <X />
            </Button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <div className="grid grid-cols-3 gap-2">
              <InfoCard
                icon={<Maximize2 className="h-4 w-4" />}
                label="Dimensions"
                value={`${image.width} x ${image.height}`}
              />
              <InfoCard
                icon={<FileImage className="h-4 w-4" />}
                label="Type"
                value={fileExtension}
              />
              <InfoCard
                icon={<Info className="h-4 w-4" />}
                label="MP"
                value={megapixels}
              />
            </div>

            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">
                Actions
              </p>
              <div className="grid gap-2">
                <Button
                  size="lg"
                  className="h-10 justify-start rounded-md"
                  onClick={() => window.open(imageUrl, "_blank")}
                >
                  <ExternalLink />
                  Open in new tab
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="h-10 justify-start rounded-md bg-white"
                  onClick={() => onDownload(image.id, image.mimeType)}
                >
                  <ArrowDownToLine />
                  Download image
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="h-10 justify-start rounded-md bg-white"
                  onClick={() => window.open(imgurUrl, "_blank")}
                >
                  <ExternalLink />
                  Open on Imgur
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-neutral-200 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">
                Direct URL
              </p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md bg-neutral-100 px-2 py-1.5 text-xs text-neutral-700">
                  {imageUrl}
                </code>
                <Button
                  size="icon-sm"
                  variant="outline"
                  className="bg-white"
                  onClick={copyUrl}
                  aria-label="Copy URL"
                  title="Copy URL"
                >
                  <Copy />
                </Button>
              </div>
              {copied && (
                <p className="mt-2 text-xs font-medium text-neutral-600">
                  URL copied.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

type InfoCardProps = {
  icon: React.ReactNode
  label: string
  value: string
}

function InfoCard({ icon, label, value }: InfoCardProps) {
  return (
    <div className="min-w-0 rounded-md border border-neutral-200 bg-white p-3">
      <div className="mb-2 text-neutral-400">{icon}</div>
      <div className="truncate text-sm font-semibold text-neutral-950">
        {value}
      </div>
      <div className="mt-0.5 truncate text-xs text-neutral-500">{label}</div>
    </div>
  )
}

type PaginationControllerProps = {
  data: ApiResponse
  onPageChange: (pageNumber: number) => Promise<ApiResponse | null>
  loading: boolean
}

function PaginationController({
  data,
  onPageChange,
  loading,
}: PaginationControllerProps) {
  const currentPage = data.number
  const totalPages = data.totalPages

  if (totalPages <= 1) {
    return null
  }

  return (
    <nav className="flex items-center gap-1" aria-label="Pagination">
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onPageChange(Math.max(currentPage - 1, 0))}
        disabled={data.first || loading}
        aria-label="Previous page"
        title="Previous page"
      >
        <ChevronLeft />
      </Button>

      <span className="min-w-20 px-2 text-center text-sm text-neutral-600">
        {currentPage + 1} / {totalPages}
      </span>

      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages - 1))}
        disabled={data.last || loading}
        aria-label="Next page"
        title="Next page"
      >
        <ChevronRight />
      </Button>
    </nav>
  )
}

function GallerySkeleton() {
  return (
    <div className="grid flex-1 grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
      {Array.from({ length: PAGE_SIZE }, (_, index) => (
        <div
          key={index}
          className="aspect-square animate-pulse rounded-md bg-neutral-200/80"
        />
      ))}
    </div>
  )
}

type EmptyStateProps = {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}

function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
          <p className="mt-1 text-sm text-neutral-500">{description}</p>
        </div>
        {action}
      </div>
    </div>
  )
}
