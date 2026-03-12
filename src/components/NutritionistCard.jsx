import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Briefcase, Award } from 'lucide-react';

const NutritionistCard = ({ nutritionist, onViewProfile }) => {
  const n = nutritionist;

  return (
    <Card className="glass-card overflow-hidden hover-lift smooth-transition group">
      {/* Photo */}
      <div className="h-48 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden">
        {n.photoURL ? (
          <img
            src={n.photoURL}
            alt={n.name}
            className="w-full h-full object-cover group-hover:scale-105 smooth-transition"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-white text-4xl font-bold">
            {n.name?.charAt(0)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5 space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{n.name}</h3>
          <p className="text-sm text-primary font-medium">{n.specialization}</p>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Briefcase className="h-4 w-4" />
            {n.experience} yrs
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 text-warning" />
            {n.rating ? n.rating.toFixed(1) : '0.0'}
          </span>
          <span className="flex items-center gap-1">
            <Award className="h-4 w-4" />
            {n.qualification}
          </span>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">{n.bio}</p>

        <div className="flex items-center justify-between pt-2">
          <span className="text-sm font-semibold text-foreground">
            PKR {n.consultationFee}
          </span>
          <Button
            size="sm"
            className="medical-gradient text-white hover:opacity-90"
            onClick={() => onViewProfile(n.id)}
          >
            View Profile
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default NutritionistCard;
