import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Search, X, Sparkles, ChefHat } from 'lucide-react';

const QUICK_SUGGESTIONS = [
  { label: 'Chicken Curry', emoji: '🍗', value: 'chicken, tomato, onion, spices, oil' },
  { label: 'Daal Chawal', emoji: '🍲', value: 'daal, chawal, onion, garlic, oil, haldi' },
  { label: 'Aloo Gobi', emoji: '🥘', value: 'aloo, gobi, tomato, spices, oil' },
  { label: 'Chapati Meal', emoji: '🌯', value: 'atta, sabzi, dahi, salad' },
  { label: 'Keema Masala', emoji: '🍛', value: 'keema, tomato, onion, mirch, oil' },
  { label: 'Palak Paneer', emoji: '🥗', value: 'palak, paneer, onion, garlic, cream' },
  { label: 'Biryani', emoji: '🍚', value: 'chawal, chicken, onion, dahi, spices, oil' },
  { label: 'Egg Fried Rice', emoji: '🍳', value: 'anda, chawal, sabzi, soy sauce, oil' },
];

const IngredientInput = ({ onSubmit, isLoading, disabled }) => {
  const [inputValue, setInputValue] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const inputRef = useRef(null);

  const addIngredient = (text) => {
    const items = text
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !ingredients.includes(s.toLowerCase()));

    if (items.length > 0) {
      setIngredients((prev) => [...prev, ...items.map((i) => i.toLowerCase())]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addIngredient(inputValue);
        setInputValue('');
      }
    }
    if (e.key === 'Backspace' && inputValue === '' && ingredients.length > 0) {
      setIngredients((prev) => prev.slice(0, -1));
    }
  };

  const removeIngredient = (index) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    let allIngredients = [...ingredients];
    if (inputValue.trim()) {
      const extras = inputValue.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
      allIngredients = [...allIngredients, ...extras];
      setInputValue('');
    }

    if (allIngredients.length === 0) return;

    setIngredients(allIngredients);
    onSubmit(allIngredients.join(', '));
  };

  const handleQuickSuggestion = (value) => {
    const items = value.split(',').map((s) => s.trim().toLowerCase());
    setIngredients(items);
    setInputValue('');
  };

  const clearAll = () => {
    setIngredients([]);
    setInputValue('');
    inputRef.current?.focus();
  };

  return (
    <Card className="glass-card p-6">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          <div>
            <Label className="text-lg font-semibold block">Enter Your Ingredients</Label>
            <p className="text-sm text-muted-foreground">
              Type ingredients separated by commas. You can use Urdu names too!
            </p>
          </div>
        </div>

        {/* Tag-style ingredient input */}
        <div
          className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-input bg-background min-h-[52px] cursor-text focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
          onClick={() => inputRef.current?.focus()}
        >
          {ingredients.map((ing, i) => (
            <Badge
              key={`${ing}-${i}`}
              variant="secondary"
              className="flex items-center gap-1 px-3 py-1.5 text-sm"
            >
              {ing}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeIngredient(i);
                }}
                className="ml-1 rounded-full hover:bg-foreground/10 p-0.5"
                disabled={isLoading}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={ingredients.length === 0 ? 'e.g., chicken, aloo, tamatar, dahi...' : 'Add more...'}
            className="flex-1 min-w-[150px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            disabled={isLoading || disabled}
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            className="medical-gradient text-white gap-2 h-11 px-6"
            onClick={handleSubmit}
            disabled={isLoading || disabled || (ingredients.length === 0 && !inputValue.trim())}
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Recipes
              </>
            )}
          </Button>
          {ingredients.length > 0 && (
            <Button variant="outline" onClick={clearAll} disabled={isLoading} className="gap-2">
              <X className="h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>

        {/* Quick Pakistani suggestions */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">Quick Suggestions (Pakistani Meals)</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {QUICK_SUGGESTIONS.map((suggestion) => (
              <Button
                key={suggestion.label}
                variant="outline"
                className="h-auto py-3 flex flex-col gap-1.5 hover:bg-primary/5 hover:border-primary/30"
                onClick={() => handleQuickSuggestion(suggestion.value)}
                disabled={isLoading || disabled}
              >
                <span className="text-2xl">{suggestion.emoji}</span>
                <span className="text-xs font-medium">{suggestion.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default IngredientInput;
