import Editor from '@monaco-editor/react';
import type { Language } from '../types.ts';

interface Props {
  value: string;
  onChange: (value: string) => void;
  language: Language;
  readOnly?: boolean;
  height?: string;
}

const langMap: Record<Language, string> = {
  python: 'python',
  javascript: 'javascript',
};

export function CodeEditor({ value, onChange, language, readOnly = false, height = '400px' }: Props) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <Editor
        height={height}
        language={langMap[language]}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        options={{
          readOnly,
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          tabSize: 2,
        }}
        theme="vs-dark"
      />
    </div>
  );
}
