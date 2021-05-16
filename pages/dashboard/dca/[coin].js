import Head from "next/head";
import InputFormWrapper from "../../../components/InputForm/InputForm";
import Chart from "../../../components/Chart/Chart";
import ChartBalance from "../../../components/Chart/ChartBalance";
import {
  AppContextProvider,
  useAppContext,
} from "../../../components/Context/Context";
import DataTable from "../../../components/DataTable/DataTable";
import Information from "../../../components/Information/Information";
import { getAllCoins } from "../../../queries/queries";
import { CACHE_INVALIDATION_INTERVAL, defaultCurrency } from "../../../config";
import { useCurrentCoin } from "../../../components/Context/mainReducer";
import { TweetMessage } from "../../../components/TweetMessage/TweetMessage";
import DashboardMenu from "../../../components/Dashboard/Menu/DashboardMenu";
import { useSession } from "next-auth/client";

export async function getServerSideProps(context) {
  const {
    coin,
    investment,
    investmentInterval,
    dateFrom,
    dateTo,
  } = context.query;
  const availableTokens = await getAllCoins(
    context.query.currency || defaultCurrency
  );

  context.res.setHeader(
    "Cache-Control",
    `s-maxage=${CACHE_INVALIDATION_INTERVAL}, stale-while-revalidate`
  );

  return {
    props: {
      availableTokens,
      coinId: coin,
      investment: investment || null,
      investmentInterval: investmentInterval || null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
    },
  };
}

const Coin = (props) => {
  const { state } = useAppContext();
  const currentCoin = useCurrentCoin();
  const coinSymbol = currentCoin.symbol.toUpperCase();

  return (
    <div className="w-full">
      <Head>
        <title>
          DCA Crypto - Dollar cost average {currentCoin.name} ({coinSymbol})
          calculator
        </title>
        <meta
          name="description"
          content={`Dollar cost average calculator for ${currentCoin.name} (${coinSymbol}). Visualise and examine the impact of your investments in ${currentCoin.name} or any other popular crypto.`}
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <div className="grid grid-cols-6 w-full gap-8">
          <div className="col-span-6">
            <div className="flex items-center">
              <h1 className="text-2xl px-4 sm:px-0 text-gray-900 dark:text-gray-100">
                Dollar-cost averaging (DCA) calculator for{" "}
                <span className="text-indigo-700 dark:text-yellow-500 capitalize">
                  {currentCoin.name} ({coinSymbol})
                </span>{" "}
                backtesting
              </h1>
              {state.input.isLoading ? null : (
                <img
                  className="w-8 h-8 ml-2 hidden sm:block"
                  src={currentCoin.image}
                />
              )}
            </div>
          </div>
          <div className="col-span-6">
            <div className="shadow-xl border bg-white dark:bg-gray-900 dark:border-gray-800 rounded-lg p-6 mb-8">
              <div className="px-4 py-5 sm:px-6 dark:bg-gray-900 ">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Price development of {coinSymbol}
                </h3>
                <TweetMessage />
              </div>
              <div className="h-96 p-4 dark:bg-gray-900 flex items-center">
                <Chart />
              </div>
            </div>
            <div className="grid gap-8 mt-8 grid-cols-6">
              <div
                className={`col-span-6 md:col-span-3 shadow-xl border bg-white dark:bg-gray-900 dark:border-gray-800 rounded-lg mb-8 transition ${
                  state.input.isLoading ? "opacity-10" : ""
                }`}
              >
                <Information />
              </div>
              <div
                className={`col-span-6 md:col-span-3 shadow-xl border bg-white dark:bg-gray-900 dark:border-gray-800 rounded-lg mb-8 transition ${
                  state.input.isLoading ? "opacity-10" : ""
                }`}
              >
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Balance of your asset valuation
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-white">
                    Estimate the development of your earnings over time
                  </p>
                </div>
                <div className="h-72 p-4 dark:bg-gray-900 flex items-center">
                  <ChartBalance />
                </div>
              </div>
            </div>
            <div
              className={`col-span-6 mt-8 md:col-span-6 shadow overflow-hidden sm:rounded border dark:border-gray-800 transition ${
                state.input.isLoading ? "opacity-10" : ""
              }`}
            >
              <DataTable />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const CoinWrapper = (props) => {
  const [session] = useSession();
  return (
    <AppContextProvider availableTokens={props.availableTokens}>
      {!session && (
        <>
          Not signed in <br />
          <button onClick={() => signIn()}>Sign in</button>
        </>
      )}
      {session && (
        <>
          <div className="lg:flex bg-gray-100 dark:bg-gray-800">
            <div className="w-12/12 lg:w-16 bg-gray-900 dark:bg-gray-900 border-r border-gray-800">
              <DashboardMenu />
            </div>
            <div className="w-12/12 lg:w-330 shadow-xl dark:border-gray-700 bg-white dark:bg-gray-900">
              <h2
                colSpan={2}
                className="w-full flex items-center px-4 h-16 border-b dark:border-gray-700 text-left text-lg font-medium dark:text-gray-100 tracking-wider"
              >
                DCA Calculator
              </h2>
              <div>
                <InputFormWrapper {...props} pathname="/dashboard/dca/" />
              </div>
            </div>
            <div className="w-12/12 mt-8 md:mt-0 md:p-8 flex-1">
              <Coin {...props} />
            </div>
          </div>
        </>
      )}
    </AppContextProvider>
  );
};

export default CoinWrapper;