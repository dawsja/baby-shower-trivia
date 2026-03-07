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
  "bg-sky-400/30 text-sky-100",
  "bg-violet-400/30 text-violet-100",
  "bg-amber-400/30 text-amber-100",
  "bg-emerald-400/30 text-emerald-100",
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
      <div className="mb-3 flex items-center justify-between text-xs font-semibold tracking-widest text-sky-100">
        <span className="flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5" />
          QUESTION {questionNumber}/{totalQuestions}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {remainingSeconds}s
        </span>
      </div>

      <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/20">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            progress > 30
              ? "bg-gradient-to-r from-cyan-200 to-sky-100"
              : "bg-gradient-to-r from-amber-300 to-red-300"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      <h2 className="text-xl font-bold leading-snug text-white">{question.text}</h2>

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
                  ? "border-white bg-white text-sky-800"
                  : "border-white/30 bg-white/10 text-white hover:bg-white/20"
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
