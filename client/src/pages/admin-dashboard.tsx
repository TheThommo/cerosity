import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  Activity, 
  Settings,
  Search,
  Download,
  Mail,
  Calendar,
  DollarSign,
  UserCheck,
  UserX,
  Crown,
  Star
} from "lucide-react";
import { format } from "date-fns";

interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  subscriptionTier: string;
  isSubscribed: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  totalRevenue: number;
  freeUsers: number;
  premiumUsers: number;
  ultimateUsers: number;
  newUsersThisMonth: number;
  churnRate: number;
}

interface Payment {
  id: string;
  userId: number;
  amount: number;
  currency: string;
  status: string;
  description: string;
  subscriptionTier: string;
  createdAt: string;
  userEmail: string;
  userName: string;
}

interface UserMood {
  id: number;
  userId: number;
  mood: number;
  energy: number;
  stress: number;
  notes?: string;
  date: string;
}

interface UserAssessment {
  id: number;
  userId: number;
  score: number;
  responses: any;
  createdAt: string;
}

interface UserProgress {
  id: number;
  userId: number;
  scenarioId: number;
  score: number;
  accuracy: number;
  timeSpent: number;
  improvements?: string;
  createdAt: string;
}

interface UserGoal {
  id: number;
  userId: number;
  title: string;
  description?: string;
  category: string;
  targetValue: number;
  currentValue: number;
  isCompleted: boolean;
  dueDate?: string;
  createdAt: string;
}

interface UserDetails {
  moods: UserMood[];
  assessments: UserAssessment[];
  progress: UserProgress[];
  goals: UserGoal[];
  engagementMetrics: any[];
}

/** GET a list endpoint with the filter controls actually attached to the URL. */
async function fetchFiltered<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const trimmed = value?.trim();
    if (trimmed && trimmed !== "all") qs.set(key, trimmed);
  }
  const query = qs.toString();
  const res = await fetch(query ? `${path}?${query}` : path, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

export default function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userFilter, setUserFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch admin statistics
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  // Fetch all users with filtering.
  // The default queryFn fetches queryKey[0] and ignores the rest, so these
  // controls used to change the cache key and refetch the same unfiltered
  // URL — the filter and search boxes did nothing. The server has always
  // supported ?filter and ?search; this actually sends them.
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users", userFilter, searchTerm],
    queryFn: () => fetchFiltered<User[]>("/api/admin/users", { filter: userFilter, search: searchTerm }),
  });

  // Fetch payment history
  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/admin/payments", paymentFilter],
    queryFn: () => fetchFiltered<Payment[]>("/api/admin/payments", { filter: paymentFilter }),
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: number; updates: Partial<User> }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "User Updated",
        description: "User details updated successfully",
      });
      setSelectedUser(null);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update user details",
        variant: "destructive",
      });
    },
  });

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async ({ userIds, subject, message }: { userIds: number[]; subject: string; message: string }) => {
      return apiRequest("POST", "/api/admin/send-email", { userIds, subject, message });
    },
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: "Email sent successfully to selected users",
      });
    },
    onError: () => {
      toast({
        title: "Email Failed",
        description: "Failed to send email",
        variant: "destructive",
      });
    },
  });

  const handleUpdateUser = (updates: Partial<User>) => {
    if (!selectedUser) return;
    updateUserMutation.mutate({ userId: selectedUser.id, updates });
  };

  const getSubscriptionBadge = (tier: string, isSubscribed: boolean) => {
    if (!isSubscribed) return <Badge variant="secondary">Free</Badge>;
    
    switch (tier) {
      case "premium":
        return <Badge className="bg-blue-500 text-white"><Star className="w-3 h-3 mr-1" />Premium</Badge>;
      case "ultimate":
        return <Badge className="bg-purple-500 text-white"><Crown className="w-3 h-3 mr-1" />Ultimate</Badge>;
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500 text-white">Admin</Badge>;
      case "coach":
        return <Badge className="bg-green-500 text-white">Coach</Badge>;
      default:
        return <Badge variant="outline">Student</Badge>;
    }
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage users, payments, and platform analytics</p>
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.newUsersThisMonth || 0} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeSubscriptions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.premiumUsers || 0} Premium, {stats?.ultimateUsers || 0} Ultimate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.monthlyRevenue || 0}</div>
            <p className="text-xs text-muted-foreground">
              ${stats?.totalRevenue || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.churnRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="progress">User Progress</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user accounts, subscriptions, and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="free">Free Users</SelectItem>
                    <SelectItem value="premium">Premium Users</SelectItem>
                    <SelectItem value="ultimate">Ultimate Users</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                    <SelectItem value="coach">Coaches</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.firstName} {user.lastName}</div>
                              <div className="text-sm text-muted-foreground">@{user.username}</div>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {user.role === 'admin' ? (
                              <Badge variant="outline" className="text-gray-500">N/A</Badge>
                            ) : (
                              getSubscriptionBadge(user.subscriptionTier, user.isSubscribed)
                            )}
                          </TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell>
                            {format(new Date(user.createdAt), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedUser(user)}
                                >
                                  Edit
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Edit User</DialogTitle>
                                  <DialogDescription>
                                    Update user details and permissions
                                  </DialogDescription>
                                </DialogHeader>
                                {selectedUser && (
                                  <UserEditForm 
                                    user={selectedUser} 
                                    onSave={handleUpdateUser}
                                    isLoading={updateUserMutation.isPending}
                                  />
                                )}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Progress Monitoring</CardTitle>
              <CardDescription>
                Comprehensive user activity and mental health progress tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {users.map((user) => (
                  <UserProgressCard key={user.id} user={user} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                View and manage all payment transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter payments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="successful">Successful</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentsLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{payment.userName}</div>
                              <div className="text-sm text-muted-foreground">{payment.userEmail}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            ${payment.amount} {payment.currency.toUpperCase()}
                          </TableCell>
                          <TableCell>
                            {getSubscriptionBadge(payment.subscriptionTier, true)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={payment.status === "successful" ? "default" : 
                                      payment.status === "pending" ? "secondary" : "destructive"}
                            >
                              {payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(payment.createdAt), "MMM dd, yyyy HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Analytics</CardTitle>
                <CardDescription>
                  Comprehensive insights into platform performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Advanced analytics coming soon...
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>
                Configure platform-wide settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Platform settings coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UserProgressCard({ user }: { user: User }) {
  // Skip admin users
  if (user.role === 'admin') {
    return null;
  }

  const getSubscriptionBadge = (tier: string, isSubscribed: boolean) => {
    if (!isSubscribed) return <Badge variant="secondary">Free</Badge>;
    
    switch (tier) {
      case "premium":
        return <Badge className="bg-blue-500 text-white"><Star className="w-3 h-3 mr-1" />Premium</Badge>;
      case "ultimate":
        return <Badge className="bg-purple-500 text-white"><Crown className="w-3 h-3 mr-1" />Ultimate</Badge>;
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500 text-white">Admin</Badge>;
      case "coach":
        return <Badge className="bg-green-500 text-white">Coach</Badge>;
      default:
        return <Badge variant="outline">Student</Badge>;
    }
  };

  // Fetch user progress data
  const { data: userMoods = [], isLoading: moodsLoading } = useQuery<UserMood[]>({
    queryKey: ["/api/admin/users", user.id, "moods"],
  });

  const { data: userAssessments = [], isLoading: assessmentsLoading } = useQuery<UserAssessment[]>({
    queryKey: ["/api/admin/users", user.id, "assessments"],
  });

  const { data: userProgress = [], isLoading: progressLoading } = useQuery<UserProgress[]>({
    queryKey: ["/api/admin/users", user.id, "progress"],
  });

  const { data: userGoals = [], isLoading: goalsLoading } = useQuery<UserGoal[]>({
    queryKey: ["/api/admin/users", user.id, "goals"],
  });

  const isLoading = moodsLoading || assessmentsLoading || progressLoading || goalsLoading;

  const getMoodAverage = () => {
    if (userMoods.length === 0) return "No data";
    const avg = userMoods.reduce((sum, mood) => sum + mood.mood, 0) / userMoods.length;
    return avg.toFixed(1) + "/10";
  };

  const getLatestAssessmentScore = () => {
    if (userAssessments.length === 0) return "No assessments";
    return userAssessments[0]?.score + "%";
  };

  const getProgressStats = () => {
    if (userProgress.length === 0) return { scenarios: 0, avgScore: "No data" };
    const avgScore = userProgress.reduce((sum, p) => sum + p.score, 0) / userProgress.length;
    return { scenarios: userProgress.length, avgScore: avgScore.toFixed(1) + "%" };
  };

  const getGoalCompletion = () => {
    if (userGoals.length === 0) return "No goals";
    const completed = userGoals.filter(g => g.isCompleted).length;
    return `${completed}/${userGoals.length} completed`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{user.firstName} {user.lastName}</CardTitle>
            <CardDescription>@{user.username} • {user.email}</CardDescription>
          </div>
          <div className="flex gap-2">
            {getSubscriptionBadge(user.subscriptionTier, user.isSubscribed)}
            {getRoleBadge(user.role)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Mood Tracking */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <h4 className="font-medium text-blue-900 dark:text-blue-100">Mood Tracking</h4>
              </div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{getMoodAverage()}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {userMoods.length} mood entries
              </p>
              {userMoods.length > 0 && userMoods[0]?.date && (() => {
                const date = new Date(userMoods[0].date);
                return !isNaN(date.getTime()) ? (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Latest: {format(date, "MMM dd")}
                  </p>
                ) : null;
              })()}
            </div>

            {/* Assessment Performance */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <h4 className="font-medium text-green-900 dark:text-green-100">Assessments</h4>
              </div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{getLatestAssessmentScore()}</p>
              <p className="text-sm text-green-600 dark:text-green-400">
                {userAssessments.length} assessments taken
              </p>
              {userAssessments.length > 0 && userAssessments[0]?.createdAt && (() => {
                const date = new Date(userAssessments[0].createdAt);
                return !isNaN(date.getTime()) ? (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Latest: {format(date, "MMM dd")}
                  </p>
                ) : null;
              })()}
            </div>

            {/* Scenario Progress */}
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 text-purple-600" />
                <h4 className="font-medium text-purple-900 dark:text-purple-100">Scenarios</h4>
              </div>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{getProgressStats().avgScore}</p>
              <p className="text-sm text-purple-600 dark:text-purple-400">
                {getProgressStats().scenarios} scenarios completed
              </p>
            </div>

            {/* Goals Progress */}
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-orange-600" />
                <h4 className="font-medium text-orange-900 dark:text-orange-100">Goals</h4>
              </div>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{getGoalCompletion()}</p>
              <p className="text-sm text-orange-600 dark:text-orange-400">
                Goal completion rate
              </p>
            </div>
          </div>
        )}

        {/* Recent Activity Summary */}
        {!isLoading && (userMoods.length > 0 || userAssessments.length > 0 || userProgress.length > 0) && (
          <div className="mt-6 pt-4 border-t">
            <h5 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Recent Activity</h5>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {userMoods.slice(0, 2).map((mood) => {
                const date = mood.date ? new Date(mood.date) : null;
                return date && !isNaN(date.getTime()) ? (
                  <div key={mood.id} className="flex items-center gap-2">
                    <Activity className="w-3 h-3" />
                    <span>Mood logged: {mood.mood}/10 on {format(date, "MMM dd")}</span>
                  </div>
                ) : null;
              })}
              {userAssessments.slice(0, 1).map((assessment) => {
                const date = assessment.createdAt ? new Date(assessment.createdAt) : null;
                return date && !isNaN(date.getTime()) ? (
                  <div key={assessment.id} className="flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" />
                    <span>Assessment completed: {assessment.score}% on {format(date, "MMM dd")}</span>
                  </div>
                ) : null;
              })}
              {userProgress.slice(0, 1).map((progress) => {
                const date = progress.createdAt ? new Date(progress.createdAt) : null;
                return date && !isNaN(date.getTime()) ? (
                  <div key={progress.id} className="flex items-center gap-2">
                    <Crown className="w-3 h-3" />
                    <span>Scenario completed: {progress.score}% score on {format(date, "MMM dd")}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UserEditForm({ 
  user, 
  onSave, 
  isLoading 
}: { 
  user: User; 
  onSave: (updates: Partial<User>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email,
    role: user.role,
    subscriptionTier: user.subscriptionTier,
    isSubscribed: user.isSubscribed,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="role">Role</Label>
        <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="coach">Coach</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="subscriptionTier">Subscription Tier</Label>
        <Select 
          value={formData.subscriptionTier} 
          onValueChange={(value) => setFormData({ 
            ...formData, 
            subscriptionTier: value,
            isSubscribed: value !== "free"
          })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="ultimate">Ultimate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}