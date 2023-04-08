import { CAMPAIGN_INSIGHTS } from './pipeline.const';
import { runPipeline } from './pipeline.service';

it('pipeline', async () => {
    return runPipeline(
        {
            accountId: '2304291883206771',
            start: '2023-04-01',
            end: '2023-05-01',
        },
        CAMPAIGN_INSIGHTS,
    )
        .then((results) => expect(results).toBeDefined())
        .catch((error) => {
            console.error({ error });
            return Promise.reject(error);
        });
});
