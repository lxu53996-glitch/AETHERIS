'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useSettingsStore, type AIProvider } from '@/lib/store/settingsStore';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const {
    aiProvider,
    ollamaUrl,
    localModel,
    setAIProvider,
    setOllamaUrl,
    setLocalModel,
  } = useSettingsStore();

  // Local form state
  const [formProvider, setFormProvider] = useState<AIProvider>(aiProvider);
  const [formOllamaUrl, setFormOllamaUrl] = useState(ollamaUrl);
  const [formLocalModel, setFormLocalModel] = useState(localModel);

  if (!isOpen) return null;

  const handleSave = () => {
    // Save to store
    setAIProvider(formProvider);
    setOllamaUrl(formOllamaUrl);
    setLocalModel(formLocalModel);
    onClose();
  };

  const handleCancel = () => {
    // Reset form to current store values
    setFormProvider(aiProvider);
    setFormOllamaUrl(ollamaUrl);
    setFormLocalModel(localModel);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-fade-in"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
        <div className="bg-white border-2 border-zinc-900 rounded-md shadow-2xl animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b-2 border-zinc-900 bg-zinc-50">
            <h2 className="text-[14px] uppercase tracking-widest font-sans font-bold text-zinc-900">
              SYSTEM CONFIGURATION
            </h2>
            <button
              onClick={handleCancel}
              className="p-1 hover:bg-zinc-200 rounded transition-colors"
            >
              <X className="w-4 h-4 text-zinc-600" />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 space-y-6">
            {/* Provider Switch */}
            <div className="space-y-2">
              <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-sans font-bold">
                AI Provider
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFormProvider('cloud')}
                  className={`flex-1 px-4 py-2 text-[13px] font-sans font-bold rounded transition-all ${
                    formProvider === 'cloud'
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  CLOUD
                </button>
                <button
                  onClick={() => setFormProvider('local')}
                  className={`flex-1 px-4 py-2 text-[13px] font-sans font-bold rounded transition-all ${
                    formProvider === 'local'
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  LOCAL
                </button>
              </div>
            </div>

            {/* Ollama Settings (Show only when Local) */}
            {formProvider === 'local' && (
              <div className="space-y-4 pt-2 border-t border-zinc-200">
                {/* Endpoint */}
                <div className="space-y-2">
                  <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-sans font-bold">
                    Endpoint
                  </label>
                  <input
                    type="text"
                    value={formOllamaUrl}
                    onChange={(e) => setFormOllamaUrl(e.target.value)}
                    placeholder="http://127.0.0.1:11434"
                    className="w-full px-3 py-2 text-[13px] font-sans border-2 border-zinc-200 rounded focus:border-zinc-900 focus:outline-none transition-colors"
                  />
                  <p className="text-[10px] text-zinc-400 font-sans">
                    Ollama API endpoint URL
                  </p>
                </div>

                {/* Model Name */}
                <div className="space-y-2">
                  <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-sans font-bold">
                    Model Name
                  </label>
                  <input
                    type="text"
                    value={formLocalModel}
                    onChange={(e) => setFormLocalModel(e.target.value)}
                    placeholder="llama3"
                    className="w-full px-3 py-2 text-[13px] font-sans border-2 border-zinc-200 rounded focus:border-zinc-900 focus:outline-none transition-colors"
                  />
                  <p className="text-[10px] text-zinc-400 font-sans">
                    Ollama model identifier (e.g., llama3, mistral)
                  </p>
                </div>
              </div>
            )}

            {/* Cloud Info */}
            {formProvider === 'cloud' && (
              <div className="pt-2 border-t border-zinc-200">
                <p className="text-[12px] text-zinc-500 font-sans leading-relaxed">
                  Using DeepSeek API with configured API key from environment variables.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t-2 border-zinc-900 bg-zinc-50 flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 text-[13px] font-sans font-bold text-zinc-600 bg-white border-2 border-zinc-200 rounded hover:bg-zinc-50 transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 text-[13px] font-sans font-bold text-white bg-zinc-900 rounded hover:bg-zinc-800 transition-colors"
            >
              SAVE CONFIGURATION
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
