import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createAppointment } from '@/services/nutritionistService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Calendar, Clock, X } from 'lucide-react';

const AppointmentModal = ({ nutritionistId, nutritionistName, availableTimeSlots = [], onClose, onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !time) {
      toast({ title: 'Error', description: 'Please select date and time.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await createAppointment(user.uid, nutritionistId, date, time);
      toast({ title: 'Appointment Requested!', description: `Your request with ${nutritionistName} has been sent.` });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Appointment error:', err);
      toast({ title: 'Error', description: err.message || 'Failed to book appointment.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="glass-card w-full max-w-md p-6 shadow-2xl animate-scale-in relative">
        <Button variant="ghost" size="icon" className="absolute right-3 top-3" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>

        <h2 className="text-xl font-bold text-foreground mb-1">Book Appointment</h2>
        <p className="text-sm text-muted-foreground mb-6">with {nutritionistName}</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="appt-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Select Date
            </Label>
            <Input
              id="appt-date"
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="glass-input h-11"
              required
            />
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Select Time Slot
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(availableTimeSlots.length > 0 ? availableTimeSlots : [
                '9:00 AM - 10:00 AM',
                '10:00 AM - 11:00 AM',
                '11:00 AM - 12:00 PM',
                '2:00 PM - 3:00 PM',
                '3:00 PM - 4:00 PM',
                '4:00 PM - 5:00 PM',
              ]).map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTime(slot)}
                  className={`px-3 py-2 rounded-lg border text-sm smooth-transition ${
                    time === slot
                      ? 'bg-primary text-white border-primary'
                      : 'bg-background border-border hover:border-primary/50'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 medical-gradient text-white hover:opacity-90"
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Request Appointment'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AppointmentModal;
