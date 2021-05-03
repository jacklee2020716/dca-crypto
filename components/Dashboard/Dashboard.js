import Menu from "./Menu/Menu";
import NewBotModal from "./NewBotModal/NewBotModal";
import DashboardTitle from "./DashboardTitle";
import { useQuery } from "react-query";
import cmsClient from "../../server/cmsClient";
import { useSession } from "next-auth/client";
import BotItem from "./BotItem";

const DashboardLayout = ({ children }) => {
  return (
    <div className="flex h-full">
      <div className="h-screen border-r dark:border-gray-700 shadow">
        <Menu />
      </div>
      <div className="h-screen w-full">{children}</div>
    </div>
  );
};

const BotList = () => {
  const [session] = useSession();

  const { data, isLoading } = useQuery(
    "my-bots",
    async () => {
      const response = await cmsClient(session.accessToken).get(
        "/trading-bots"
      );

      return response.data;
    },
    {
      refetchInterval: 10000,
    }
  );

  if (isLoading) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <div className="-my-2 sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div className="shadow border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 ">
              <thead className="bg-white dark:bg-gray-900">
                <tr>
                  <th
                    colSpan={8}
                    className="px-6 py-6 text-left text-lg font-medium text-gray-500 dark:text-gray-100 tracking-wider"
                  >
                    Your bots
                  </th>
                </tr>
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-100 tracking-wider"
                  >
                    #
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-100 tracking-wider"
                  >
                    Symbol
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-100 tracking-wider"
                  >
                    Investment
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-100 tracking-wider"
                  >
                    Performance
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-100 tracking-wider"
                  >
                    Balance on exchange
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-100 tracking-wider"
                  >
                    Next order
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-100 tracking-wider"
                  >
                    Status
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {data.map((bot, index) => (
                  <BotItem key={bot.id} index={index + 1} {...bot} />
                ))}
                <tr>
                  <td colSpan={8} className="px-5 py-1 whitespace-nowrap">
                    <NewBotModal />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div>
        <DashboardTitle title="Dashboard" />
        <div className="p-8 grid grid-cols-3 gap-8">
          <div className="col-span-2">
            <div className="rounded p-6 shadow border">Performance</div>
          </div>
          <div className="col-span-1">
            <div className="rounded p-6 shadow border">Chart info</div>
          </div>
          <div className="col-span-3">
            <BotList />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
