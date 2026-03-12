import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { updateNutritionistProfile } from '@/services/nutritionistService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Phone,
  GraduationCap,
  Briefcase,
  Clock,
  DollarSign,
  Calendar,
  Edit3,
  Save,
  X,
  User,
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

const NutritionistProfile = ({ profile, onProfileUpdate }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const getInitialForm = () => ({
    name: profile.name || '',
    phone: profile.phone || '',
    qualification: profile.qualification || '',
    specialization: profile.specialization || '',
    experience: profile.experience || '',
    consultationFee: profile.consultationFee || '',
    bio: profile.bio || '',
    availableDays: profile.availableDays || [],
    availableTimeSlots: profile.availableTimeSlots || [],
  });

  const [formData, setFormData] = useState(getInitialForm);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

  const handleCancel = () => {
    setFormData(getInitialForm());
    setEditing(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const updates = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        qualification: formData.qualification.trim(),
        specialization: formData.specialization.trim(),
        experience: Number(formData.experience),
        consultationFee: Number(formData.consultationFee),
        bio: formData.bio.trim(),
        availableDays: formData.availableDays,
        availableTimeSlots: formData.availableTimeSlots,
      };
      await updateNutritionistProfile(user.uid, updates);
      onProfileUpdate({ ...profile, ...updates });
      setEditing(false);
      toast({ title: 'Profile Updated!', description: 'Your changes have been saved.' });
    } catch (err) {
      console.error('Update error:', err);
      toast({ title: 'Error', description: 'Failed to update profile.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Your Profile</h2>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-2">
            <Edit3 className="h-4 w-4" /> Edit Profile
          </Button>
        </div>

        <Card className="glass-card p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Name:</span>
              <p className="font-medium">{profile.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>
              <p className="font-medium">{profile.email}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Phone:</span>
              <p className="font-medium">{profile.phone}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Qualification:</span>
              <p className="font-medium">{profile.qualification}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Specialization:</span>
              <p className="font-medium">{profile.specialization}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Experience:</span>
              <p className="font-medium">{profile.experience} years</p>
            </div>
            <div>
              <span className="text-muted-foreground">Consultation Fee:</span>
              <p className="font-medium">PKR {profile.consultationFee}</p>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-muted-foreground text-sm">Bio:</span>
            <p className="mt-1 text-foreground">{profile.bio}</p>
          </div>
        </Card>

        <Card className="glass-card p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Your Schedule</h2>
          <div className="space-y-3">
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
          </div>
        </Card>
      </div>
    );
  }

  // Edit Mode
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Edit Profile</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel} className="gap-2">
            <X className="h-4 w-4" /> Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2 medical-gradient text-white">
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <Card className="glass-card p-6 space-y-5">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Full Name
          </Label>
          <Input id="name" name="name" value={formData.name} onChange={handleChange} className="glass-input h-11" />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" /> Phone Number
          </Label>
          <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} className="glass-input h-11" />
        </div>

        {/* Qualification */}
        <div className="space-y-2">
          <Label htmlFor="qualification" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" /> Qualification
          </Label>
          <Input id="qualification" name="qualification" value={formData.qualification} onChange={handleChange} className="glass-input h-11" />
        </div>

        {/* Specialization */}
        <div className="space-y-2">
          <Label htmlFor="specialization" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" /> Specialization
          </Label>
          <Input id="specialization" name="specialization" value={formData.specialization} onChange={handleChange} className="glass-input h-11" />
        </div>

        {/* Experience & Fee */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="experience" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Years of Experience
            </Label>
            <Input id="experience" name="experience" type="number" min="0" value={formData.experience} onChange={handleChange} className="glass-input h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="consultationFee" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> Consultation Fee (PKR)
            </Label>
            <Input id="consultationFee" name="consultationFee" type="number" min="0" value={formData.consultationFee} onChange={handleChange} className="glass-input h-11" />
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio">Bio / About</Label>
          <Textarea id="bio" name="bio" value={formData.bio} onChange={handleChange} className="glass-input min-h-[100px]" />
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
      </Card>
    </div>
  );
};

export default NutritionistProfile;
