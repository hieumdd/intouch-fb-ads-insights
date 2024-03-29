import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import Joi from 'joi';
import ndjson from 'ndjson';

import { createLoadStream } from '../bigquery/bigquery.service';
import { createTasks } from '../task/cloud-tasks.service';
import { getAccounts } from './account.service';
import { ReportOptions, get } from './insights.service';
import * as pipelines from './pipeline.const';

dayjs.extend(utc);

export const runPipeline = async (reportOptions: ReportOptions, pipeline_: pipelines.Pipeline) => {
    const stream = await get(reportOptions, pipeline_.insightsConfig);

    await pipeline(
        stream,
        new Transform({
            objectMode: true,
            transform: (row, _, callback) => {
                callback(null, {
                    ...Joi.attempt(row, pipeline_.validationSchema),
                    _batched_at: dayjs.utc().toISOString(),
                });
            },
        }),
        ndjson.stringify(),
        createLoadStream({
            table: `p_${pipeline_.name}__${reportOptions.accountId}`,
            schema: [...pipeline_.schema, { name: '_batched_at', type: 'TIMESTAMP' }],
            writeDisposition: 'WRITE_APPEND',
        }),
    );

    return true;
};

export type CreatePipelineTasksOptions = {
    start?: string;
    end?: string;
};

export const createPipelineTasks = async ({ start, end }: CreatePipelineTasksOptions) => {
    const BUSINESSES = ['176030634338306', '301608467133745'];

    const accounts = await Promise.all(
        BUSINESSES.map((businessId) => {
            return getAccounts(businessId).then((accounts) => {
                return accounts.map((account) => ({ ...account, business_id: businessId }));
            });
        }),
    ).then((accounts) => accounts.flat());

    return Promise.all([
        createTasks(
            Object.keys(pipelines).flatMap((pipeline) => {
                return accounts.map((account) => ({
                    accountId: account.account_id,
                    start,
                    end,
                    pipeline,
                }));
            }),
            (task) => [task.pipeline, task.accountId].join('-'),
        ),
        pipeline(
            Readable.from(
                accounts.map((account) => ({
                    account_name: account.name,
                    account_id: account.account_id,
                    business_id: account.business_id,
                })),
            ),
            ndjson.stringify(),
            createLoadStream({
                table: `Accounts`,
                schema: [
                    { name: 'account_name', type: 'STRING' },
                    { name: 'account_id', type: 'INT64' },
                    { name: 'business_id', type: 'INT64' },
                ],
                writeDisposition: 'WRITE_TRUNCATE',
            }),
        ),
    ]);
};
