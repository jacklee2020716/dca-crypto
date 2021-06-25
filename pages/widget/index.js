import Head from "next/head";
import {
  AppContextProvider,
  useAppContext,
} from "../../components/Context/Context";
import { getAllCoins } from "../../queries/queries";
import { CACHE_INVALIDATION_INTERVAL, defaultCurrency } from "../../config";
import { TweetMessage } from "../../components/TweetMessage/TweetMessage";
import axios from "axios";
import React from "react";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import duration from "dayjs/plugin/duration";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { kFormatter } from "../../components/Chart/helpers";
import useChartLegend from "../../components/Chart/useChartLegend";
import { formatCurrency } from "@coingecko/cryptoformat";
dayjs.extend(localizedFormat);
dayjs.extend(duration);

const mapFormatting = (entry, currentCoin, currency) => {
  switch (entry.dataKey) {
    case "coinPrice":
    case "costAverage":
      return (
        <>
          {entry.name}: {formatCurrency(entry.value, currency)}
        </>
      );

    case "totalFIAT":
    case "balanceFIAT":
      return (
        <span className="text-gray-400">
          {entry.name}: {formatCurrency(parseFloat(entry.value), currency)}
        </span>
      );
    case "balanceCrypto":
      return (
        <span className="text-gray-400">
          {entry.name}: {formatCurrency(entry.value, currentCoin.symbol)}
        </span>
      );
    default:
      return (
        <>
          {entry.name}: {entry.value}
        </>
      );
  }
};

const CustomTooltip = (props) => {
  const { active, payload, label } = props;
  if (active && payload && payload.length) {
    const dateLabel = dayjs(label).format("LLL");
    return (
      <div className="p-4 transition-shadow border rounded shadow-sm bg-white dark:bg-gray-800 dark:border-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-200 mb-2">
          {dateLabel}
        </p>
        {payload.map((e, index) => (
          <p
            key={`${e.value}-${index}`}
            style={{ color: e.color }}
            className="text-sm"
          >
            {mapFormatting(e, props.currentCoin, props.currency)}
          </p>
        ))}
      </div>
    );
  }

  return null;
};

export async function getServerSideProps(context) {
  const {
    coin,
    investment,
    investmentInterval,
    dateFrom,
    dateTo,
    currency,
  } = context.query;

  const availableTokens = await getAllCoins(currency || defaultCurrency);

  const payload = {
    coinId: coin,
    investmentInterval,
    investment,
    dateFrom,
    dateTo,
    currency: currency || defaultCurrency,
  };

  let dcaData;
  try {
    const response = await axios.post(
      `${process.env.NEXTAUTH_URL}/api/calculate-dca`,
      payload
    );
    dcaData = response.data;
  } catch (error) {
    console.log(error);
  }

  context.res.setHeader(
    "Cache-Control",
    `s-maxage=${CACHE_INVALIDATION_INTERVAL}, stale-while-revalidate`
  );

  return {
    props: {
      availableTokens,
      dcaData: dcaData || null,
      coinId: coin || null,
      investment: investment || null,
      investmentInterval: investmentInterval || null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      currency,
    },
  };
}

const CoinWrapper = (props) => {
  const currentCoin = props.availableTokens.find(
    (token) => token.id === props.coinId
  );

  if (!currentCoin) {
    throw new Error("Coin ID not found.");
  }

  return <Coin {...props} currentCoin={currentCoin} />;
};

const Chart = (props) => {
  const { strokeSize, handleMouseEnter, handleMouseLeave } = useChartLegend(
    "coinPrice",
    "costAverage"
  );
  const color = "transparent";

  const allValues = props.dcaData.chartData.map((v) => parseFloat(v.coinPrice));
  const minValue = Math.min(...allValues) / 1.1;
  const maxValue = Math.max(...allValues) * 1.1;

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={props.dcaData.chartData}>
          <defs>
            <linearGradient id="colorCoinPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorCostAverage" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="coinPrice"
            stroke="#F59E0B"
            fillOpacity={0}
            strokeWidth={strokeSize.coinPrice}
            fill="url(#colorCoinPrice)"
            name="Price"
            dot={{ stroke: "#F59E0B", strokeWidth: strokeSize.coinPrice }}
          />
          <Area
            type="monotone"
            dataKey="costAverage"
            stroke="#82ca9d"
            strokeWidth={strokeSize.costAverage}
            fillOpacity={0}
            fill="url(#colorCostAverage)"
            name="Average cost"
          />

          <Area
            type="monotone"
            dataKey="totalFIAT"
            stroke={color}
            fillOpacity={0}
            name="Investment"
          />
          <Area
            type="monotone"
            dataKey="balanceFIAT"
            fill="url(#colorBalanceFIAT)"
            stroke={color}
            fillOpacity={1}
            name="Balance"
          />
          <Area
            type="monotone"
            dataKey="balanceCrypto"
            stroke={color}
            fillOpacity={1}
            fill="url(#colorBalanceCrypto)"
            name={`Balance`}
          />

          <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
          <XAxis dataKey="date" />
          <YAxis
            tickFormatter={(tick) => kFormatter(tick.toFixed(2))}
            dataKey="coinPrice"
            type="number"
            domain={[minValue, maxValue]}
          />
          <Tooltip content={<CustomTooltip {...props} />} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const Information = (props) => {
  const currentCoin = props.currentCoin;

  const coinSymbol = currentCoin.symbol.toUpperCase();
  const duration = dayjs(props.dateTo).diff(props.dateFrom, "day");

  const lumpSumTotal =
    (props.dcaData.insights.totalInvestment /
      props.dcaData.chartData[0].coinPrice) *
    props.currentCoin.current_price;

  const information = [
    {
      label: "Duration",
      value: `${dayjs
        .duration(duration, "days")
        .humanize()} (${duration} days)`,
    },
    {
      label: "Total investment",
      value: formatCurrency(
        props.dcaData.insights.totalInvestment,
        props.currency
      ),
    },
    {
      label: "Value in FIAT",
      value: (
        <>
          <p>
            {formatCurrency(
              props.dcaData.insights.totalValue?.fiat,
              props.currency
            )}{" "}
            <span
              className={`inline-block px-2 text-sm text-white dark:text-gray-900 ${
                props.dcaData.insights.percentageChange > 0
                  ? "bg-green-400"
                  : "bg-red-400"
              } rounded`}
            >
              {props.dcaData.insights.percentageChange > 0 ? "+" : ""}
              {props.dcaData.insights.percentageChange}%
            </span>{" "}
            using DCA
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {formatCurrency(lumpSumTotal, props.currency)} with lump sum
            investing
          </p>
        </>
      ),
    },
    {
      label: `Value in crypto`,
      value: (
        <>
          {formatCurrency(
            props.dcaData.insights.totalValue?.crypto || 0,
            coinSymbol
          )}
        </>
      ),
    },
  ];

  const allInformation = () => {
    const oddClass =
      "bg-white dark:bg-gray-900 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6";
    const evenClass =
      "bg-gray-50 dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6";
    return information.map((i, index) => (
      <div
        key={i.label}
        className={`${index % 2 === 0 ? evenClass : oddClass} ${
          index === information.length - 1 && "rounded-b-lg"
        }`}
      >
        <dt className="text-sm font-medium text-gray-500 dark:text-white flex">
          {i.label}{" "}
        </dt>
        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 dark:text-white">
          {i.value}
        </dd>
      </div>
    ));
  };

  return (
    <>
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
          Information
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-white">
          Summarised data regarding your investment.
        </p>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-900">
        <dl>{allInformation()} </dl>
      </div>
    </>
  );
};

const Coin = (props) => {
  const coinSymbol = props.currentCoin.symbol.toUpperCase();

  return (
    <div className="w-full">
      <Head>
        <title>
          DCA Crypto - Dollar cost average {props.currentCoin.name} (
          {coinSymbol}) calculator
        </title>
        <meta
          name="description"
          content={`Dollar cost average calculator for ${props.currentCoin.name} (${coinSymbol}). Visualise and examine the impact of your investments in ${props.currentCoin.name} or any other popular crypto.`}
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <div className="mt-2">
          <div className="flex items-center  mb-4">
            <h2 className="text-2xl px-4 sm:px-0 text-gray-900 dark:text-gray-100">
              Dollar-cost averaging (DCA) calculator for{" "}
              <span className="text-indigo-700 dark:text-yellow-500 capitalize">
                {props.currentCoin.name} ({coinSymbol})
              </span>{" "}
              backtesting
            </h2>
            <img
              className="w-8 h-8 ml-2 hidden sm:block"
              src={props.currentCoin.image}
              alt={`${props.currentCoin.name} logo`}
            />
          </div>
          <div className="md:flex">
            <div className="h-96 md:w-8/12">
              <Chart {...props} />
            </div>
            <div className="md:w-4/12">
              <Information {...props} />
            </div>
          </div>
          <div className="p-4">
            <p className="text-xs text-gray-400 text-center">
              Data provided by{" "}
              <a
                href="https://www.dca-cc.com"
                target="_blank"
                className="underline text-blue-500"
              >
                DCA-CC
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CoinWrapper;