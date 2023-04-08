import { Readable } from 'node:stream';
import { setTimeout } from 'node:timers/promises';
import axios from 'axios';

import { getClient } from './api.service';

export type ReportOptions = {
    accountId: string;
    start: string;
    end: string;
};

export type InsightsOptions = {
    level: string;
    fields: string[];
    breakdowns?: string;
};

type RequestReportResponse = {
    report_run_id: string;
};

type ReportStatusResponse = {
    async_percent_completion: number;
    async_status: string;
};

type InsightsData = Record<string, any>[];

type InsightsResponse = {
    data: InsightsData;
    paging: { cursors: { after: string }; next: string };
};

export const get = async (
    { accountId, start: since, end: until }: ReportOptions,
    { level, fields, breakdowns }: InsightsOptions,
): Promise<Readable> => {
    const client = await getClient();

    const requestReport = async (): Promise<string> => {
        return client
            .request<RequestReportResponse>({
                method: 'POST',
                url: `/act_${accountId}/insights`,
                data: {
                    level,
                    fields,
                    breakdowns,
                    time_range: JSON.stringify({ since, until }),
                    time_increment: 1,
                },
            })
            .then(({ data }) => data.report_run_id);
    };

    const pollReport = async (reportId: string): Promise<string> => {
        const data = await client
            .request<ReportStatusResponse>({ method: 'GET', url: `/${reportId}` })
            .then((res) => res.data);

        if (data.async_percent_completion === 100 && data.async_status === 'Job Completed') {
            return reportId;
        }

        if (data.async_status === 'Job Failed') {
            throw new Error(JSON.stringify(data));
        }

        await setTimeout(10_000);

        return pollReport(reportId);
    };

    const getInsights = (reportId: string): Readable => {
        const stream = new Readable({ objectMode: true, read: () => {} });

        const _getInsights = async (after?: string) => {
            try {
                const data = await client
                    .request<InsightsResponse>({
                        method: 'GET',
                        url: `/${reportId}/insights`,
                        params: { after, limit: 500 },
                    })
                    .then((res) => res.data);

                data.data.forEach((row) => stream.push(row));

                if (data.paging.next) {
                    _getInsights(data.paging.cursors.after);
                } else {
                    stream.push(null);
                }
            } catch (error) {
                stream.emit('error', error);
            }
        };

        _getInsights();

        return stream;
    };

    return requestReport()
        .then(pollReport)
        .then(getInsights)
        .catch((err) => {
            if (axios.isAxiosError(err)) {
                console.log(JSON.stringify(err.response?.data));
            } else {
                console.log(err);
            }
            return Promise.reject(err);
        });
};
