import Joi from 'joi';

import { load } from '../bigquery/bigquery.service';
import { createTasks } from '../task/cloud-tasks.service';
import { getAccounts } from './account.service';
import { ReportOptions, get } from './insights.service';
import * as pipelines from './pipeline.const';

export const runPipeline = async (reportOptions: ReportOptions, pipeline: pipelines.Pipeline) => {
    return get(reportOptions, pipeline.insightsOptions)
        .then((rows) => rows.map((row) => Joi.attempt(row, pipeline.validationSchema)))
        .then((data) => {
            const table = `${pipeline.name}__${reportOptions.accountId}`;
            return load(data, { table, schema: pipeline.schema });
        });
};

export type CreatePipelineTasksOptions = {
    start?: string;
    end?: string;
};

export const createPipelineTasks = async ({ start, end }: CreatePipelineTasksOptions) => {
    return getAccounts()
        .then((accounts) => {
            return Object.keys(pipelines).flatMap((pipeline) =>
                accounts.map((accountId) => ({ accountId, start, end, pipeline })),
            );
        })
        .then((data) => createTasks(data, (task) => [task.pipeline, task.accountId].join('-')));
};
