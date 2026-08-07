export default function Pagination({ page = 1, totalPages = 1, onChange }) {
  if (totalPages <= 1) return null;
  return <div className="pagination"><button className="secondary-button" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button><span>Page {page} of {totalPages}</span><button className="secondary-button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</button></div>;
}
