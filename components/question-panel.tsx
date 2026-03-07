type QuestionPanelProps = {
  questionNumber: number;
  totalQuestions: number;
  question: { text: string; options: string[] };
  timeRemainingMs: number;
  selectedAnswer: number | null;
  onAnswer: (index: number) => void;
};

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
        <span>
          QUESTION {questionNumber}/{totalQuestions}
        </span>
        <span>{remainingSeconds}s</span>
      </div>

      <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-200 to-sky-100 transition-all"
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
              className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                selected
                  ? "border-white bg-white text-sky-800"
                  : "border-white/30 bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <span className="mr-2 text-xs text-sky-200">{String.fromCharCode(65 + index)}</span>
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
