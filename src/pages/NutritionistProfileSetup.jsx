import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { saveNutritionistProfile } from '@/services/nutritionistService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  User,
  Phone,
  GraduationCap,
  Briefcase,
  Clock,
  DollarSign,
  Camera,
  Heart,
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TIME_SLOTS = [
  '9:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 1:00 PM',
  '2:00 PM - 3:00 PM',
  '3:00 PM - 4:00 PM',
  '4:00 PM - 5:00 PM',
  '5:00 PM - 6:00 PM',
];

const NutritionistProfileSetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    phone: '',
    qualification: '',
    specialization: '',
    experience: '',
    consultationFee: '',
    bio: '',
    availableDays: [],
    availableTimeSlots: [],
  });

  const [photoFile, setPhotoFile] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be less than 2 MB', variant: 'destructive' });
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const toggleDay = (day) => {
    setFormData((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day],
    }));
  };

  const toggleSlot = (slot) => {
    setFormData((prev) => ({
      ...prev,
      availableTimeSlots: prev.availableTimeSlots.includes(slot)
        ? prev.availableTimeSlots.filter((s) => s !== slot)
        : [...prev.availableTimeSlots, slot],
    }));
  };

  const validate = () => {
    if (!formData.name.trim()) return 'Full Name is required';
    if (!formData.phone.trim()) return 'Phone Number is required';
    if (!formData.qualification.trim()) return 'Qualification is required';
    if (!formData.specialization.trim()) return 'Specialization is required';
    if (!formData.experience || Number(formData.experience) < 0) return 'Valid experience is required';
    if (!formData.consultationFee || Number(formData.consultationFee) <= 0) return 'Valid consultation fee is required';
    if (!formData.bio.trim()) return 'Bio is required';
    if (formData.availableDays.length === 0) return 'Select at least one available day';
    if (formData.availableTimeSlots.length === 0) return 'Select at least one time slot';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      toast({ title: 'Validation Error', description: error, variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // Use base64 photo (Firebase Storage not configured in this project)
      const photoURL = photoPreview || null;

      await saveNutritionistProfile(user.uid, {
        name: formData.name.trim(),
        email: user.email,
        phone: formData.phone.trim(),
        photoURL,
        qualification: formData.qualification.trim(),
        specialization: formData.specialization.trim(),
        experience: Number(formData.experience),
        consultationFee: Number(formData.consultationFee),
        bio: formData.bio.trim(),
        availableDays: formData.availableDays,
        availableTimeSlots: formData.availableTimeSlots,
      });

      toast({ title: 'Profile Created!', description: 'Your nutritionist profile is now live.' });
      navigate('/nutritionist/dashboard');
    } catch (err) {
      console.error('Profile save error:', err);
      toast({ title: 'Error', description: err.message || 'Failed to save profile.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-background to-secondary-light py-10 px-4">
      <div className="max-w-2xl mx-auto animate-scale-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-lg mb-4">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Complete Your Profile</h1>
          <p className="text-muted-foreground">Fill in your professional details to get started</p>
        </div>

        <Card className="glass-card p-6 md:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Upload */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-28 h-28 rounded-full border-4 border-primary/30 overflow-hidden bg-muted flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <Label htmlFor="photo" className="cursor-pointer text-primary font-medium hover:underline">
                Upload Profile Photo
              </Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Full Name
              </Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Dr. Jane Smith" className="glass-input h-11" required />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" /> Phone Number
              </Label>
              <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="+92 300 1234567" className="glass-input h-11" required />
            </div>

            {/* Qualification */}
            <div className="space-y-2">
              <Label htmlFor="qualification" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" /> Qualification
              </Label>
              <Input id="qualification" name="qualification" value={formData.qualification} onChange={handleChange} placeholder="MSc Nutrition, PhD Dietetics" className="glass-input h-11" required />
            </div>

            {/* Specialization */}
            <div className="space-y-2">
              <Label htmlFor="specialization" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" /> Specialization
              </Label>
              <Input id="specialization" name="specialization" value={formData.specialization} onChange={handleChange} placeholder="Sports Nutrition, Diabetic Diet" className="glass-input h-11" required />
            </div>

            {/* Experience & Fee */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="experience" className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Years of Experience
                </Label>
                <Input id="experience" name="experience" type="number" min="0" value={formData.experience} onChange={handleChange} placeholder="5" className="glass-input h-11" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consultationFee" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" /> Consultation Fee (PKR)
                </Label>
                <Input id="consultationFee" name="consultationFee" type="number" min="0" value={formData.consultationFee} onChange={handleChange} placeholder="2000" className="glass-input h-11" required />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio / About</Label>
              <Textarea id="bio" name="bio" value={formData.bio} onChange={handleChange} placeholder="Write a brief professional bio..." className="glass-input min-h-[100px]" required />
            </div>

            {/* Available Days */}
            <div className="space-y-3">
              <Label>Available Days</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <label
                    key={day}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer smooth-transition text-sm ${
                      formData.availableDays.includes(day)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-background border-border hover:border-primary/50'
                    }`}
                  >
                    <Checkbox
                      checked={formData.availableDays.includes(day)}
                      onCheckedChange={() => toggleDay(day)}
                      className="hidden"
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>

            {/* Available Time Slots */}
            <div className="space-y-3">
              <Label>Available Time Slots</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <label
                    key={slot}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer smooth-transition text-sm ${
                      formData.availableTimeSlots.includes(slot)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-background border-border hover:border-primary/50'
                    }`}
                  >
                    <Checkbox
                      checked={formData.availableTimeSlots.includes(slot)}
                      onCheckedChange={() => toggleSlot(slot)}
                      className="hidden"
                    />
                    {slot}
                  </label>
                ))}
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-12 medical-gradient hover:opacity-90 smooth-transition text-white font-medium shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? <LoadingSpinner size="sm" /> : 'Submit Profile'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default NutritionistProfileSetup;
