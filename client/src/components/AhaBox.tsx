interface Props {
  text: string
}

export default function AhaBox({ text }: Props) {
  return (
    <div className="mt-6 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex gap-2">
      <span className="text-lg leading-none mt-0.5">💡</span>
      <div>
        <span className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Aha! </span>
        <span className="text-amber-700 dark:text-amber-200 text-sm">{text}</span>
      </div>
    </div>
  )
}
