"use client"

import { useTheme } from "next-themes"
import { useUser, useFirestore } from "@/appwrite"
import { useProfile } from "@/context/ProfileContext"
import { doc, updateDoc } from '@/appwrite'
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { convertProfileData } from "@/lib/currencyConverter"
import { Monitor, Moon, Sun, Globe, CheckCircle2, DollarSign } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user } = useUser();
  const { currentProfile, profiles, setCurrentProfile } = useProfile();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [workspaceName, setWorkspaceName] = useState(currentProfile?.name || "");
  const [workspaceDesc, setWorkspaceDesc] = useState(currentProfile?.description || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isCurrencySaving, setIsCurrencySaving] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);

  useEffect(() => {
    if (currentProfile) {
      setWorkspaceName(currentProfile.name);
      setWorkspaceDesc(currentProfile.description || "");
    }
  }, [currentProfile]);

  const handleSaveWorkspace = async () => {
    if (!user || !currentProfile) return;
    setIsSaving(true);
    try {
      const profileRef = doc(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}`);
      await updateDoc(profileRef, {
        name: workspaceName,
        description: workspaceDesc
      });
      toast({
        title: "Success",
        description: "Workspace changes saved successfully.",
      });
    } catch (error) {
      console.error("Error updating workspace:", error);
      toast({
        title: "Error",
        description: "Failed to update workspace.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const handleCurrencyChange = async (newCurrency: string) => {
    setPendingCurrency(newCurrency);
    setCurrencyModalOpen(true);
  }

  const confirmCurrencyChange = async (convertData: boolean) => {
    if (!user || !currentProfile || !pendingCurrency) return;
    const newCurrency = pendingCurrency;
    const oldCurrency = currentProfile.currency || 'USD';
    
    setCurrencyModalOpen(false);
    setIsCurrencySaving(true);
    
    try {
      if (convertData) {
        toast({ title: "Converting Data", description: "Fetching exchange rates and updating your data in the background..." });
        await convertProfileData({
          firestore,
          userId: user.uid,
          profileId: currentProfile.id,
          fromCurrency: oldCurrency,
          toCurrency: newCurrency
        });
      }

      const profileRef = doc(firestore, `users/${user.uid}/userProfiles/${currentProfile.id}`);
      await updateDoc(profileRef, {
        currency: newCurrency
      });
      // Eagerly update local state so changes reflect instantly across the UI
      setCurrentProfile({ ...currentProfile, currency: newCurrency } as any);
      
      toast({
        title: "Currency Updated",
        description: convertData 
          ? `All funds successfully converted to ${newCurrency}.` 
          : `Currency preferences have been saved to ${newCurrency}.`,
      });
    } catch (error) {
      console.error("Error updating currency:", error);
      toast({
        title: "Conversion Error",
        description: "An error occurred while updating the currency / funds.",
        variant: "destructive",
      });
    } finally {
      setIsCurrencySaving(false);
      setPendingCurrency(null);
    }
  }

  return (
    <div className="flex-1 space-y-4">
      <div>
        <h2 className="text-4xl font-extrabold font-display tracking-tight">Settings</h2>
        <p className="text-lg font-medium text-muted-foreground/80 mt-1">Manage your app appearance, curated preferences, and profile.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-8">
        <TabsList className="bg-transparent border-b border-surface-low w-full justify-start rounded-none p-0 h-14">
          <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-8 font-bold text-muted-foreground transition-all h-14 uppercase tracking-widest text-xs">Profile</TabsTrigger>
          <TabsTrigger value="preferences" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-8 font-bold text-muted-foreground transition-all h-14 uppercase tracking-widest text-xs">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="preferences" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-card border-none shadow-sm rounded-[24px]">
              <CardHeader className="px-8 pt-8">
                <CardTitle className="text-xl font-bold font-display flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sun className="h-4 w-4 text-primary" />
                  </div>
                  Appearance
                </CardTitle>
                <CardDescription className="opacity-0 h-0 m-0">Setup fin track appearance rules.</CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8 space-y-4">
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start gap-4 h-16 rounded-2xl border bg-card/50 px-4 transition-all", theme === "light" ? "border-primary ring-1 ring-primary" : "border-surface-low")}
                    onClick={() => setTheme("light")}
                  >
                    <div className="h-8 w-8 rounded-full bg-surface-low flex items-center justify-center text-muted-foreground shrink-0"><Sun className="h-4 w-4" /></div>
                    <div className="flex-1 text-left">
                       <p className="font-bold">Light</p>
                       <p className="text-xs font-medium text-muted-foreground">Crisp and editorial</p>
                    </div>
                    {theme === "light" && <CheckCircle2 className="h-5 w-5 text-primary" />}
                  </Button>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start gap-4 h-16 rounded-2xl border bg-card/50 px-4 transition-all", theme === "dark" ? "border-primary ring-1 ring-primary" : "border-surface-low")}
                    onClick={() => setTheme("dark")}
                  >
                     <div className="h-8 w-8 rounded-full bg-surface-low flex items-center justify-center text-muted-foreground shrink-0"><Moon className="h-4 w-4" /></div>
                    <div className="flex-1 text-left">
                       <p className="font-bold">Dark</p>
                       <p className="text-xs font-medium text-muted-foreground">Elegant midnight</p>
                    </div>
                    {theme === "dark" && <CheckCircle2 className="h-5 w-5 text-primary" />}
                  </Button>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start gap-4 h-16 rounded-2xl border bg-card/50 px-4 transition-all", theme === "system" ? "border-primary ring-1 ring-primary" : "border-surface-low")}
                    onClick={() => setTheme("system")}
                  >
                     <div className="h-8 w-8 rounded-full bg-surface-low flex items-center justify-center text-muted-foreground shrink-0"><Monitor className="h-4 w-4" /></div>
                    <div className="flex-1 text-left">
                       <p className="font-bold">System</p>
                       <p className="text-xs font-medium text-muted-foreground">Follow OS settings</p>
                    </div>
                    {theme === "system" && <CheckCircle2 className="h-5 w-5 text-primary" />}
                  </Button>
              </CardContent>
            </Card>

            <div className="col-span-1 lg:col-span-2 grid gap-6 sm:grid-cols-2">
              <Card className="bg-card border-none shadow-sm rounded-[24px]">
                <CardHeader className="px-8 pt-8 pb-4">
                  <CardTitle className="text-xl font-bold font-display flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Language
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                  <div className="flex items-center gap-3 p-4 border border-primary ring-1 ring-primary rounded-2xl bg-primary/5">
                    <div className="text-2xl">🇺🇸</div>
                    <div className="flex-1">
                      <p className="font-bold">English (US)</p>
                      <p className="text-xs text-muted-foreground">System default</p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-none shadow-sm rounded-[24px]">
                <CardHeader className="px-8 pt-8 pb-4">
                  <CardTitle className="text-xl font-bold font-display flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                    Currency
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                   <div className="border border-surface-low rounded-2xl bg-surface-low/50 outline-none p-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <Select 
                        value={currentProfile?.currency || 'USD'} 
                        onValueChange={handleCurrencyChange} 
                        disabled={isCurrencySaving}
                      >
                        <SelectTrigger className="w-full bg-transparent border-none font-bold outline-none ring-0 shadow-none focus:ring-0 focus:ring-offset-0 text-sm h-10">
                          <SelectValue placeholder="Select Currency" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-xl">
                          <SelectItem value="USD">USD - United States Dollar ($)</SelectItem>
                          <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound (£)</SelectItem>
                          <SelectItem value="JPY">JPY - Japanese Yen (¥)</SelectItem>
                          <SelectItem value="KES">KES - Kenyan Shilling (KSh)</SelectItem>
                        </SelectContent>
                      </Select>
                   </div>
                   <p className="text-[10px] mt-4 font-bold tracking-wider uppercase text-muted-foreground/70 leading-relaxed">
                     Currency updates may take up to 24 hours to reflect across all historical charts.
                   </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Account Information */}
            <Card className="col-span-1 md:col-span-2 lg:col-span-2 bg-card border-none shadow-sm rounded-[24px]">
              <CardHeader className="px-8 pt-8 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-xl font-bold font-display">Account Details</CardTitle>
                </div>
                <Avatar className="h-16 w-16 shadow-md border-2 border-background shadow-primary/20">
                  <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || "User"} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">{user?.displayName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
              </CardHeader>
              <CardContent className="px-8 pb-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Full Name</Label>
                    <Input className="h-12 bg-surface-low border-transparent font-semibold shadow-none rounded-xl" defaultValue={user?.displayName || ""} disabled />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Display Name</Label>
                    <Input className="h-12 bg-surface-low border-transparent font-semibold shadow-none rounded-xl" defaultValue={user?.displayName?.split(' ')[0] + '_lux' || ""} disabled />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email Address</Label>
                  <div className="flex relative items-center">
                    <Input className="h-12 bg-surface-low border-transparent font-semibold shadow-none rounded-xl pr-20" defaultValue={user?.email || ""} disabled />
                    <span className="absolute right-4 text-primary font-bold text-sm">Verify</span>
                  </div>
                </div>

                <Separator className="bg-surface-low my-8" />

                <div className="space-y-6">
                  <h3 className="text-xl font-bold font-display">Active Workspace</h3>
                  <div className="grid gap-2">
                     <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Workspace Name</Label>
                     <Input
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        className="h-12 bg-surface-low border-transparent font-semibold shadow-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-background"
                      />
                  </div>
                  <div className="grid gap-2">
                     <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description</Label>
                     <Input
                        value={workspaceDesc}
                        onChange={(e) => setWorkspaceDesc(e.target.value)}
                        className="h-12 bg-surface-low border-transparent font-semibold shadow-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-background"
                      />
                  </div>
                  
                  <div className="flex justify-end pt-4 gap-3">
                    <Button variant="ghost" className="font-bold h-12 rounded-xl text-muted-foreground hover:text-foreground">Discard</Button>
                    <Button onClick={handleSaveWorkspace} disabled={isSaving} className="font-bold h-12 rounded-xl px-8 shadow-md shadow-primary/20 bg-primary">
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="bg-surface-low border-none shadow-none rounded-[24px]">
                <CardHeader className="px-8 pt-8">
                  <CardTitle className="text-lg font-bold font-display">Available Workspaces</CardTitle>
                </CardHeader>
                <CardContent className="px-8 pb-8 space-y-3">
                  {profiles?.map(p => (
                    <div key={p.id} className={cn("flex flex-col p-4 rounded-2xl transition-all", currentProfile?.id === p.id ? 'bg-background border shadow-sm ring-1 ring-primary/20' : 'bg-background/50 hover:bg-background')}>
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-sm tracking-tight">{p.name}</p>
                        {currentProfile?.id === p.id && (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-medium mt-1 truncate">{p.description || "No description"}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Currency Conversion Modal */}
      <AlertDialog open={currencyModalOpen} onOpenChange={setCurrencyModalOpen}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold text-2xl">Convert Existing Funds?</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-muted-foreground pt-2">
              You are updating your global workspace currency to <span className="font-bold text-foreground">{pendingCurrency}</span>. 
              <br/><br/>
              Would you like the system to automatically exchange and adjust all your past numerical values (Incomes, Expenses, Savings, Debts) to mathematically match the new currency?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex flex-col sm:flex-row gap-3">
            <AlertDialogCancel className="rounded-xl border-border bg-surface hover:bg-surface-low order-1 sm:order-none" onClick={() => setPendingCurrency(null)}>
              Cancel
            </AlertDialogCancel>
            <Button variant="outline" className="rounded-xl font-bold" onClick={() => confirmCurrencyChange(false)}>
              Swap Symbol Only
            </Button>
            <Button className="rounded-xl font-bold bg-primary text-primary-foreground" onClick={() => confirmCurrencyChange(true)}>
              Convert Values
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
