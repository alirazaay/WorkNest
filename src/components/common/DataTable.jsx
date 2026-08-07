import EmptyState from './EmptyState.jsx';
import LoadingState from './LoadingState.jsx';

export default function DataTable({ columns = [], rows = [], loading = false, emptyTitle = 'No records found', rowKey = row => row.id }) {
  if (loading) return <LoadingState />;
  if (!rows.length) return <EmptyState title={emptyTitle} />;
  return <div className="table-scroll"><table className="data-table"><thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={rowKey(row)}>{columns.map(column => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}</tr>)}</tbody></table></div>;
}
