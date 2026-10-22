import { Link } from 'react-router-dom';
import type { Client } from '../../schemas';
import { usePortalStatus } from '../../hooks';
import { useArea } from '../../components/Area';
import { Badge } from '../../components/Badge';
import { useToast } from '../../components/Toast';
import { buttonClass, cardClass } from '../../components/ui';

/** Shows whether a client can use the portal, and what to send them. */
export function PortalAccessCard({ client }: { client: Client }) {
  const area = useArea();
  const status = usePortalStatus(client.id);
  const notify = useToast();
  const signInLink = `${window.location.origin}/auth/sign-in?as=client`;
  const firstName = client.name.split(' ')[0];
  const email = status.data && 'email' in status.data ? status.data.email : null;

  const copyInvite = async (email: string) => {
    const message =
      `Hi ${firstName}! You can now log your daily progress and weekly check-ins here: ${signInLink}\n` +
      `Sign in with ${email}. You'll get an email with a sign-in link (no password needed).`;
    try {
      await navigator.clipboard.writeText(message);
      notify('Invite message copied');
    } catch {
      notify("Couldn't copy. Select the link and copy it instead.", 'error');
    }
  };

  return (
    <section aria-labelledby="portal-heading" className={`${cardClass} p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="portal-heading" className="font-semibold text-slate-900 dark:text-white">
          Client portal
        </h2>
        {status.data?.kind === 'active' && <Badge tone="green">Active</Badge>}
        {status.data?.kind === 'invited' && <Badge tone="amber">Not signed in yet</Badge>}
      </div>

      {status.status === 'loading' && <p className="mt-2 text-sm text-slate-500">Checking…</p>}

      {status.data?.kind === 'demo' && (
        <>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            In the live app, {firstName} signs in with their email to log daily data, send weekly check-ins and read your replies.
          </p>
          {area.portalPreviewPath && (
            <Link to={area.portalPreviewPath} className={buttonClass('secondary', 'mt-3')}>
              Preview the client portal
            </Link>
          )}
        </>
      )}

      {status.data?.kind === 'no-email' && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Add an email address under Profile & targets to let {firstName} use the portal.
        </p>
      )}

      {email && (
        <>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {status.data?.kind === 'active'
              ? `${firstName} has signed in with ${email}.`
              : `${firstName} can sign in at the link below with ${email}.`}
          </p>
          <p className="mt-2 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 dark:bg-slate-950 dark:text-slate-300">{signInLink}</p>
          <button type="button" className={buttonClass('secondary', 'mt-3')} onClick={() => copyInvite(email)}>
            Copy invite message
          </button>
        </>
      )}
    </section>
  );
}
