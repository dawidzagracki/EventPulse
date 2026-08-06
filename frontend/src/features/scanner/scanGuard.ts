/**
 * Tells a genuinely new presentation of a QR code apart from the camera still looking at one it
 * already handled.
 *
 * The scanner decodes two to four frames a second, so a guest holding their phone up produces a
 * burst of identical reads. Only the first is a real scan; every repeat comes back from the server
 * as "already scanned" — a warning about a guest who was in fact scanned once, by this very gesture.
 *
 * The window is refreshed on every sighting, so it means "this code has been OUT of frame for a
 * while", not "N seconds since the first read". That distinction is the whole fix: the previous
 * guard measured from the first read and was *shorter* than the on-screen feedback, so it expired
 * while the guest was still holding the code up and the operator's screen had already cleared.
 * Production shows exactly that — phantom repeats landing 2.55–2.57 s apart, one camera tick after
 * a 2.5 s guard.
 *
 * The window is sized from that same data rather than guessed. A marginal code does not decode on
 * every frame: the worst observed gap between two reads of one code still held up to the camera was
 * 5.2 s, so anything shorter leaves the bug alive for exactly the codes that scan badly — which are
 * the ones an operator re-presents. 8 s clears that with margin. The cost is that re-presenting the
 * same code within 8 s is ignored, which no operator does on purpose; typing the token into manual
 * entry always forces a fresh answer.
 */
export const CODE_GONE_MS = 8000

export class ScanGuard {
  private readonly seen = new Map<string, number>()

  /**
   * True when this read should be acted on. Repeats return false for as long as the code keeps
   * being seen, and for CODE_GONE_MS after it finally leaves the frame.
   */
  accept(token: string, now: number): boolean {
    const previous = this.seen.get(token)
    this.seen.set(token, now)

    // Forget codes that left the frame long ago, so a whole shift on one device cannot grow this
    // without bound. Deleting during Map iteration is well defined.
    for (const [code, at] of this.seen) {
      if (now - at > CODE_GONE_MS) {
        this.seen.delete(code)
      }
    }

    return previous === undefined || now - previous >= CODE_GONE_MS
  }
}
