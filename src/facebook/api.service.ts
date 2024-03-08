import axios from 'axios';
import qs from 'query-string';

export const getClient = async () => {
    const accessToken = await axios
        .request<{ value: { raw: string } }>({
            method: 'GET',
            url: 'https://api.doppler.com/v3/configs/config/secret',
            params: { project: 'facebook', config: 'master', name: 'USER_ACCESS_TOKEN' },
            auth: { username: process.env.DOPPLER_TOKEN ?? '', password: '' },
        })
        .then(({ data }) => data.value.raw);

    const apiVersion = await axios
        .request({
            method: 'GET',
            url: 'https://graph.facebook.com/me',
            params: { access_token: accessToken },
        })
        .then((response) => <string>response.headers['facebook-api-version']);

    const client = axios.create({
        baseURL: `https://graph.facebook.com/${apiVersion}`,
        params: { access_token: accessToken },
        paramsSerializer: { serialize: (value) => qs.stringify(value, { arrayFormat: 'comma' }) },
    });

    client.interceptors.response.use(
        (response) => response,
        (error) => {
            const meta = axios.isAxiosError(error)
                ? {
                      config: error.config,
                      response: { data: error.response?.data, headers: error.response?.headers },
                  }
                : error;

            console.error({ error: meta });
            throw error;
        },
    );

    return client;
};
