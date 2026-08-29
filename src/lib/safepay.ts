import { Safepay } from '@sfpy/node-sdk';
import { Environment } from '@sfpy/node-sdk/dist/utils/constants';

if (
  !process.env.SAFEPAY_ENV ||
  !process.env.SAFEPAY_API_KEY ||
  !process.env.SAFEPAY_V1_SECRET ||
  !process.env.SAFEPAY_WEBHOOK_SECRET
) {
  throw new Error('Safepay environment variables are not configured');
}

const environmentMap: Record<string, Environment> = {
  sandbox: Environment.Sandbox,
  production: Environment.Production,
  development: Environment.Development,
};

const environment = environmentMap[process.env.SAFEPAY_ENV];

if (!environment) {
  throw new Error(
    `Invalid SAFEPAY_ENV: ${process.env.SAFEPAY_ENV}. Expected sandbox, production, or development.`
  );
}

export const safepay = new Safepay({
  environment,
  apiKey: process.env.SAFEPAY_API_KEY,
  v1Secret: process.env.SAFEPAY_V1_SECRET,
  webhookSecret: process.env.SAFEPAY_WEBHOOK_SECRET,
});
