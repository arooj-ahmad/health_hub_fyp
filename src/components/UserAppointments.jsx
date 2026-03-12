import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserAppointments as fetchAppointments } from '@/services/nutritionistService';
import { getNutritionistProfile } from '@/services/nutritionistService';
import { hasUserReviewedAppointment } from '@/services/reviewService';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/LoadingSpinner';
import ReviewModal from '@/components/ReviewModal';
import StarRating from '@/components/StarRating';
import { Calendar, Clock, CheckCircle, XCircle, Hourglass, Star } from 'lucide-react';

const statusConfig = {
  pending: { color: 'bg-warning/10 text-warning border-warning/30', icon: Hourglass, label: 'Pending' },
  approved: { color: 'bg-green-500/10 text-green-600 border-green-500/30', icon: CheckCircle, label: 'Approved' },
  rejected: { color: 'bg-destructive/10 text-destructive border-destructive/30', icon: XCircle, label: 'Rejected' },
};

const UserAppointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [nutritionistNames, setNutritionistNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [reviewedMap, setReviewedMap] = useState({});
  const [reviewModalAppointment, setReviewModalAppointment] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const data = await fetchAppointments(user.uid);
        setAppointments(data);
        // Fetch nutritionist names
        const uniqueIds = [...new Set(data.map((a) => a.nutritionistId))];
        const nameMap = {};
        await Promise.all(
          uniqueIds.map(async (nid) => {
            const profile = await getNutritionistProfile(nid);
            nameMap[nid] = profile?.name || 'Nutritionist';
          })
        );
        setNutritionistNames(nameMap);

        // Check which approved appointments are already reviewed
        const approvedAppts = data.filter((a) => a.status === 'approved');
        const reviewed = {};
        await Promise.all(
          approvedAppts.map(async (a) => {
            reviewed[a.id] = await hasUserReviewedAppointment(user.uid, a.id);
          })
        );
        setReviewedMap(reviewed);
      } catch (err) {
        console.error('Error loading user appointments:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleReviewSubmitted = (appointmentId) => {
    setReviewedMap((prev) => ({ ...prev, [appointmentId]: true }));
  };

  if (loading) return <LoadingSpinner />;

  if (appointments.length === 0) {
    return (
      <Card className="glass-card p-8 text-center">
        <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">You have no appointments yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((a) => {
        const config = statusConfig[a.status] || statusConfig.pending;
        const StatusIcon = config.icon;
        return (
          <Card key={a.id} className="glass-card p-4 md:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  a.status === 'approved' ? 'bg-green-500/20' : a.status === 'rejected' ? 'bg-destructive/20' : 'bg-warning/20'
                }`}>
                  <StatusIcon className={`h-5 w-5 ${
                    a.status === 'approved' ? 'text-green-600' : a.status === 'rejected' ? 'text-destructive' : 'text-warning'
                  }`} />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {nutritionistNames[a.nutritionistId] || 'Loading...'}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {a.date}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {a.time}</span>
                  </div>
                </div>
              </div>

              <Badge variant="outline" className={`${config.color} capitalize`}>
                {config.label}
              </Badge>
            </div>

            {a.status === 'approved' && (
              <div className="mt-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Your appointment with {nutritionistNames[a.nutritionistId]} has been approved.
                </p>
                {reviewedMap[a.id] ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Star className="h-3 w-3 fill-warning text-warning" /> Reviewed
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 border-warning text-warning hover:bg-warning hover:text-white"
                    onClick={() => setReviewModalAppointment(a)}
                  >
                    <Star className="h-4 w-4" /> Rate Nutritionist
                  </Button>
                )}
              </div>
            )}

            {a.status === 'rejected' && (
              <div className="mt-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-sm text-destructive flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  This appointment was declined. You may try booking another slot.
                </p>
              </div>
            )}
          </Card>
        );
      })}

      {/* Review Modal */}
      {reviewModalAppointment && (
        <ReviewModal
          appointment={reviewModalAppointment}
          nutritionistName={nutritionistNames[reviewModalAppointment.nutritionistId] || 'Nutritionist'}
          onClose={() => setReviewModalAppointment(null)}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
    </div>
  );
};

export default UserAppointments;
