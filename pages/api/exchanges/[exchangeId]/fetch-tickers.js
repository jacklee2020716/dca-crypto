import ccxt from "ccxt";
import dayjs from "dayjs";
import { withSentry } from "@sentry/nextjs";
import { decrypt } from "../../../../server/cryptography";

const handler = async (req, res) => {
  const credentials = JSON.parse(decrypt(req.query.credentials));

  const key = credentials.api_key;
  const secret = credentials.secret_key;
  const passphrase = credentials.passphrase;

  const exchangeClient = new ccxt[req.query.exchangeId]({
    apiKey: key,
    secret,
    password: passphrase,
  });

  // Set sandbox environment in testing
  exchangeClient.setSandboxMode(process.env.IS_SANDBOX);

  const intervalType = {
    minute: "1m",
    hour: "1h",
    day: "1d",
    week: "1w",
  };

  const tenIntervalsAgo = dayjs(req.query.since).subtract(
    30,
    req.query.interval_type
  );

  const tickers = await exchangeClient.fetchOHLCV(
    req.query.symbol,
    intervalType[req.query.interval_type],
    new Date(tenIntervalsAgo).getTime()
  );

  const output = tickers.map((tick) => ({
    date: tick[0],
    price: tick[4],
  }));

  res.status(200).json(output);
};

export default withSentry(handler);
