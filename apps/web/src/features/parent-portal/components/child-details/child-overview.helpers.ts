export function calculateNextSessionStr(overview: any, primaryGroup: any): string {
  if (overview?.nextSession) {
    const nextDate = new Date(overview.nextSession.nextDate);
    const daysAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    let [sh, sm] = (overview.nextSession.startTime || '00:00').split(':');
    let h = parseInt(sh, 10);
    const ampm = h >= 12 ? 'م' : 'ص';
    h = h % 12 || 12;
    return `${daysAr[overview.nextSession.dayOfWeek]}، ${nextDate.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })} - ${h}:${sm} ${ampm}`;
  }

  if (primaryGroup?.schedules?.length) {
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const currentHourMinute = today.getHours() * 60 + today.getMinutes();

    let nextSchedule = null;
    let daysUntilNext = 7;

    for (const schedule of primaryGroup.schedules) {
      const schDay = schedule.dayOfWeek;
      const [sh, sm] = schedule.startTime.split(':').map(Number);
      const schTime = sh * 60 + sm;

      let diff = schDay - currentDayOfWeek;
      if (diff < 0 || (diff === 0 && schTime <= currentHourMinute)) {
        diff += 7;
      }
      if (diff < daysUntilNext) {
        daysUntilNext = diff;
        nextSchedule = schedule;
      } else if (diff === daysUntilNext && nextSchedule) {
        const [nsh, nsm] = nextSchedule.startTime.split(':').map(Number);
        if (schTime < nsh * 60 + nsm) {
          nextSchedule = schedule;
        }
      }
    }

    if (nextSchedule) {
      const nextDate = new Date(today.getTime() + daysUntilNext * 24 * 60 * 60 * 1000);
      const daysAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      let [sh, sm] = nextSchedule.startTime.split(':');
      let h = parseInt(sh, 10);
      const ampm = h >= 12 ? 'م' : 'ص';
      h = h % 12 || 12;
      return `${daysAr[nextSchedule.dayOfWeek]}، ${nextDate.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })} - ${h}:${sm} ${ampm}`;
    }
  }

  return 'غير محدد';
}
