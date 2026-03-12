import { useState } from "react";
import { Check, Lock, Moon } from "lucide-react";

type DayState = "completed" | "current" | "available" | "locked";

function getDayState(day: any, studentProgress: any[]): DayState {
  if (day.is_locked) return "locked";
  const progress = studentProgress.find((p: any) => p.day_id === day.id);
  if (progress?.quiz_completed) return "completed";
  return "current";
}

function DayCell({ day, state, isNextDay, onClick, onNextDayClick }: { day: any; state: DayState; isNextDay: boolean; onClick: () => void; onNextDayClick: () => void }) {
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

  // Locked - next day variant (orange)
  if (isNextDay) return (
    <div onClick={onNextDayClick} className={`${base} w-16 h-16`} style={{ backgroundColor: "#f97316" }}>
      <span className="absolute top-0.5 right-0.5 text-[10px]">🔒</span>
      <Lock className="w-5 h-5 text-white" />
      <span className="text-white text-[11px] font-bold absolute bottom-1">{day.day_number}</span>
    </div>
  );

  // Locked default
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
  const [showPatientMessage, setShowPatientMessage] = useState(false);

  // Find the max completed day number
  const completedDayNumbers = days
    .filter(d => studentProgress.some(p => p.day_id === d.id && p.quiz_completed))
    .map(d => d.day_number);
  const maxCompleted = completedDayNumbers.length > 0 ? Math.max(...completedDayNumbers) : 0;

  return (
    <>
      <div className="grid grid-cols-5 gap-2 p-3">
        {days.map(day => {
          const state = getDayState(day, studentProgress);
          const isNextDay = state === "locked" && day.day_number === maxCompleted + 1;
          return (
            <DayCell
              key={day.id}
              day={day}
              state={state}
              isNextDay={isNextDay}
              onClick={() => !day.is_locked && onDayClick(day)}
              onNextDayClick={() => setShowPatientMessage(true)}
            />
          );
        })}
      </div>

      {showPatientMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowPatientMessage(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 text-center max-w-xs w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-5xl mb-3">⏳</div>
            <div className="text-3xl mb-2">🌙✨</div>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#f97316" }}>
              Le musulman est patient !
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              Tu pourras faire le jour suivant<br />
              <strong>demain après 16h !</strong><br />
              En attendant...
            </p>
            <div className="text-4xl mb-3">🍊🥗🤲</div>
            <p className="text-xl font-bold" style={{ color: "#10b981" }}>
              Saha Ftourek ! 🌟
            </p>
            <button
              onClick={() => setShowPatientMessage(false)}
              className="mt-4 px-6 py-2 rounded-full text-white text-sm font-bold"
              style={{ backgroundColor: "#f97316" }}
            >
              OK, je patiente 💪
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default RamadanCalendarGrid;
