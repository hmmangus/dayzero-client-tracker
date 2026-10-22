import { Link, useNavigate } from 'react-router-dom';
import { useRepository } from '../../repositories';
import { PageHeader } from '../../components/PageHeader';
import { useToast } from '../../components/Toast';
import { Icon } from '../../components/Icon';
import { cardClass } from '../../components/ui';
import { ClientForm } from './ClientForm';
import { useAreaPath } from '../../components/Area';

export function NewClientPage() {
  const repository = useRepository();
  const navigate = useNavigate();
  const notify = useToast();
  const path = useAreaPath();

  return (
    <>
      <Link to={path('/clients')} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
        <Icon name="chevronLeft" className="h-4 w-4" />
        Clients
      </Link>
      <PageHeader title="New client" />
      <div className={`${cardClass} p-5`}>
        <ClientForm
          showStage
          submitLabel="Create client"
          onCancel={() => navigate(-1)}
          onSubmit={async (values) => {
            try {
              const client = await repository.createClient(values);
              notify(`${client.name} added`);
              navigate(path(`/clients/${client.id}`));
            } catch {
              notify("Couldn't save the client", 'error');
            }
          }}
        />
      </div>
    </>
  );
}
