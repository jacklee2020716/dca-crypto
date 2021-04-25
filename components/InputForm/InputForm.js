import { useMutation } from "react-query";
import axios from "axios";
import { useAppContext } from "../Context/Context";
import { useRouter } from "next/router";
import { ACTIONS, availableInvestmentIntervals } from "../Context/mainReducer";
import { useEffect } from "react";

const InputFormWrapper = ({ coin }) => {
  const { dispatch } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (coin) {
      dispatch({
        type: ACTIONS.UPDATE_COIN_ID,
        payload: coin,
      });
    }

    if (router.isReady) {
      if (router.query.investment) {
        dispatch({
          type: ACTIONS.UPDATE_INVESTMENT,
          payload: router.query.investment,
        });
      }

      if (router.query.investmentInterval) {
        dispatch({
          type: ACTIONS.UPDATE_INVESTMENT_INTERVAL,
          payload: router.query.investmentInterval,
        });
      }

      if (router.query.dateFrom) {
        dispatch({
          type: ACTIONS.UPDATE_DATE_FROM,
          payload: router.query.dateFrom,
        });
      }

      if (router.query.dateTo) {
        dispatch({
          type: ACTIONS.UPDATE_DATE_TO,
          payload: router.query.dateTo,
        });
      }
    }
  }, [router.isReady, coin]);

  return <InputForm />;
};

const availableCurrencies = [
  { name: "USD", value: "usd" },
  { name: "EUR", value: "eur" },
  { name: "GBP", value: "gbp" },
  { name: "JPY", value: "jpy" },
  { name: "RUB", value: "rub" },
];

const InputForm = () => {
  const appContext = useAppContext();
  const router = useRouter();
  const { state, dispatch } = appContext;

  // Due to the constrains of the CoinGecko API, we enable calculations only
  // agter the perod of 90 days
  const isSubmitDisabled = state.input.duration < 90;

  const mutation = useMutation(
    (payload) => axios.post("/api/calculate-dca", payload),
    {
      onSuccess: (data) => {
        dispatch({
          type: ACTIONS.SET_CHART_DATA,
          payload: data.data,
        });
      },
    }
  );

  const submitForm = () => {
    if (isSubmitDisabled) {
      return null;
    }

    if (!state.input.coinId) {
      return null;
    }

    const payload = {
      coindId: state.input.coinId,
      investmentInterval: state.input.investmentInterval,
      investment: state.input.investment,
      dateFrom: state.input.dateFrom,
      dateTo: state.input.dateTo,
      currency: state.settings.currency,
    };

    mutation.mutate(payload);
  };
  const onSubmit = (event) => {
    event.preventDefault();

    submitForm();
  };

  useEffect(() => {
    submitForm();
  }, [state.input.coinId, state.input.investmentInterval]);

  if (!state.settings.availableTokens) {
    return null;
  }

  return (
    <form
      className="grid grid-cols-2 gap-4 p-4 border dark:border-gray-800 rounded shadow-sm"
      onSubmit={onSubmit}
      name="dca-crypto"
      id="dca-crypto"
    >
      <div className="col-span-2">
        <label className="block">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Coin
          </span>
          <div className="mt-1 flex rounded-md shadow-sm">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 text-gray-500 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
              <img src={state.input.coinImage} className="w-5 h-5" />
            </span>
            <select
              onChange={(e) => {
                dispatch({
                  type: ACTIONS.UPDATE_COIN_ID,
                  payload: e.target.value,
                });

                router.replace("/dca/" + e.target.value);
              }}
              name="coinId"
              value={state.input.coinId || ""}
              className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-none rounded-r-md sm:text-sm border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
            >
              {state.settings.availableTokens.map((coin, index) => (
                <option key={coin.id} value={coin.id}>
                  #{index + 1} {coin.name}
                </option>
              ))}
            </select>
          </div>
        </label>
      </div>
      <div className="col-span-1">
        <label className="block">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Investment
          </span>
          <div className="mt-1 flex rounded-md shadow-sm">
            <select
              onChange={(e) =>
                dispatch({
                  type: ACTIONS.UPDATE_CURRENCY,
                  payload: e.target.value,
                })
              }
              className="remove-dropdown-arrow inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            >
              {availableCurrencies.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder={100}
              min="1"
              step="any"
              value={state.input.investment}
              onChange={(e) =>
                dispatch({
                  type: ACTIONS.UPDATE_INVESTMENT,
                  payload: e.target.value,
                })
              }
              name="investment"
              className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-none rounded-r-md sm:text-sm border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
              placeholder="100"
            />
          </div>
        </label>
      </div>
      <div className="col-span-1">
        <label className="block">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Investment interval
          </span>
          <select
            onChange={(opt) =>
              dispatch({
                type: ACTIONS.UPDATE_INVESTMENT_INTERVAL,
                payload: opt.target.value,
              })
            }
            name="investmentInterval"
            value={state.input.investmentInterval || ""}
            className="block mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
          >
            {availableInvestmentIntervals.map((interval) => (
              <option key={interval.value} value={interval.value}>
                {interval.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="col-span-1">
        <label className="block">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            From
          </span>
          <input
            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
            type="date"
            value={state.input.dateFrom}
            onChange={(e) =>
              dispatch({
                type: ACTIONS.UPDATE_DATE_FROM,
                payload: e.target.value,
              })
            }
            name="dateFrom"
          />
        </label>
      </div>
      <div className="col-span-1">
        <label className="block">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            To
          </span>
          <input
            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
            type="date"
            value={state.input.dateTo}
            onChange={(e) =>
              dispatch({
                type: ACTIONS.UPDATE_DATE_TO,
                payload: e.target.value,
              })
            }
            name="dateTo"
          />
        </label>
      </div>
      <div className="col-span-2">
        <button
          type="submit"
          className="px-4 py-2 disabled:opacity-50 rounded bg-indigo-700 text-base text-white dark:bg-yellow-500 dark:text-gray-800 font-bold"
          disabled={isSubmitDisabled || mutation.isLoading}
        >
          {mutation.isLoading ? "Loading..." : "Calculate"}
        </button>
        {isSubmitDisabled ? (
          <>
            <p className="text-sm p-2 text-red-500">
              Choose a time range with more then 90 days.
            </p>
            <p className="text-sm p-2 text-red-500">
              Your current range is {calculateDateRangeDifference()} days
            </p>
          </>
        ) : null}
      </div>
    </form>
  );
};

export default InputFormWrapper;
