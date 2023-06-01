import { getClient } from './api.service';

type ListAccountsResponse = { data: { account_id: string; id: string }[] };

export const getAccounts = async () => {
    const client = await getClient();

    const BUSINESS_ID = 176030634338306;

    return Promise.all(
        ['client_ad_accounts', 'owned_ad_accounts'].map(async (edge) => {
            return client
                .request<ListAccountsResponse>({
                    method: 'GET',
                    params: { limit: 500 },
                    url: `/${BUSINESS_ID}/${edge}`,
                })
                .then((response) => {
                    return response.data.data;
                });
        }),
    ).then((accountGroups) => {
        return accountGroups.flatMap((accounts) => accounts.map(({ account_id }) => account_id));
    });
};
