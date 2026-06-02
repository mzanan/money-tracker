import { UpcomingList } from "@/components/reminders/upcomingList";
import { getRemindersData } from "@/lib/data/reminders";

export default async function UpcomingPage() {
  const { reminders, today } = await getRemindersData();

  return (
    <div className="mx-auto w-full max-w-xl">
      <UpcomingList reminders={reminders} today={today} />
    </div>
  );
}
