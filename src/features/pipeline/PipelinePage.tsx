import { Link } from 'react-router-dom';
import { useClients, useToday } from '../../hooks';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { Icon } from '../../components/Icon';
import { buttonClass } from '../../components/ui';
import { PipelineBoard } from './PipelineBoard';

export function PipelinePage() {
  const clients = useClients();
  const today = useToday();

  const newClient = (
    <Link to="/clients/new" className={buttonClass('primary')}>
      <Icon name="plus" className="h-4 w-4" />
      New client
    </Link>
  );

  return (
    <>
      <PageHeader title="Pipeline" description="Drag the handle on a card to move a client to a new stage." actions={newClient} />
      {clients.status === 'loading' && <LoadingState label="Loading pipeline…" />}
      {clients.status === 'error' && <ErrorState error={clients.error} onRetry={clients.refresh} />}
      {clients.status === 'success' &&
        (clients.data.length === 0 ? (
          <EmptyState title="No clients yet" description="Add your first lead to start tracking your pipeline." action={newClient} />
        ) : (
          <PipelineBoard clients={clients.data} today={today} />
        ))}
    </>
  );
}
