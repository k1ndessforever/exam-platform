// /components/ExamStartButton.tsx
export function ExamStartButton({ examId }: { examId: string }) {
  const [validation, setValidation] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  
  const checkExamReadiness = async () => {
    setChecking(true);
    const res = await fetch(`/api/exam/${examId}/validate`);
    const data = await res.json();
    setValidation(data);
    setChecking(false);
    
    if (data.isReady) {
      // Proceed to exam
      window.location.href = `/exam/${examId}/start`;
    }
  };
  
  return (
    <div>
      <button
        onClick={checkExamReadiness}
        disabled={checking}
        className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold"
      >
        {checking ? 'Checking...' : 'Start Exam'}
      </button>
      
      {validation && !validation.isReady && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-bold text-red-800 mb-2">
            ⚠️ Exam Not Available
          </h4>
          <ul className="text-sm text-red-700 space-y-1">
            {validation.errors.map((error: string, idx: number) => (
              <li key={idx}>• {error}</li>
            ))}
          </ul>
          <p className="text-sm text-red-600 mt-3">
            Please contact admin or try a different exam.
          </p>
        </div>
      )}
    </div>
  );
}