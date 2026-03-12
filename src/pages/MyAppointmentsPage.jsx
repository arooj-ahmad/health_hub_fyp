import DashboardLayout from '@/components/DashboardLayout';
import UserAppointments from '@/components/UserAppointments';

const MyAppointmentsPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">My Appointments</h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Track your appointment requests and confirmations
          </p>
        </div>
        <UserAppointments />
      </div>
    </DashboardLayout>
  );
};

export default MyAppointmentsPage;
