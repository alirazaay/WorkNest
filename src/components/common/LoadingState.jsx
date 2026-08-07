export default function LoadingState({ label = 'Loading…' }) {
  return <div className="state-message loading-state" role="status" aria-live="polite"><span className="loading-spinner" aria-hidden="true" />{label}</div>;
}
