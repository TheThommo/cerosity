import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { User, Target, Calendar as CalendarIcon, Trophy, Edit3, Save, X, Plus, Clock, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { ChangePasswordCard } from "@/components/change-password-card";
import type { UserGoal } from "@shared/schema";

const goalFormSchema = z.object({
  goalText: z.string().min(5, "Goal must be at least 5 characters"),
  category: z.string().min(1, "Please select a category"),
  notes: z.string().optional(),
  priority: z.number().min(1).max(5),
  targetDate: z.date().optional(),
});

type GoalFormData = z.infer<typeof goalFormSchema>;

const goalCategories = [
  { value: "technical", label: "Technical Skills", color: "bg-blue-100 text-blue-800" },
  { value: "mental", label: "Mental Game", color: "bg-purple-100 text-purple-800" },
  { value: "physical", label: "Physical Fitness", color: "bg-green-100 text-green-800" },
  { value: "strategy", label: "Course Strategy", color: "bg-orange-100 text-orange-800" },
  { value: "equipment", label: "Equipment", color: "bg-gray-100 text-gray-800" },
  { value: "tournament", label: "Tournament", color: "bg-red-100 text-red-800" },
  { value: "other", label: "Other", color: "bg-yellow-100 text-yellow-800" }
];

const priorityLabels = {
  1: { label: "Low", color: "bg-gray-100 text-gray-800" },
  2: { label: "Below Average", color: "bg-blue-100 text-blue-800" },
  3: { label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  4: { label: "High", color: "bg-orange-100 text-orange-800" },
  5: { label: "Critical", color: "bg-red-100 text-red-800" }
};

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<UserGoal | null>(null);

  const [formData, setFormData] = useState({
    username: user?.username || "",
    email: user?.email || "",
    golfHandicap: user?.golfHandicap || 0,
    golfExperience: user?.golfExperience || "",
    goals: user?.goals || "",
    bio: user?.bio || "",
  });

  const goalForm = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      goalText: "",
      category: "",
      notes: "",
      priority: 3,
      targetDate: undefined,
    },
  });

  // Fetch user goals
  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ["/api/goals"],
    enabled: !!user?.id,
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.id) throw new Error("User not found");
      return apiRequest("PATCH", `/api/users/${user.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: async (data: GoalFormData) => {
      const formattedData = {
        ...data,
        targetDate: data.targetDate ? data.targetDate.toISOString() : undefined,
      };
      return apiRequest("POST", "/api/goals", formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: "Goal Created",
        description: "Your new goal has been added successfully.",
      });
      setIsGoalDialogOpen(false);
      goalForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create goal.",
        variant: "destructive",
      });
    },
  });

  // Update goal mutation
  const updateGoalMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<UserGoal> }) => {
      const formattedUpdates = {
        ...data.updates,
        targetDate: data.updates.targetDate instanceof Date 
          ? data.updates.targetDate.toISOString() 
          : data.updates.targetDate,
      };
      return apiRequest("PUT", `/api/goals/${data.id}`, formattedUpdates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: "Goal Updated",
        description: "Your goal has been updated successfully.",
      });
      setEditingGoal(null);
      setIsGoalDialogOpen(false);
      goalForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update goal.",
        variant: "destructive",
      });
    },
  });

  // Toggle completion mutation
  const toggleCompletionMutation = useMutation({
    mutationFn: async (data: { id: number; isCompleted: boolean }) => {
      return apiRequest("PATCH", `/api/goals/${data.id}/toggle`, { isCompleted: data.isCompleted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: "Goal Updated",
        description: "Goal completion status updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update goal.",
        variant: "destructive",
      });
    },
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: "Goal Deleted",
        description: "Your goal has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete goal.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData({
      username: user?.username || "",
      email: user?.email || "",
      golfHandicap: user?.golfHandicap || 0,
      golfExperience: user?.golfExperience || "",
      goals: user?.goals || "",
      bio: user?.bio || "",
    });
    setIsEditing(false);
  };

  const onGoalSubmit = (data: GoalFormData) => {
    if (editingGoal) {
      updateGoalMutation.mutate({ id: editingGoal.id, updates: data });
    } else {
      createGoalMutation.mutate(data);
    }
  };

  const handleEditGoal = (goal: UserGoal) => {
    setEditingGoal(goal);
    goalForm.reset({
      goalText: goal.goalText,
      category: goal.category,
      notes: goal.notes || "",
      priority: goal.priority || 3,
      targetDate: goal.targetDate ? new Date(goal.targetDate) : undefined,
    });
    setIsGoalDialogOpen(true);
  };

  const handleToggleCompletion = (goal: UserGoal) => {
    toggleCompletionMutation.mutate({
      id: goal.id,
      isCompleted: !goal.isCompleted
    });
  };

  const handleDeleteGoal = (goalId: number) => {
    if (confirm("Are you sure you want to delete this goal?")) {
      deleteGoalMutation.mutate(goalId);
    }
  };

  const getCategoryInfo = (category: string) => {
    return goalCategories.find(c => c.value === category) || goalCategories[goalCategories.length - 1];
  };

  const getPriorityInfo = (priority: number | null) => {
    return priorityLabels[priority as keyof typeof priorityLabels] || priorityLabels[3];
  };

  const activeGoals = goals.filter((goal: UserGoal) => !goal.isCompleted);
  const completedGoals = goals.filter((goal: UserGoal) => goal.isCompleted);
  const canAddGoal = activeGoals.length < 3;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-6 w-6 text-blue-600" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Manage your account details and golf information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleInputChange("username", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="golfHandicap">Golf Handicap</Label>
                  <Input
                    id="golfHandicap"
                    type="number"
                    step="0.1"
                    value={formData.golfHandicap}
                    onChange={(e) => handleInputChange("golfHandicap", parseFloat(e.target.value) || 0)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="golfExperience">Golf Experience</Label>
                  <Select
                    value={formData.golfExperience}
                    onValueChange={(value) => handleInputChange("golfExperience", value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner (0-2 years)</SelectItem>
                      <SelectItem value="intermediate">Intermediate (3-7 years)</SelectItem>
                      <SelectItem value="advanced">Advanced (8-15 years)</SelectItem>
                      <SelectItem value="expert">Expert (15+ years)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  disabled={!isEditing}
                  placeholder="Tell us about your golf journey..."
                />
              </div>

              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateProfileMutation.isPending}>
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </>
                ) : (
                  <Button type="button" onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Goals Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-6 w-6 text-green-600" />
                  My Goals
                </CardTitle>
                <CardDescription>
                  Track your golf improvement goals (Maximum 3 active goals)
                </CardDescription>
              </div>
              
              <Dialog open={isGoalDialogOpen} onOpenChange={(open) => {
                setIsGoalDialogOpen(open);
                if (!open) {
                  setEditingGoal(null);
                  goalForm.reset();
                }
              }}>
                <DialogTrigger asChild>
                  <Button 
                    disabled={!canAddGoal} 
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Goal
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingGoal ? "Edit Goal" : "Create New Goal"}</DialogTitle>
                    <DialogDescription>
                      {editingGoal ? "Update your goal details below." : "Set a new goal to track your golf improvement."}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...goalForm}>
                    <form onSubmit={goalForm.handleSubmit(onGoalSubmit)} className="space-y-4">
                      <FormField
                        control={goalForm.control}
                        name="goalText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Goal Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="e.g., Improve putting accuracy from 10 feet to 80%"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={goalForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {goalCategories.map((category) => (
                                  <SelectItem key={category.value} value={category.value}>
                                    {category.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={goalForm.control}
                          name="priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Priority</FormLabel>
                              <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Priority" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.entries(priorityLabels).map(([value, info]) => (
                                    <SelectItem key={value} value={value}>
                                      {info.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={goalForm.control}
                          name="targetDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) =>
                                      date < new Date()
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={goalForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Additional notes or action steps..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-2 pt-4">
                        <Button
                          type="submit"
                          disabled={createGoalMutation.isPending || updateGoalMutation.isPending}
                          className="flex-1"
                        >
                          {editingGoal ? "Update Goal" : "Create Goal"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsGoalDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {goalsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Active Goals */}
                {activeGoals.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      Active Goals ({activeGoals.length}/3)
                    </h3>
                    <div className="space-y-3">
                      {activeGoals.map((goal: UserGoal) => {
                        const categoryInfo = getCategoryInfo(goal.category);
                        const priorityInfo = getPriorityInfo(goal.priority);
                        
                        return (
                          <Card key={goal.id} className="border-l-4 border-l-blue-500">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge className={categoryInfo.color} variant="secondary">
                                      {categoryInfo.label}
                                    </Badge>
                                    <Badge className={priorityInfo.color} variant="secondary">
                                      {priorityInfo.label}
                                    </Badge>
                                  </div>
                                  
                                  <p className="text-sm text-gray-900 mb-2 font-medium">
                                    {goal.goalText}
                                  </p>
                                  
                                  {goal.notes && (
                                    <p className="text-xs text-gray-600 mb-2">
                                      {goal.notes}
                                    </p>
                                  )}
                                  
                                  <div className="flex items-center justify-between">
                                    <div className="text-xs text-gray-500">
                                      {goal.targetDate && (
                                        <span className="flex items-center gap-1">
                                          <CalendarIcon className="h-3 w-3" />
                                          Target: {format(new Date(goal.targetDate), "MMM dd, yyyy")}
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEditGoal(goal)}
                                      >
                                        <Edit3 className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleDeleteGoal(goal.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="ml-4">
                                  <Checkbox
                                    checked={goal.isCompleted || false}
                                    onCheckedChange={() => handleToggleCompletion(goal)}
                                    className="data-[state=checked]:bg-green-600"
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Goal Limit Warning */}
                {!canAddGoal && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-sm text-orange-800">
                      You have reached the maximum of 3 active goals. Complete or delete a goal to add a new one.
                    </p>
                  </div>
                )}

                {/* Completed Goals */}
                {completedGoals.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-green-600" />
                      Completed Goals ({completedGoals.length})
                    </h3>
                    <div className="space-y-3">
                      {completedGoals.slice(0, 5).map((goal: UserGoal) => {
                        const categoryInfo = getCategoryInfo(goal.category);
                        
                        return (
                          <Card key={goal.id} className="border-l-4 border-l-green-500 bg-green-50/50">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge className={categoryInfo.color} variant="secondary">
                                      {categoryInfo.label}
                                    </Badge>
                                    <Badge className="bg-green-100 text-green-800" variant="secondary">
                                      Completed
                                    </Badge>
                                  </div>
                                  
                                  <p className="text-sm text-gray-900 mb-2 font-medium line-through opacity-75">
                                    {goal.goalText}
                                  </p>
                                  
                                  <div className="text-xs text-gray-500">
                                    {goal.completedAt && (
                                      <span className="flex items-center gap-1 text-green-600">
                                        <Trophy className="h-3 w-3" />
                                        Completed: {format(new Date(goal.completedAt), "MMM dd, yyyy")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="ml-4 flex items-center gap-2">
                                  <Checkbox
                                    checked={true}
                                    onCheckedChange={() => handleToggleCompletion(goal)}
                                    className="data-[state=checked]:bg-green-600"
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteGoal(goal.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                      
                      {completedGoals.length > 5 && (
                        <p className="text-sm text-gray-600 text-center">
                          And {completedGoals.length - 5} more completed goals...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {goals.length === 0 && (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Goals Set Yet</h3>
                    <p className="text-gray-600 mb-4">
                      Start tracking your golf improvement by setting specific, measurable goals.
                    </p>
                    <Button 
                      onClick={() => setIsGoalDialogOpen(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Goal
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Info */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  {user?.subscriptionTier === "premium" 
                    ? "Premium Membership" 
                    : user?.subscriptionTier === "ultimate" 
                    ? "Ultimate Membership" 
                    : "Free Tier"}
                </h3>
                <p className="text-sm text-blue-700">
                  {user?.subscriptionTier === "premium" 
                    ? "Unlock advanced features and AI coaching sessions."
                    : user?.subscriptionTier === "ultimate" 
                    ? "Full access to all Red2Blue premium features."
                    : "Upgrade for unlimited goals and advanced analytics."}
                </p>
              </div>
              {(!user?.subscriptionTier || user?.subscriptionTier === "free") && (
                <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                  Upgrade Now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <ChangePasswordCard />
      </div>
    </div>
  );
}