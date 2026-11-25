'use client';

import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button, Select, Modal } from '@/components/ui';
import { MessageSquarePlus, CheckCircle } from 'lucide-react';

const FEEDBACK_TYPES = [
  { value: 'suggestion', label: '💡 Suggestion / idea' },
  { value: 'bug', label: '🐛 Something is broken' },
  { value: 'compliment', label: '❤️ Compliment' },
  { value: 'other', label: 'Other' },
];

/**
 * Floating "Feedback" button, mounted app-wide on the dashboard. Opens a modal
 * that inserts into the `feedback` table (migration 021). The owner reviews
 * submissions from the backend.
 */
export function FeedbackButton() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const reset = () => {
    setType('suggestion');
    setMessage('');
    setDone(false);
    setError(null);
  };
  const close = () => {
    if (!submitting) {
      setOpen(false);
      reset();
    }
  };

  const submit = async () => {
    if (!message.trim()) {
      setError('Please enter a message.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { error: insertError } = await (supabase as any).from('feedback').insert({
        user_id: user.id,
        type,
        message: message.trim(),
        page_url: typeof window !== 'undefined' ? window.location.pathname : null,
      });
      if (insertError) throw insertError;
      setDone(true);
    } catch {
      setError('Could not send your feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        className="fixed z-40 right-4 inline-flex min-h-11 min-w-11 items-center gap-2 rounded-full bg-primary-600 px-4 py-3 text-white shadow-lg transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <MessageSquarePlus className="h-5 w-5" />
        <span className="hidden text-sm font-medium sm:inline">Feedback</span>
      </button>

      <Modal open={open} onClose={close} title="Send feedback">
        {done ? (
          <div className="py-6 text-center">
            <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-600" />
            <p className="font-medium text-gray-900">Thank you!</p>
            <p className="mt-1 text-sm text-gray-500">Your feedback was sent.</p>
            <div className="mt-6">
              <Button onClick={close}>Close</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Select
              label="Type"
              options={FEEDBACK_TYPES}
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
            <div>
              <label htmlFor="feedback-message" className="mb-1 block text-sm font-medium text-gray-700">
                Message
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Tell us what's on your mind…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={close} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting ? 'Sending…' : 'Send feedback'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
