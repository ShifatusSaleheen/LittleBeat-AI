import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { sendChatMessage } from '../../api/client';
import { useTheme } from '../../theme/ThemeContext';
import type { AnalysisResult } from '../../types/ecg';

interface Msg {
  role: 'user' | 'bot';
  text: string;
}

export function Chatbot({ result }: { result: AnalysisResult }) {
  const { C } = useTheme();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  // Whether "see a cardiologist" has already been said this conversation —
  // each /api/chat call is stateless (no prior turns sent to the model), so
  // this is what keeps the model from repeating the hint every reply. A
  // ref, not state: it doesn't need to trigger a re-render.
  const hintGivenRef = useRef(false);

  useEffect(() => {
    const pred = result.prediction;
    hintGivenRef.current = false;
    setMsgs([
      {
        role: 'bot',
        text: `Your ECG analysis is ready. Main finding: ${pred.class}. I'm an assistant, not a doctor — ask me anything about it.`,
      },
    ]);
  }, [result.record]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, sending]);

  const send = () => {
    if (!input.trim() || sending) return;
    const q = input.trim();
    setMsgs((m) => [...m, { role: 'user', text: q }]);
    setInput('');
    setSending(true);
    const hadHint = hintGivenRef.current;
    hintGivenRef.current = true; // this turn is the model's one chance to say it
    sendChatMessage(result, q, hadHint)
      .then((answer) => setMsgs((m) => [...m, { role: 'bot', text: answer }]))
      .catch(() =>
        setMsgs((m) => [
          ...m,
          { role: 'bot', text: "Sorry, something went wrong answering that. Please try again." },
        ]),
      )
      .finally(() => setSending(false));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: C.dim,
          marginBottom: 8,
        }}
      >
        Explain to patient
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7, paddingRight: 4 }}>
        <AnimatePresence initial={false}>
          {msgs.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                fontSize: 12,
                lineHeight: 1.5,
                padding: '8px 11px',
                borderRadius: 10,
                background: m.role === 'user' ? C.primarySoft : C.panel2,
                border: `1px solid ${m.role === 'user' ? C.primary + '44' : C.line}`,
                color: C.ink,
              }}
            >
              {m.text}
            </motion.div>
          ))}
          {sending && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                alignSelf: 'flex-start',
                display: 'flex',
                gap: 4,
                padding: '10px 13px',
                borderRadius: 10,
                background: C.panel2,
                border: `1px solid ${C.line}`,
              }}
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                  style={{ width: 5, height: 5, borderRadius: '50%', background: C.primary, display: 'block' }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={endRef} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask a question…"
          style={{
            flex: 1,
            background: C.panel2,
            border: `1px solid ${C.line}`,
            borderRadius: 8,
            padding: '8px 11px',
            color: C.ink,
            fontSize: 12,
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <motion.button
          onClick={send}
          disabled={sending}
          whileTap={{ scale: 0.95 }}
          style={{
            border: 'none',
            cursor: sending ? 'default' : 'pointer',
            opacity: sending ? 0.6 : 1,
            background: C.primary,
            color: '#fff',
            borderRadius: 8,
            padding: '0 14px',
            fontWeight: 700,
            fontSize: 12,
            fontFamily: 'inherit',
          }}
        >
          Send
        </motion.button>
      </div>
    </div>
  );
}
