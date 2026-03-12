import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllNutritionists } from '@/services/nutritionistService';
import DashboardLayout from '@/components/DashboardLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import NutritionistCard from '@/components/NutritionistCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

const ConsultNutritionist = () => {
  const navigate = useNavigate();
  const [nutritionists, setNutritionists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getAllNutritionists();
        setNutritionists(data);
      } catch (err) {
        console.error('Error fetching nutritionists:', err);
        setError('Failed to load nutritionists. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-destructive text-lg mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 md:space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Consult a Nutritionist</h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Browse our verified nutritionists and book a consultation
          </p>
        </div>

        {nutritionists.length === 0 ? (
          <Card className="glass-card p-10 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">No nutritionists available yet. Check back soon!</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {nutritionists.map((n) => (
              <NutritionistCard
                key={n.id}
                nutritionist={n}
                onViewProfile={(nid) => navigate(`/nutritionist/${nid}`)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ConsultNutritionist;
