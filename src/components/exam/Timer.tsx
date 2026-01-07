interface TimerProps {
  formattedTime: string;
  isExpired: boolean;
}

export function Timer({ formattedTime, isExpired }: TimerProps) {
  return (
    <div className={`flex items-center gap-2 ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="font-mono text-2xl font-bold">
        {formattedTime}
      </span>
    </div>
  );
}