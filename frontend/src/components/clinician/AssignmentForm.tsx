"use client";

import { useState } from "react";
import { Send, AlertCircle } from "lucide-react";
import { api } from "@/lib/api-client";

interface AssignmentFormProps {
  clientId: string;
  clientName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AssignmentForm({ clientId, clientName, onSuccess, onCancel }: AssignmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const promptText = formData.get("prompt") as string;
    const dueDate = formData.get("dueDate") as string;
    const promptType = formData.get("category") as any;

    try {
      await api.post("/assignments", {
        clientId,
        title,
        clinicianNote: description,
        promptText,
        promptType,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to create assignment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-wg-background rounded-2xl p-6 shadow-lg border border-wg-charcoal/5">
      <div className="mb-6">
        <h2 className="text-xl font-serif font-bold text-wg-charcoal">Assign Homework</h2>
        <p className="text-wg-charcoal/60">Creating an exercise for {clientName}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-wg-charcoal mb-1">
            Assignment Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            placeholder="e.g., Morning Reflection"
            className="w-full px-4 py-2 rounded-xl border border-wg-charcoal/10 focus:outline-none focus:ring-2 focus:ring-wg-primary/50"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-wg-charcoal mb-1">
            Instructions
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={2}
            placeholder="What should the client do?"
            className="w-full px-4 py-2 rounded-xl border border-wg-charcoal/10 focus:outline-none focus:ring-2 focus:ring-wg-primary/50"
          />
        </div>

        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-wg-charcoal mb-1">
            Response Prompt
          </label>
          <textarea
            id="prompt"
            name="prompt"
            required
            rows={3}
            placeholder="What question should they answer?"
            className="w-full px-4 py-2 rounded-xl border border-wg-charcoal/10 focus:outline-none focus:ring-2 focus:ring-wg-primary/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-wg-charcoal mb-1">
              Due Date
            </label>
            <input
              type="date"
              id="dueDate"
              name="dueDate"
              required
              className="w-full px-4 py-2 rounded-xl border border-wg-charcoal/10 focus:outline-none focus:ring-2 focus:ring-wg-primary/50"
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-wg-charcoal mb-1">
              Category (Optional)
            </label>
            <select
              id="category"
              name="category"
              className="w-full px-4 py-2 rounded-xl border border-wg-charcoal/10 focus:outline-none focus:ring-2 focus:ring-wg-primary/50"
            >
              <option value="reflection">Reflection</option>
              <option value="journal">Journal</option>
              <option value="checklist">Checklist</option>
              <option value="scale">Scale</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-wg-error text-sm bg-wg-error/10 p-3 rounded-xl">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl border border-wg-charcoal/10 text-wg-charcoal hover:bg-wg-charcoal/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-wg-primary text-white px-4 py-2 rounded-xl hover:bg-wg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send size={18} />
                <span>Send to Client</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
