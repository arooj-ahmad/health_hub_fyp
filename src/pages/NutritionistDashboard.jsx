import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  getNutritionistProfile,
  getNutritionistConsultations,
} from '@/services/nutritionistService';
import DashboardLayout from '@/components/DashboardLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import NutritionistAppointments from '@/components/NutritionistAppointments';
import NutritionistMessages from '@/components/NutritionistMessages';
import NutritionistProfile from '@/components/NutritionistProfile';
import NutritionistReviews from '@/components/NutritionistReviews';
import { Card } from '@/components/ui/card';
import {
  Users,
  Star,
  Briefcase,
  MessageSquare,
} from 'lucide-react';

const NutritionistDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const data = await getNutritionistProfile(user.uid);
        if (!data) {
          navigate('/nutritionist/setup-profile');
          return;
        }
        setProfile(data);

        const consults = await getNutritionistConsultations(user.uid);
        setMessageCount(consults.length);
      } catch (err) {
        console.error('Error fetching nutritionist profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user, navigate]);

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  if (!profile) return null;

  const stats = [
    { title: 'Total Reviews', value: profile.totalReviews || 0, icon: Users, color: 'from-primary to-primary-glow' },
    { title: 'Rating', value: profile.rating ? profile.rating.toFixed(1) : '0.0', icon: Star, color: 'from-warning to-orange-500' },
    { title: 'Experience', value: `${profile.experience} yrs`, icon: Briefcase, color: 'from-accent to-green-500' },
    { title: 'Messages', value: messageCount, icon: MessageSquare, color: 'from-secondary to-blue-500' },
  ];

  const renderContent = () => {
    switch (tab) {
      case 'messages':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Consultation Messages</h2>
            <NutritionistMessages />
          </div>
        );
      case 'appointments':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Appointment Requests</h2>
            <NutritionistAppointments />
          </div>
        );
      case 'reviews':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">User Reviews</h2>
            <NutritionistReviews />
          </div>
        );
      case 'profile':
        return <NutritionistProfile profile={profile} onProfileUpdate={setProfile} />;
      default:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {stats.map((s) => (
              <Card key={s.title} className="glass-card p-4 md:p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow`}>
                    <s.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm text-muted-foreground">{s.title}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
              </Card>
            ))}
          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-muted flex-shrink-0">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-white text-2xl font-bold">
                {profile.name?.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Welcome, {profile.name}!</h1>
            <p className="text-muted-foreground">
              {profile.specialization} &middot; {profile.qualification}
            </p>
          </div>
        </div>

        {renderContent()}
      </div>
    </DashboardLayout>
  );
};

export default NutritionistDashboard;
