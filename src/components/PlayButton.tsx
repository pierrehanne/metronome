import { Play, Square } from 'lucide-react'

interface PlayButtonProps {
  isPlaying: boolean
  onToggle: () => void
}

/**
 * The primary transport control.
 *
 * State is conveyed by the icon and the accessible label as well as by colour,
 * so it does not rely on colour alone.
 */
export function PlayButton({ isPlaying, onToggle }: PlayButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isPlaying}
      aria-label={isPlaying ? 'Stop metronome' : 'Start metronome'}
      className={[
        'flex size-20 items-center justify-center rounded-full border-2 transition-all duration-150 active:scale-95 sm:size-24',
        isPlaying
          ? 'border-accent bg-accent text-accent-ink'
          : 'border-line-strong bg-surface-raised text-ink hover:border-accent hover:text-accent',
      ].join(' ')}
    >
      {isPlaying ? (
        <Square
          aria-hidden
          className="size-8 sm:size-9"
          fill="currentColor"
          strokeWidth={0}
        />
      ) : (
        // Nudged right to visually centre the triangle inside the circle.
        <Play
          aria-hidden
          className="ml-1 size-9 sm:size-10"
          fill="currentColor"
          strokeWidth={0}
        />
      )}
    </button>
  )
}
