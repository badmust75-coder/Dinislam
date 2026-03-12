import { Check, Lock, Moon } from "lucide-react";

type DayState = "completed" | "current" | "available" | "locked";

function getDayState(day: any, studentProgress: any[]): DayState {
  if (day.is_locked) return "locked";
  const progress = studentProgress.find((p: any) => p.day_id === day.id);
  if (progress?.quiz_completed) return "completed";
  return "current";
}

function DayCell({ day, state, onClick }: { day: any; state: DayState; onClick: () => void }) {
  const base = "relative flex flex-col items-center justify-center rounded-2xl cursor-pointer select-none";

  if (state === "completed") return (
    <div onClick={onClick} className={`${base} w-16 h-16 bg-green-500`}>
      <Check strokeWidth={3} className="w-8 h-8 text-white" />
      <span className="text-white text-[11px] font-bold absolute bottom-1">{day.day_number}</span>
    </div>
  );
  if (state === "current") return (
    <div onClick={onClick} className={`${base} w-16 h-16`} style={{ backgroundColor: "#f97316" }}>
      <Moon className="w-8 h-8 text-white fill-white" />
      <span className="text-white text-[11px] font-bold absolute bottom-1">{day.day_number}</span>
    </div>
  );
  if (state === "available") return (
    <div onClick={onClick} className={`${base} w-16 h-16 bg-yellow-50 border border-yellow-200`}>
      <Moon className="w-7 h-7 text-gray-400" />
      <span className="text-gray-500 text-[11px] font-bold absolute bottom-1">{day.day_number}</span>
    </div>
  );
  // locked
  return (
    <div className={`${base} w-16 h-16 cursor-not-allowed`} style={{ backgroundColor: "#fef3c7" }}>
      <span className="absolute top-0.5 right-0.5 text-[10px]">🔒</span>
      <Lock className="w-5 h-5" style={{ color: "#d97706" }} />
      <span className="text-[11px] font-bold absolute bottom-1" style={{ color: "#92400e" }}>{day.day_number}</span>
    </div>
  );
}

export function RamadanCalendarGrid({ days, studentProgress, onDayClick }: {
  days: any[];
  studentProgress: any[];
  onDayClick: (day: any) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2 p-3">
      {days.map(day => {
        const state = getDayState(day, studentProgress);
        return (
          <DayCell
            key={day.id}
            day={day}
            state={state}
            onClick={() => !day.is_locked && onDayClick(day)}
          />
        );
      })}
    </div>
  );
}

export default RamadanCalendarGrid;
