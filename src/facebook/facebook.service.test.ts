import { runPipeline } from './pipeline.service';
import { ACCOUNTS, accountService, taskService } from './account.service';
import { CAMPAIGN_INSIGHTS } from './pipeline.const';

it('pipeline', async () => {
    return runPipeline(
        {
            accountId: '2304291883206771',
            start: '2023-01-01',
            end: '2023-02-01',
        },
        CAMPAIGN_INSIGHTS,
    )
        .then((results) => expect(results).toBeDefined())
        .catch((error) => {
            console.error({ error });
            return Promise.reject(error);
        });
});
