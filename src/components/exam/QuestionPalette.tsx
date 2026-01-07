interface QuestionPaletteProps {
  questionIds: string[];
  currentIndex: number;
  answers: Record<string, string | null>;
  markedForReview: Set<string>;
  onQuestionSelect: (index: number) => void;
}

export function QuestionPalette({
  questionIds,
  currentIndex,
  answers,
  markedForReview,
  onQuestionSelect,
}: QuestionPaletteProps) {
  const getQuestionStatus = (index: number) => {
    const questionId = questionIds[index];
    const isAnswered = answers[questionId] !== null && answers[questionId] !== undefined;
    const isMarked = markedForReview.has(questionId);
    const isCurrent = index === currentIndex;
    
    if (isCurrent) return 'bg-blue-600 text-white';
    if (isAnswered && isMarked) return 'bg-yellow-500 text-white';
    if (isAnswered) return 'bg-green-500 text-white';
    if (isMarked) return 'bg-yellow-200 text-yellow-800';
    return 'bg-gray-200 text-gray-700 hover:bg-gray-300';
  };
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
      <h4 className="font-bold text-gray-900 mb-4">Question Palette</h4>
      
      <div className="grid grid-cols-5 gap-2 mb-6">
        {questionIds.map((_, index) => (
          <button
            key={index}
            onClick={() => onQuestionSelect(index)}
            className={`w-10 h-10 rounded-lg font-semibold text-sm transition ${getQuestionStatus(index)}`}
          >
            {index + 1}
          </button>
        ))}
      </div>
      
      <div className="space-y-2 text-sm border-t pt-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-green-500 rounded"></div>
          <span>Answered ({Object.values(answers).filter(Boolean).length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-yellow-200 rounded"></div>
          <span>Marked ({markedForReview.size})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gray-200 rounded"></div>
          <span>Not Visited</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-blue-600 rounded"></div>
          <span>Current</span>
        </div>
      </div>
    </div>
  );
}