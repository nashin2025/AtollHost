import { EmptyState } from '../components/ui/States';

interface Props {
  title: string;
  description: string;
  screenIds?: string[];
}

export function FeaturePlaceholder({ title, description, screenIds }: Props) {
  return (
    <section className="feature-placeholder" aria-labelledby="page-heading">
      <h1 id="page-heading">{title}</h1>
      <p className="page-description">{description}</p>
      {screenIds && (
        <p className="screen-ids">
          Specified screens: {screenIds.join(', ')}
        </p>
      )}
      <EmptyState
        title="Not built yet"
        message="This module is on the implementation backlog. See TASKS.md for the phased plan and exit criteria."
      />
    </section>
  );
}
