'use client'

import React from 'react'

export function TaskBasics({
  text,
  end,
  hour,
  onTextChange,
  onEndChange,
}: {
  text: string
  end: number
  hour: number
  onTextChange: (v: string) => void
  onEndChange: (v: number) => void
}) {
  return (
    <div className="space-y-2">
      <input
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Task"
        className="w-full border rounded-lg p-2 text-sm"
      />

      <select
        value={end}
        onChange={(e) => onEndChange(Number(e.target.value))}
        className="w-full border rounded-lg p-2 text-sm"
      >
        {Array.from({ length: 6 }, (_, i) => hour + i + 1).map(
          (h) => (
            <option key={h} value={h}>
              Ends at {h}:00
            </option>
          )
        )}
      </select>
    </div>
  )
}
