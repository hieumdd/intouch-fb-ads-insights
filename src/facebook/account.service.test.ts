import { getAccounts } from './account.service';

it('get-accounts', async () => {
    return getAccounts('301608467133745')
        .then((result) => expect(result).toBeDefined())
        .catch((error) => {
            console.error({ error });
            return Promise.reject(error);
        });
});
