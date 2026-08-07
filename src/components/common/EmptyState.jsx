export default function EmptyState({ title = 'Nothing here yet', description = 'There are no records to display.', action = null }) {
  return <div className="state-message empty-state"><h2>{title}</h2><p>{description}</p>{action}</div>;
}
