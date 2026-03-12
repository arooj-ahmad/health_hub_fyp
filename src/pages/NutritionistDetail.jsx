import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getNutritionistProfile } from '@/services/nutritionistService';
import DashboardLayout from '@/components/DashboardLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import AppointmentModal from '@/components/AppointmentModal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Star,
  Briefcase,
  GraduationCap,
  Phone,
  Mail,
  Calendar,
  Clock,
  DollarSign,
  MessageSquare,
  CalendarPlus,
} from 'lucide-react';

const NutritionistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getNutritionistProfile(id);
        setProfile(data);
      } catch (err) {
        console.error('Error fetching nutritionist:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-lg text-muted-foreground mb-4">Nutritionist not found.</p>
          <Button onClick={() => navigate('/consult-nutritionist')}>Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back */}
        <Button variant="ghost" className="gap-2" onClick={() => navigate('/consult-nutritionist')}>
          <ArrowLeft className="h-4 w-4" /> Back to Nutritionists
        </Button>

        {/* Profile Header */}
        <Card className="glass-card overflow-hidden">
          <div className="h-44 bg-gradient-to-br from-primary to-primary-glow relative">
            {/* Avatar */}
            <div className="absolute -bottom-14 left-6 w-28 h-28 rounded-2xl border-4 border-background overflow-hidden bg-muted shadow-lg">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-white text-3xl font-bold">
                  {profile.name?.charAt(0)}
                </div>
              )}
            </div>
          </div>

          <div className="pt-16 pb-6 px-6 space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{profile.name}</h1>
              <p className="text-primary font-medium">{profile.specialization}</p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><GraduationCap className="h-4 w-4" /> {profile.qualification}</span>
              <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" /> {profile.experience} years</span>
              <span className="flex items-center gap-1"><Star className="h-4 w-4 text-warning" /> {profile.rating?.toFixed(1) || '0.0'} ({profile.totalReviews || 0} reviews)</span>
            </div>

            <p className="text-foreground">{profile.bio}</p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                className="medical-gradient text-white hover:opacity-90 gap-2"
                onClick={() => navigate(`/consultation/${id}`)}
              >
                <MessageSquare className="h-4 w-4" /> Ask Question
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-primary text-primary hover:bg-primary hover:text-white"
                onClick={() => setShowAppointmentModal(true)}
              >
                <CalendarPlus className="h-4 w-4" /> Book Appointment
              </Button>
            </div>
          </div>
        </Card>

        {/* Contact & Fee */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass-card p-4 flex items-center gap-3">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium truncate">{profile.email}</p>
            </div>
          </Card>
          <Card className="glass-card p-4 flex items-center gap-3">
            <Phone className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm font-medium">{profile.phone}</p>
            </div>
          </Card>
          <Card className="glass-card p-4 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Consultation Fee</p>
              <p className="text-sm font-medium">PKR {profile.consultationFee}</p>
            </div>
          </Card>
        </div>

        {/* Schedule */}
        <Card className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Availability</h2>

          <div>
            <span className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4" /> Available Days
            </span>
            <div className="flex flex-wrap gap-2">
              {profile.availableDays?.map((day) => (
                <span key={day} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  {day}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4" /> Time Slots
            </span>
            <div className="flex flex-wrap gap-2">
              {profile.availableTimeSlots?.map((slot) => (
                <span key={slot} className="px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium">
                  {slot}
                </span>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Appointment Modal */}
      {showAppointmentModal && (
        <AppointmentModal
          nutritionistId={id}
          nutritionistName={profile.name}
          availableTimeSlots={profile.availableTimeSlots}
          onClose={() => setShowAppointmentModal(false)}
        />
      )}
    </DashboardLayout>
  );
};

export default NutritionistDetail;
