import { useIsFetching, useMutation, useQuery } from "react-query";
import cmsClient from "../../server/cmsClient";
import { useSession } from "next-auth/client";
import DashboardChart from "./DashboardChart/DashboardChart";
import { useDashboardContext } from "../DashboardContext/DashboardContext";
import { formatCurrency } from "@coingecko/cryptoformat";
import {
  ArrowSmUpIcon,
  ArrowSmDownIcon,
  TrashIcon,
  RefreshIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  PresentationChartLineIcon,
  CurrencyDollarIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  SwitchHorizontalIcon,
  CashIcon,
} from "@heroicons/react/outline";
import getPercentageChange from "../helpers/getPercentageChange";
import BotList from "./BotList";
import ChooseIllustration from "../../Illustrations/ChooseIllustration";
import { kFormatter } from "../Chart/helpers";
import dayjs from "dayjs";
import { Popover, Transition } from "@headlessui/react";
import { queryClient } from "../../pages/_app";
import Loading from "../Loading/Loading";
import apiClient from "../../server/apiClient";
import { ACTIONS } from "../DashboardContext/dashboardReducer";
import DashboardLayout from "./DashboardLayout";
import OrdersDataTable from "./OrdersDataTable";

const RemoveButton = () => {
  const { state, dispatch } = useDashboardContext();
  const [session] = useSession();

  const { mutate, isLoading: isRemoving } = useMutation({
    mutationFn: async (payload) =>
      await cmsClient(session.accessToken).delete(`/trading-bots/${payload}`),
    mutationKey: "remove-bot",
    onSettled: async () => {
      await queryClient.refetchQueries(["my-bots"]);
      dispatch({ type: ACTIONS.SET_SELECTED_BOT, payload: null });
    },
  });

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button className="focus:outline-none px-1 py-1 flex items-center justify-between text-xs leading-5 font-semibold rounded-full  hover:bg-red-100 dark:hover:bg-red-400 text-gray-400">
            {isRemoving ? (
              <span className="mx-1">
                <Loading width={20} height={20} />
              </span>
            ) : (
              <TrashIcon className="w-5 h-5" />
            )}
          </Popover.Button>
          <Transition
            show={open}
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <Popover.Panel className="absolute z-10 w-screen px-4 mt-3 transform -translate-x-2/2 right-1/2 max-w-sm">
              <div className="p-4 bg-white dark:bg-gray-900 rounded border dark:border-gray-700 shadow max-w-sm">
                <h4 className="text-normal font-medium mb-2">Are you sure?</h4>
                <p className="mb-2 text-gray-600 dark:text-gray-300">
                  Removing the trading bot will stop the execution of upcoming
                  trades and remove all data related to it from our systems.
                </p>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  If you don't need this bot now, we suggest, you just put it on
                  pause.
                </p>

                <button
                  disabled={isRemoving}
                  onClick={() => mutate(state.selectedBot.id)}
                  className="flex justify-center items-center rounded font-medium bg-red-500 p-2 text-white dark:text-gray-900 w-full"
                >
                  Yes, remove {state.selectedBot.trading_pair} bot
                  {isRemoving ? (
                    <span className="mx-1">
                      <Loading width={20} height={20} />
                    </span>
                  ) : (
                    <TrashIcon className="ml-2 w-5 h-5" />
                  )}
                </button>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};

const Stat = (props) => {
  return (
    <div className={props.className}>
      <div className="shadow-lg border dark:border-gray-800 rounded-lg relative">
        <div className="flex items-start p-4">
          <div className="p-3 mr-6 shadow-2xl bg-indigo-500 dark:bg-yellow-500 rounded">
            {props.icon}
          </div>
          <div className="flex-1">
            <p className="text-gray-500 font-semibold">{props.title}</p>
            <div className="flex items-baseline  ">
              <h2 className="text-xl font-semibold">{props.value}</h2>
            </div>
            <div className="text-gray-500 mt-1">{props.description}</div>
            <div className="absolute left-0 bottom-0 w-full">
              {props.progressBar}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChartInfo = () => {
  const { state } = useDashboardContext();
  const [session] = useSession();

  if (!state.selectedBot) {
    return null;
  }

  const updateTradingBot = useMutation({
    mutationFn: async (payload) =>
      await cmsClient(session.accessToken).put(
        `/trading-bots/${state.selectedBot.id}`,
        payload
      ),
    mutationKey: "update-bot",
    onSuccess: async () => {
      await queryClient.refetchQueries(["my-bots"]);
    },
  });

  const getTicker = useQuery({
    queryKey: `get-ticker-${state.selectedBot.trading_pair}`,
    queryFn: async () => {
      const credentials = state.selectedBot.exchange.api_requirements;
      const exchangeId = state.selectedBot.available_exchange.identifier;

      const response = await apiClient.get(
        `/exchanges/${exchangeId}/fetch-ticker`,
        { params: { credentials, symbol: state.selectedBot.trading_pair } }
      );

      return response.data;
    },
  });

  const credentials = state.selectedBot.exchange.api_requirements;
  const botExchange = state.selectedBot.available_exchange.identifier;

  const balance = useQuery({
    queryFn: async () => {
      const response = await apiClient.post(
        `/exchanges/${botExchange}/balance`,
        { credentials }
      );

      return response.data;
    },
    queryKey: `my-balance-${botExchange}`,
  });

  const baseCurrencyBalance =
    balance.data && balance.data.free
      ? balance.data.free[state.selectedBot.destination_currency]
      : 0;
  const hasBalance =
    baseCurrencyBalance > state.selectedBot.origin_currency_amount;
  const durationEstimate = Math.floor(
    baseCurrencyBalance /
      (state.selectedBot.origin_currency_amount /
        state.selectedBot.investing_interval)
  );

  const priceNow = getTicker.data ? getTicker.data.bid : 0;
  const averageCost =
    state.selectedBot.orders && state.selectedBot.orders.length
      ? state.selectedBot.orders[state.selectedBot.orders.length - 1]
          .averageCost
      : priceNow;

  const totalBaseAmount = state.selectedBot.orders.reduce(
    (prev, curr) => prev + curr.amount,
    0
  );

  const allCryptoValue = totalBaseAmount * priceNow;
  const totalInvestment =
    state.selectedBot.orders.length * state.selectedBot.origin_currency_amount;

  const percentageDifference = getPercentageChange(
    totalInvestment,
    allCryptoValue
  );

  const valueDifference = allCryptoValue - totalInvestment;

  const lastOrder =
    state.selectedBot.orders[state.selectedBot.orders.length - 1];
  const nextOrderDate = dayjs(lastOrder ? lastOrder.dateTime : new Date()).add(
    state.selectedBot.investing_interval,
    state.selectedBot.interval_type
  );

  const diffUntilNextOrder = () => {
    if (!state.selectedBot.isActive || state.selectedBot.errorMessage) {
      return (
        <>
          <span className="line-through">
            {dayjs().to(dayjs(nextOrderDate))}
          </span>{" "}
          disabled
        </>
      );
    }

    return dayjs().to(dayjs(nextOrderDate));
  };

  const timeSinceLastOrder = dayjs().to(
    dayjs(lastOrder ? lastOrder.dateTime : new Date())
  );

  const getPercentageDifference = (change) => {
    if (isNaN(change)) {
      return "0%";
    }

    return change > 0 ? (
      <>
        <span className="text-green-500 flex items-center">
          <ArrowSmUpIcon className="w-5 h-5" /> {change}%
        </span>
      </>
    ) : (
      <>
        <span className="text-red-400 flex items-center">
          <ArrowSmDownIcon className="w-5 h-5" /> {change}%
        </span>
      </>
    );
  };

  return (
    <>
      <div className="mb-10">
        {!state.selectedBot.isActive && state.selectedBot.errorMessage && (
          <div
            className="shadow-lg border-2 border-red-500 px-4 py-3 rounded relative"
            role="alert"
          >
            <p>
              <strong className="font-bold">Error</strong>
            </p>
            <p className="mb-4 text-gray-600 dark:text-gray-300">
              While processing your order, we received the following error from
              your exchange:
            </p>

            <p className="mb-4 bg-gray-100 dark:bg-gray-800 p-2 rounded">
              {state.selectedBot.errorMessage}
            </p>

            <p className="mb-4 text-gray-600 dark:text-gray-300">
              This bot will remain <b>disabled</b> until you fix the issue with
              your exchange. Once fixed, please mark it as resolved so we can
              try again.
            </p>
            <button
              disabled={updateTradingBot.isLoading}
              onClick={() =>
                updateTradingBot.mutate({
                  isActive: true,
                  errorMessage: "",
                })
              }
              className="flex mt-4 justify-center items-center rounded font-medium bg-indigo-500 dark:bg-yellow-500 px-4 py-2 text-white dark:text-gray-900 "
            >
              I resolved it, try again{" "}
              {updateTradingBot.isLoading ? (
                <span className="ml-2 ">
                  <Loading width={20} height={20} type="spin" />
                </span>
              ) : (
                <RefreshIcon className="ml-2 w-5 h-5" />
              )}
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-8">
        <Stat
          className="col-span-3 sm:col-span-1"
          title={`Current holdings`}
          icon={
            allCryptoValue < totalInvestment ? (
              <TrendingDownIcon className="w-6 h-6 text-white dark:text-gray-900" />
            ) : (
              <TrendingUpIcon className="w-6 h-6 text-white dark:text-gray-900" />
            )
          }
          value={
            allCryptoValue < totalInvestment ? (
              <span className="text-red-500">
                {formatCurrency(
                  allCryptoValue,
                  state.selectedBot.destination_currency
                )}
              </span>
            ) : (
              <span className="text-green-500">
                {formatCurrency(
                  allCryptoValue,
                  state.selectedBot.destination_currency
                )}
              </span>
            )
          }
          description={
            <div className="flex items-center">
              <span
                className={
                  valueDifference >= 0 ? "text-green-500" : "text-red-500"
                }
              >
                {percentageDifference &&
                  getPercentageDifference(percentageDifference)}
              </span>
              <span
                className={`ml-2 ${
                  valueDifference >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {valueDifference > 0 ? "+" : ""}
                {formatCurrency(
                  valueDifference,
                  state.selectedBot.destination_currency
                )}
              </span>
            </div>
          }
        />

        <Stat
          className="col-span-3 sm:col-span-1"
          title="Investment"
          icon={
            <CurrencyDollarIcon className="w-6 h-6 text-white dark:text-gray-900" />
          }
          value={formatCurrency(
            totalInvestment,
            state.selectedBot.destination_currency
          )}
          description={
            <>
              {formatCurrency(
                state.selectedBot.origin_currency_amount,
                state.selectedBot.destination_currency
              )}{" "}
              every {state.selectedBot.investing_interval}{" "}
              {state.selectedBot.investing_interval > 1
                ? `${state.selectedBot.interval_type}s`
                : state.selectedBot.interval_type}
            </>
          }
        />

        <Stat
          className="col-span-3 sm:col-span-1"
          title="Balance on exchange"
          icon={
            <SwitchHorizontalIcon className="w-6 h-6 text-white dark:text-gray-900" />
          }
          value={formatCurrency(
            baseCurrencyBalance,
            state.selectedBot.destination_currency
          )}
          description={
            hasBalance ? (
              `Enough for ${kFormatter(durationEstimate)} more ${
                state.selectedBot.interval_type
              }s`
            ) : (
              <span className="text-red-400">Insufficient for next order</span>
            )
          }
        />

        <Stat
          className="col-span-3 sm:col-span-1"
          title="Current price"
          icon={<CashIcon className="w-6 h-6 text-white dark:text-gray-900" />}
          value={formatCurrency(
            priceNow,
            state.selectedBot.destination_currency
          )}
          description={`Volume ${
            getTicker.data ? getTicker.data.baseVolume.toFixed(2) : 0
          }`}
        />

        <Stat
          className="col-span-3 sm:col-span-1"
          title="Average cost"
          icon={
            <PresentationChartLineIcon className="w-6 h-6 text-white dark:text-gray-900" />
          }
          value={formatCurrency(
            averageCost,
            state.selectedBot.destination_currency
          )}
          description={`Difference ${formatCurrency(
            priceNow - averageCost,
            state.selectedBot.destination_currency
          )}`}
        />

        <Stat
          className="col-span-3 sm:col-span-1"
          title="Next order"
          icon={<ClockIcon className="w-6 h-6 text-white dark:text-gray-900" />}
          value={diffUntilNextOrder()}
          description={`Last trade ${timeSinceLastOrder}`}
          progressBar={
            <NextOrderProgress
              previousOrder={lastOrder ? lastOrder.dateTime : new Date()}
              nextOrder={nextOrderDate}
            />
          }
        />
      </div>
    </>
  );
};

const NextOrderProgress = (props) => {
  const start = new Date(props.previousOrder);
  const end = new Date(props.nextOrder);
  const now = new Date();
  const p = Math.round(((now - start) / (end - start)) * 100) + "%";

  return (
    <div className="relative">
      <div className="overflow-hidden h-2 text-xs flex rounded-b-lg bg-indigo-200 dark:bg-gray-700">
        <div
          style={{ width: p }}
          className="shadow-none transition flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 dark:bg-yellow-500"
        ></div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { state } = useDashboardContext();
  const isFetching = useIsFetching();

  const title = state.selectedBot ? (
    <>
      {state.selectedBot.available_exchange.identifier.toUpperCase()}:
      <span className="text-indigo-500 dark:text-yellow-500">
        {state.selectedBot.trading_pair}
      </span>
    </>
  ) : (
    "Dashboard"
  );

  const emptyState = isFetching ? (
    <div className="flex w-full h-screen items-center justify-center">
      <Loading />
    </div>
  ) : (
    <div className="w-full h-screen flex items-center justify-center">
      <div>
        <h3 className="mb-2 text-xl font-medium text-center">
          Please select a bot to start with
        </h3>
        <p className="mb-16 text-center">
          By selecting a bot you will reveal it's detailed view
        </p>
        <div className="flex justify-center">
          <ChooseIllustration className="w-44 h-44" />
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div>
        <div className="lg:flex">
          <div className="w-12/12 lg:w-9/12 p-8">
            {state.selectedBot ? (
              <>
                <div className="flex justify-between items-center mb-8">
                  <h1 className="text-black dark:text-gray-100 text-4xl font-bold flex items-center">
                    {title}
                  </h1>
                  <RemoveButton />
                </div>
                <div className="shadow-lg border dark:border-gray-800 rounded-lg p-6 mb-8">
                  <h2 className="mb-4 text-lg font-medium">
                    Asset performance over time
                  </h2>
                  <div className="h-80">
                    <DashboardChart />
                  </div>
                </div>
                <div className="mb-10">
                  <ChartInfo />
                </div>

                <div className="shadow-lg border dark:border-gray-800 rounded-lg">
                  <h2 className="text-xl font-medium mb-8 p-6">Your orders</h2>
                  <div>
                    <OrdersDataTable />
                  </div>
                </div>
              </>
            ) : (
              emptyState
            )}
          </div>
          <div className="w-12/12 lg:w-3/12 border-l shadow-xl dark:border-gray-700 bg-white dark:bg-gray-900">
            <BotList />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
