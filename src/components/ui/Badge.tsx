interface Props {
  status: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}

export function Badge({ status, tone }: Props) {
  return (
    <span className={`badge badge-${tone}`}>
      <span aria-hidden="true" className="badge-dot" />
      {status}
    </span>
  );
}
