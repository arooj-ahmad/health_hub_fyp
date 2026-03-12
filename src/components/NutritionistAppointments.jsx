import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  onNutritionistAppointments,
  updateAppointmentStatus,
} from '@/services/nutritionistService';
import { getUserProfile } from '@/services/firestoreService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const statusColors = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  approved: 'bg-green-500/10 text-green-600 border-green-500/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
};

const NutritionistAppointments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [loading, setLoading] = useState(true);
  const namesRef = useRef({});

  useEffect(() => {
    namesRef.current = userNames;
  }, [userNames]);

  const resolveNames = useCallback(async (userIds) => {
    const missing = userIds.filter((id) => !namesRef.current[id]);
    if (missing.length === 0) return;

    const nameMap = { ...namesRef.current };
    await Promise.all(
      missing.map(async (uid) => {
        try {
          const profile = await getUserProfile(uid);
          nameMap[uid] = profile?.displayName || profile?.name || profile?.email || 'User';
        } catch {
          nameMap[uid] = 'User';
        }
      })
    );
    namesRef.current = nameMap;
    setUserNames(nameMap);
  }, []);

  // Real-time listener for appointments
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const unsub = onNutritionistAppointments(user.uid, async (data) => {
      setAppointments(data);

      const ids = [...new Set(data.map((a) => a.userId))];
      await resolveNames(ids);

      setLoading(false);
    });

    return () => unsub();
  }, [user, resolveNames]);

  const handleStatus = async (appointmentId, status) => {
    try {
      await updateAppointmentStatus(appointmentId, status);
      toast({ title: `Appointment ${status}`, description: `The appointment has been ${status}.` });
      // Real-time listener will automatically update the list
    } catch (err) {
      console.error('Error updating appointment:', err);
      toast({ title: 'Error', description: 'Failed to update appointment.', variant: 'destructive' });
    }
  };

  if (loading) return <LoadingSpinner />;

  if (appointments.length === 0) {
    return (
      <Card className="glass-card p-8 text-center">
        <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No appointment requests yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((a) => (
        <Card key={a.id} className="glass-card p-4 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-blue-500 flex items-center justify-center text-white font-bold">
                {(userNames[a.userId] || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-foreground">{userNames[a.userId] || 'Loading...'}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {a.date}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {a.time}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${statusColors[a.status]} capitalize`}>
                {a.status}
              </Badge>

              {a.status === 'pending' && (
                <>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white gap-1"
                    onClick={() => handleStatus(a.id, 'approved')}
                  >
                    <CheckCircle className="h-4 w-4" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1"
                    onClick={() => handleStatus(a.id, 'rejected')}
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default NutritionistAppointments;
