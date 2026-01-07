export default function QuestionsPage() { return <div>Questions</div>; }
'use client';

import { useState } from 'react';

export default function AdminQuestions() {
  const [form, setForm] = useState({
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    subject: 'Physics',
    difficulty: 'Medium',
    topic: ''
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    
    alert('Question added!');
    // Reset form
  };
  
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Add Question</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          placeholder="Question Text"
          value={form.questionText}
          onChange={e => setForm({ ...form, questionText: e.target.value })}
          className="w-full p-3 border rounded-lg"
          rows={4}
        />
        
        {['A', 'B', 'C', 'D'].map(opt => (
          <input
            key={opt}
            type="text"
            placeholder={`Option ${opt}`}
            value={form[`option${opt}` as keyof typeof form]}
            onChange={e => setForm({ ...form, [`option${opt}`]: e.target.value })}
            className="w-full p-3 border rounded-lg"
          />
        ))}
        
        <select
          value={form.correctOption}
          onChange={e => setForm({ ...form, correctOption: e.target.value })}
          className="w-full p-3 border rounded-lg"
        >
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
        
        <select
          value={form.subject}
          onChange={e => setForm({ ...form, subject: e.target.value })}
          className="w-full p-3 border rounded-lg"
        >
          <option value="Physics">Physics</option>
          <option value="Chemistry">Chemistry</option>
          <option value="Mathematics">Mathematics</option>
        </select>
        
        <select
          value={form.difficulty}
          onChange={e => setForm({ ...form, difficulty: e.target.value })}
          className="w-full p-3 border rounded-lg"
        >
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
        
        <input
          type="text"
          placeholder="Topic"
          value={form.topic}
          onChange={e => setForm({ ...form, topic: e.target.value })}
          className="w-full p-3 border rounded-lg"
        />
        
        <button
          type="submit"
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold"
        >
          Add Question
        </button>
      </form>
    </div>
  );
}