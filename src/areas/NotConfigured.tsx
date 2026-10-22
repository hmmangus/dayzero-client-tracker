import { Link } from 'react-router-dom';
import { EmptyState } from '../components/States';
import { buttonClass } from '../components/ui';

/** Shown on sign-in pages when this copy of the app isn't connected to a database. */
export function NotConfigured() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-16 dark:bg-slate-950">
      <div className="mx-auto max-w-lg">
        <EmptyState
          as="h1"
          title="Sign-in isn't switched on here"
          description="This copy of the app isn't connected to an online database yet. You can still explore everything in the demo."
          action={
            <Link to="/demo" className={buttonClass('primary')}>
              Open the demo
            </Link>
          }
        />
      </div>
    </div>
  );
}
