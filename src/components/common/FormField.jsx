export default function FormField({ label, error, hint, children, required = false }) {
  return <div className="form-field"><label>{label}{required && <span aria-hidden="true"> *</span>}{children}</label>{hint && !error && <small className="field-hint">{hint}</small>}{error && <small className="field-error" role="alert">{error}</small>}</div>;
}
