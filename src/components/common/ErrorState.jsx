export default function ErrorState({ message = 'Unable to load this content.', onRetry }) {
  return <div className="state-message error-state" role="alert"><h2>Something went wrong</h2><p>{message}</p>{onRetry && <button className="secondary-button" onClick={onRetry}>Try again</button>}</div>;
}
