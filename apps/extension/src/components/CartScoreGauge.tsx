interface GaugeScore {
  score: number
  grade: string
  color: string
  totalItems?: number
}

interface Props {
  cartScore: GaugeScore
}

export function CartScoreGauge({ cartScore }: Props) {
  const { score, grade, color, totalItems } = cartScore
  const circumference = 2 * Math.PI * 54
  const progress = (score / 100) * circumference
  const dashOffset = circumference - progress

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <svg width="140" height="140" viewBox="0 0 120 120">
        <circle
          cx="60" cy="60" r="54"
          fill="none"
          stroke="#047857"
          strokeWidth="10"
        />
        <circle
          cx="60" cy="60" r="54"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}
        />
        <text x="60" y="55" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold">
          {score}
        </text>
        <text x="60" y="75" textAnchor="middle" fill={color} fontSize="16" fontWeight="600">
          {grade}
        </text>
      </svg>
      {totalItems !== undefined && (
        <p className="text-center text-sm text-gray-400">
          Cart Score &middot; {totalItems} items
        </p>
      )}
    </div>
  )
}
