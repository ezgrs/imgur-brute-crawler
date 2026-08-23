import { useEffect, useMemo, useState } from "react"
import type React from "react"
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Image as ImageIcon,
  RefreshCw,
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

  const fetchImages = async (pageNumber: number) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${BACKEND_URL}/images?page=${pageNumber}&size=${PAGE_SIZE}`,
      )

      if (!response.ok) {
        throw new Error(`${response.status} error`)
      }

      const json: ApiResponse = await response.json()
      setData(json)
    } catch (err) {
      console.error("Failed to load images:", err)
      setError("Failed to load images.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchImages(page)
  }, [page])

  const getThumbnailUrl = (id: string) => `${MINIO_BASE_URL}/thumbnails/${id}`
  const getImageUrl = (id: string) => `${MINIO_BASE_URL}/images/${id}`

  const handleDownload = async (id: string, mimeType: string) => {
    const extension = mimeType.split("/")[1] || "jpg"
    const url = getImageUrl(id)

    try {
      const res = await fetch(url)

      if (!res.ok) {
        throw new Error(`${res.status} error`)
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
      console.error("Error while downloading image:", err)
    }
  }

  const hasImages = Boolean(data?.content.length)
  const currentRange = useMemo(() => {
    if (!data || data.totalElements === 0) {
      return "No images"
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
                  setPage={setPage}
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
                  Tentar novamente
                </Button>
              }
            />
          )}

          {!loading && !error && !hasImages && (
            <EmptyState
              icon={<ImageIcon className="h-6 w-6" />}
              title="No image found"
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
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

type ImageTileProps = {
  item: ImageItem
  thumbnailUrl: string
  imageUrl: string
  onDownload: (id: string, mimeType: string) => void
}

function ImageTile({ item, thumbnailUrl, imageUrl, onDownload }: ImageTileProps) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <Card className="group aspect-square overflow-hidden rounded-md border-neutral-200 bg-white p-0 shadow-none ring-0 transition duration-200 hover:border-neutral-300 hover:shadow-sm">
      <CardContent className="relative h-full w-full bg-neutral-100 p-0">
        {!imageFailed ? (
          <img
            src={thumbnailUrl}
            alt={`${item.id} image`}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-300">
            <ImageIcon className="h-9 w-9" />
          </div>
        )}

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
              title="View"
            >
              <Eye />
            </Button>

            <Button
              size="icon-sm"
              variant="secondary"
              className="rounded-full bg-white/95 text-neutral-950 shadow-sm hover:bg-white"
              onClick={() => onDownload(item.id, item.mimeType)}
              title="Download"
            >
              <Download />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

type PaginationControllerProps = {
  data: ApiResponse
  setPage: React.Dispatch<React.SetStateAction<number>>
  loading: boolean
}

function PaginationController({
  data,
  setPage,
  loading,
}: PaginationControllerProps) {
  const currentPage = data.number
  const totalPages = data.totalPages

  if (totalPages <= 1) {
    return null
  }

  return (
    <nav className="flex items-center gap-1" aria-label="Paginação">
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
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
        onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
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
