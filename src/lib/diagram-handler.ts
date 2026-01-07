// /lib/diagram-handler.ts
export function getDiagramUrl(diagramId: string | null): string | null {
  if (!diagramId) return null;
  
  // In production, this would be CDN URL
  return `/diagrams/${diagramId}.png`;
}

export function getDiagramFallback(): string {
  return '/images/diagram-placeholder.svg';
}

// React component
function QuestionDiagram({ diagramId }: { diagramId: string | null }) {
  const [imageError, setImageError] = useState(false);
  
  if (!diagramId) return null;
  
  const src = imageError 
    ? getDiagramFallback() 
    : getDiagramUrl(diagramId);
  
  return (
    <div className="my-4">
      <img
        src={src}
        alt="Question diagram"
        onError={() => setImageError(true)}
        className="max-w-full h-auto border rounded"
      />
      {imageError && (
        <p className="text-sm text-gray-500 mt-2">
          Diagram temporarily unavailable
        </p>
      )}
    </div>
  );
}