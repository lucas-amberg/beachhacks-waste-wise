import { getGrade } from '../scoring'

interface Props {
  score: number
  size?: 'sm' | 'md'
}

export function ScoreBadge({ score, size = 'sm' }: Props) {
  const { color } = getGrade(score)
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'

  return (
    <span
      className={`rounded-full font-bold ${sizeClasses}`}
      style={{ backgroundColor: color + '20', color }}
    >
      {score}
    </span>
  )
}
