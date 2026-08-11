import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Bell, Menu, X, BarChart3, MessageCircle, Zap, Wrench, Users, Trophy, User, Settings, LogOut, Lightbulb, HelpCircle, Target, ClipboardCheck, BookOpen } from "lucide-react";
import { CerosityLogo } from "@/components/cerosity-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { canAccessDashboard } from "@/lib/permissions";

export function Navigation() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Navigation items based on subscription tier
  const getNavItems = () => {
    const baseItems = [];

    // Dashboard for FLO/Premium/Ultimate users. FLO subscribers were falling
    // through to free permissions and rendering an empty nav (audit A4).
    if (canAccessDashboard(user)) {
      baseItems.push({ href: "/dashboard", label: "Dashboard", icon: BarChart3 });
    }

    // Learning curriculum — available to every signed-in user (free sees a preview)
    baseItems.push({ href: "/learn", label: "Curriculum", icon: BookOpen });

    // Only show Help button in header for free users (subscribed users see it in footer only)
    // Admin users should never see Help button
    if ((!user?.isSubscribed || user?.subscriptionTier === 'free') && user?.role !== 'admin') {
      baseItems.push({ href: "/help", label: "Help", icon: HelpCircle });
    }

    // Add Human Coaching for Ultimate subscribers
    if (user?.subscriptionTier === 'ultimate') {
      baseItems.push({ href: "/human-coaching", label: "Human Coaching", icon: MessageCircle });
    }

    // Add admin/coach-only items
    if (user?.role === 'admin' || user?.role === 'coach') {
      baseItems.push({ href: "/coach", label: "Coach Dashboard", icon: Users });
    }
    
    // Add admin-only items
    if (user?.role === 'admin') {
      baseItems.push({ href: "/admin", label: "Admin Panel", icon: Settings });
    }

    return baseItems;
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <CerosityLogo size={24} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold text-gray-900">Cerosity</h1>
                  {user?.subscriptionTier === 'ultimate' && (
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-2 py-1 rounded text-xs font-bold">
                      ULTIMATE
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {user?.subscriptionTier === 'ultimate' ? 'AI + Human Coaching' : 'AI Mental Coach'}
                </p>
              </div>
            </Link>

            {/* Desktop Navigation Items */}
            <div className="hidden md:flex items-center space-x-6 ml-8">
              {navItems.map((item) => {
                const isActive = location === item.href;
                
                // Special handling for Home button to ensure it works
                if (item.href === "/") {
                  return (
                    <button
                      key={item.href}
                      onClick={() => window.location.href = "/"}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? "bg-blue-primary text-white"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      <item.icon size={18} />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                }
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? "bg-blue-primary text-white"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    <item.icon size={18} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Bell size={20} />
              </Button>
              
              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full bg-blue-primary hover:bg-blue-600">
                    <span className="text-white text-sm font-medium">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user?.username}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Trigger */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden p-2"
                  >
                    <Menu size={20} />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72">
                  <div className="flex flex-col h-full">
                    
                    {/* Mobile Header */}
                    <div className="flex items-center justify-between pb-6 border-b">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                          <CerosityLogo size={24} />
                        </div>
                        <div>
                          <h1 className="text-lg font-bold text-gray-900">Cerosity</h1>
                          <p className="text-xs text-gray-500">AI Mental Coach</p>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Navigation Items */}
                    <div className="flex-1 py-6">
                      <div className="space-y-2">
                        {navItems.map((item) => {
                          const isActive = location === item.href;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center space-x-3 w-full px-4 py-3 rounded-lg transition-colors ${
                                isActive
                                  ? "bg-blue-primary text-white"
                                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                              }`}
                            >
                              <item.icon size={20} />
                              <span className="font-medium">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mobile Footer */}
                    <div className="border-t pt-6">
                      <div className="flex items-center space-x-3 px-4 py-3">
                        <div className="w-10 h-10 bg-blue-primary rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">F</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Flo</p>
                          <p className="text-sm text-gray-500">Your AI Coach</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-40">
        <div className="grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-3 px-2 transition-colors ${
                  isActive ? "text-blue-primary" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <item.icon size={20} className="mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
          
          {/* AI Coach Quick Access */}
          <button className="flex flex-col items-center py-3 px-2 text-gray-400 hover:text-gray-600 transition-colors">
            <MessageCircle size={20} className="mb-1" />
            <span className="text-xs font-medium">Coach</span>
          </button>
        </div>
      </div>
    </>
  );
}
