import { z } from 'zod';
import { clientSchema } from './client';
import { progressLogSchema } from './progressLog';
import { checkInSchema } from './checkIn';

export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Everything the app stores, in one versioned envelope. This is also the
 * export/import file format.
 */
export const datasetSchema = z
  .object({
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    clients: z.array(clientSchema),
    progressLogs: z.array(progressLogSchema),
    checkIns: z.array(checkInSchema),
  })
  .superRefine((data, ctx) => {
    const clientIds = new Set(data.clients.map((c) => c.id));
    if (clientIds.size !== data.clients.length) {
      ctx.addIssue({ code: 'custom', message: 'Duplicate client ids', path: ['clients'] });
    }
    data.progressLogs.forEach((log, i) => {
      if (!clientIds.has(log.clientId)) {
        ctx.addIssue({ code: 'custom', message: `Unknown clientId ${log.clientId}`, path: ['progressLogs', i, 'clientId'] });
      }
    });
    data.checkIns.forEach((checkIn, i) => {
      if (!clientIds.has(checkIn.clientId)) {
        ctx.addIssue({ code: 'custom', message: `Unknown clientId ${checkIn.clientId}`, path: ['checkIns', i, 'clientId'] });
      }
    });
  });

export type Dataset = z.infer<typeof datasetSchema>;

export const emptyDataset = (): Dataset => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  clients: [],
  progressLogs: [],
  checkIns: [],
});
