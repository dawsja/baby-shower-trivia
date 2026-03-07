import { Clock, HelpCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type QuestionPanelProps = {
  questionNumber: number;
  totalQuestions: number;
  question: { text: string; options: string[] };
  timeRemainingMs: number;
  selectedAnswer: number | null;
  onAnswer: (index: number) => void;
};

const letterColors = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
];

export function QuestionPanel({
  questionNumber,
  totalQuestions,
  question,
  timeRemainingMs,
  selectedAnswer,
  onAnswer,
}: QuestionPanelProps) {
  const remainingSeconds = Math.ceil(timeRemainingMs / 1000);
  const progress = Math.max(0, Math.min(100, (timeRemainingMs / 20000) * 100));

  return (
    <div className="card-glass p-4">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold tracking-widest text-blue-700">
        <span className="flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5" />
          QUESTION {questionNumber}/{totalQuestions}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {remainingSeconds}s
        </span>
      </div>

      <div className="mb-3 h-2 overflow-hidden rounded-full bg-blue-100">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            progress > 30
              ? "bg-gradient-to-r from-blue-400 to-sky-300"
              : "bg-gradient-to-r from-amber-300 to-red-300"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      <h2 className="text-xl font-bold leading-snug text-slate-800">{question.text}</h2>

      <div className="mt-4 grid gap-3">
        {question.options.map((option, index) => {
          const selected = selectedAnswer === index;
          return (
            <button
              key={option}
              onClick={() => onAnswer(index)}
              disabled={selectedAnswer !== null}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
                selected
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-blue-200 bg-white/80 text-slate-700 hover:bg-blue-50"
              )}
            >
              <span className={cn("badge-rank text-[11px]", letterColors[index] ?? letterColors[0])}>
                {String.fromCharCode(65 + index)}
              </span>
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
