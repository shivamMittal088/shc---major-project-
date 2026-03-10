import { getMe } from "@/server-actions/get-me.action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileIcon, BookOpenIcon, PencilIcon, CalendarIcon, HardDriveIcon, PackageIcon, MailIcon, HashIcon, CreditCardIcon, ClockIcon } from "lucide-react";
import { formatPageLoadTime } from "@/lib/page-load-time";
import BackendUnavailableNotice from "@/components/BackendUnavailableNotice";
import PageLoadTimeReporter from "@/components/PageLoadTimeReporter";

export default async function DashboardPage() {
  const startedAt = Date.now();
  let user;

  try {
    user = await getMe();
  } catch (error) {
    return (
      <div className="container mx-auto max-w-7xl p-0.5 md:p-1">
        <header className="mb-4 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-700 px-4 py-3 text-white shadow-sm">
          <h1 className="mb-0.5 text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-xs text-slate-200">Here&rsquo;s an overview of your account</p>
        </header>

        <BackendUnavailableNotice
          title="Overview is temporarily unavailable"
          description={
            error instanceof Error ? error.message : "Unable to load account overview right now."
          }
        />
      </div>
    );
  }

  const loadTimeLabel = formatPageLoadTime(Date.now() - startedAt);

  return (
    <div className="container mx-auto max-w-7xl p-0.5 md:p-1">
      <PageLoadTimeReporter pathname="/" label={loadTimeLabel} />
      <header className="mb-4 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-700 px-4 py-3 text-white shadow-sm">
        <h1 className="mb-0.5 text-2xl font-bold tracking-tight">Welcome, {user.name}</h1>
        <p className="text-xs text-slate-200">Here&rsquo;s an overview of your account</p>
      </header>

      <div className="mb-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="overflow-hidden border-sky-200 bg-sky-50/80">
          <CardHeader className="border-b border-sky-100 px-4 py-3">
            <CardTitle className="flex items-center text-base text-sky-800">
              <BookOpenIcon className="mr-1.5 h-4 w-4 text-sky-600" />
              Remaining Reads
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
            <div className="mb-1 text-2xl font-bold text-sky-900">
              {user.subscription.today_remaining_reads}/{user.subscription.subscription_plan.max_daily_reads}
            </div>
            <p className="text-xs text-sky-700">You&rsquo;ve used {user.subscription.subscription_plan.max_daily_reads - user.subscription.today_remaining_reads} reads today</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-emerald-200 bg-emerald-50/80">
          <CardHeader className="border-b border-emerald-100 px-4 py-3">
            <CardTitle className="flex items-center text-base text-emerald-800">
              <PencilIcon className="mr-1.5 h-4 w-4 text-emerald-600" />
              Remaining Writes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
            <div className="mb-1 text-2xl font-bold text-emerald-900">
              {user.subscription.today_remaining_writes}/{user.subscription.subscription_plan.max_daily_writes}
            </div>
            <p className="text-xs text-emerald-700">You&rsquo;ve used {user.subscription.subscription_plan.max_daily_writes - user.subscription.today_remaining_writes} writes today</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-indigo-200 bg-indigo-50/80">
          <CardHeader className="border-b border-indigo-100 px-4 py-3">
            <CardTitle className="flex items-center text-base text-indigo-800">
              <FileIcon className="mr-1.5 h-4 w-4 text-indigo-600" />
              Files
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
            <div className="mb-1 text-2xl font-bold text-indigo-900">
              {user.file_count}
            </div>
            <p className="text-xs text-indigo-700">Total files in your account</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-yellow-200 bg-yellow-50">
          <CardHeader className="border-b border-yellow-200 px-4 py-3">
            <CardTitle className="flex items-center text-base text-yellow-700">
              <PackageIcon className="mr-1.5 h-4 w-4 text-yellow-500" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
            <div className="mb-2 flex items-center space-x-2">
              <Badge variant="default" className="bg-teal-500 px-2 py-0.5 text-[10px] hover:bg-teal-600">
                {user.subscription.status}
              </Badge>
              <span className="text-base font-semibold text-yellow-700">
                {user.subscription.subscription_plan.name}
              </span>
            </div>
            <div className="flex items-center text-yellow-600">
              <CreditCardIcon className="mr-1.5 h-4 w-4" />
              <span className="text-xs">Plan details</span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-pink-200 bg-pink-50">
          <CardHeader className="border-b border-pink-200 px-4 py-3">
            <CardTitle className="flex items-center text-base text-pink-700">
              <CalendarIcon className="mr-1.5 h-4 w-4 text-pink-500" />
              Subscription Period
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
            <div className="mb-1 text-base font-semibold text-pink-700">
              {new Date(user.subscription.start_date).toLocaleDateString()} - {new Date(user.subscription.end_date).toLocaleDateString()}
            </div>
            <div className="flex items-center text-pink-600">
              <ClockIcon className="mr-1.5 h-4 w-4" />
              <span className="text-xs">3 months duration</span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-cyan-200 bg-cyan-50">
          <CardHeader className="border-b border-cyan-200 px-4 py-3">
            <CardTitle className="flex items-center text-base text-cyan-700">
              <HardDriveIcon className="mr-1.5 h-4 w-4 text-cyan-500" />
              Storage
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
            <div className="space-y-2">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-cyan-700">Storage Remaining</span>
                  <span className="text-xs font-medium text-cyan-700">
                    {user.subscription.storage_remaining_bytes / 1000000} MB
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-cyan-600">
                <span>Max File Size:</span>
                <span className="font-semibold">
                  {user.subscription.subscription_plan.max_file_size_bytes / 1000000} MB
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-orange-200 bg-orange-50 md:col-span-2 lg:col-span-3">
          <CardHeader className="border-b border-orange-200 px-4 py-3">
            <CardTitle className="flex items-center text-base text-orange-700">
              <HashIcon className="mr-1.5 h-4 w-4 text-orange-500" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <Avatar className="h-16 w-16 border-2 border-orange-200">
                <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${user.name}`} alt={user.name} />
                <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                    <MailIcon className="h-4 w-4 text-orange-500" />
                    <div>
                      <p className="text-xs font-medium text-orange-700">Email</p>
                      <p className="text-xs text-orange-800">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                    <BookOpenIcon className="h-4 w-4 text-orange-500" />
                    <div>
                      <p className="text-xs font-medium text-orange-700">Max Daily Reads</p>
                      <p className="text-xs text-orange-800">{user.subscription.subscription_plan.max_daily_reads}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                  <BookOpenIcon className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-xs font-medium text-orange-700">Max Daily Writes</p>
                    <p className="text-xs text-orange-800">{user.subscription.subscription_plan.max_daily_writes}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
