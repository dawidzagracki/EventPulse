import { useEffect } from 'react'

/**
 * Auto-scrolls the window when a block drag is near the top/bottom edges of
 * the viewport. Mount once anywhere in the page-builder tree.
 *
 * Only triggers for drags carrying `text/x-block-index` (reorder) or
 * `text/x-block-type` (palette → canvas) so it never interferes with other
 * drag operations like file uploads.
 */
export function useDragAutoScroll() {
  useEffect(() => {
    let scrolling = false
    let raf = 0
    let speed = 0

    function tick() {
      if (!scrolling) return
      window.scrollBy({ top: speed, behavior: 'auto' })
      raf = requestAnimationFrame(tick)
    }

    function onDragOver(e: DragEvent) {
      const types = e.dataTransfer?.types
      if (!types || !(types.includes('text/x-block-index') || types.includes('text/x-block-type'))) return
      const y = e.clientY
      const h = window.innerHeight
      const zone = 100 // px from each edge that triggers scroll
      let nextSpeed = 0
      if (y < zone) nextSpeed = -Math.ceil(((zone - y) / zone) * 18)
      else if (y > h - zone) nextSpeed = Math.ceil(((y - (h - zone)) / zone) * 18)
      speed = nextSpeed
      if (speed !== 0 && !scrolling) {
        scrolling = true
        raf = requestAnimationFrame(tick)
      } else if (speed === 0 && scrolling) {
        scrolling = false
        cancelAnimationFrame(raf)
      }
    }

    function onEnd() {
      scrolling = false
      cancelAnimationFrame(raf)
      speed = 0
    }

    document.addEventListener('dragover', onDragOver)
    document.addEventListener('dragend', onEnd)
    document.addEventListener('drop', onEnd)
    return () => {
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('dragend', onEnd)
      document.removeEventListener('drop', onEnd)
      cancelAnimationFrame(raf)
    }
  }, [])
}
