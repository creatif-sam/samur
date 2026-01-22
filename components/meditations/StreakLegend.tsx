{/* Streak Legend */}
<div className="mt-4 rounded-md border bg-muted/30 p-3 text-xs space-y-2">
  <p className="font-medium uppercase tracking-wide text-muted-foreground">
    Legend
  </p>

  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
    <div className="flex items-center gap-2">
      <span>😈</span>
      <span>No meditation</span>
    </div>

    <div className="flex items-center gap-2">
      <span>🔥</span>
      <span>Completed</span>
    </div>

    <div className="flex items-center gap-2">
      <span>🌅</span>
      <span>Morning 12:00 AM to 11:59 AM</span>
    </div>

    <div className="flex items-center gap-2">
      <span>🌙</span>
      <span>Evening 12:00 PM to 11:59 PM</span>
    </div>

    <div className="flex items-center gap-2">
      <span>🔥🔥🔥</span>
      <span>3 day streak or more</span>
    </div>

    <div className="flex items-center gap-2">
      <span>👑</span>
      <span>Perfect week</span>
    </div>
  </div>

  <div className="pt-2 text-muted-foreground">
    Tap fire to animate. Tap a day to view meditations.
  </div>
</div>
