"use client"

import { useTheme } from "next-themes"
import { useUser, useFirestore } from "@/firebase"
import { useProfile } from "@/context/ProfileContext"
import { doc, updateDoc } from "firebase/firestore"
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
import { Monitor, Moon, Sun, Globe } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user } = useUser();
  const { currentProfile, profiles } = useProfile();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [workspaceName, setWorkspaceName] = useState(currentProfile?.name || "");
  const [workspaceDesc, setWorkspaceDesc] = useState(currentProfile?.description || "");
  const [isSaving, setIsSaving] = useState(false);

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

  return (
    <div className="flex-1 space-y-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your app appearance, preferences, and profile.</p>
      </div>

      <Tabs defaultValue="preferences" className="space-y-4">
        <TabsList>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>
        
        <TabsContent value="preferences" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize how FinTrack looks on your device.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      className="flex-1 justify-start gap-2"
                      onClick={() => setTheme("light")}
                    >
                      <Sun className="h-4 w-4" />
                      Light
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      className="flex-1 justify-start gap-2"
                      onClick={() => setTheme("dark")}
                    >
                      <Moon className="h-4 w-4" />
                      Dark
                    </Button>
                    <Button
                      variant={theme === "system" ? "default" : "outline"}
                      className="flex-1 justify-start gap-2"
                      onClick={() => setTheme("system")}
                    >
                      <Monitor className="h-4 w-4" />
                      System
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Global Preferences</CardTitle>
                <CardDescription>Global formatting and regional settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Default Currency</Label>
                  <Select defaultValue="usd">
                    <SelectTrigger>
                      <SelectValue placeholder="Select a currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD ($)</SelectItem>
                      <SelectItem value="eur">EUR (€)</SelectItem>
                      <SelectItem value="gbp">GBP (£)</SelectItem>
                      <SelectItem value="kes">KES (KSh)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language Support</Label>
                  <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Currently only English is supported</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Account Information */}
            <Card className="col-span-1 md:col-span-2 lg:col-span-1">
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
                <CardDescription>Your personal account information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || "User"} />
                    <AvatarFallback>{user?.displayName?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-medium">{user?.displayName || "Anonymous User"}</h3>
                    <p className="text-sm text-muted-foreground">{user?.email || "No email linked"}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input id="displayName" defaultValue={user?.displayName || ""} disabled />
                    <p className="text-[0.8rem] text-muted-foreground">Your name as it appears in the app.</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" defaultValue={user?.email || ""} disabled />
                    <p className="text-[0.8rem] text-muted-foreground">Your email address used for login.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Profile details */}
            <Card className="col-span-1 md:col-span-2 lg:col-span-2">
              <CardHeader>
                <CardTitle>Financial Workspace</CardTitle>
                <CardDescription>Manage your current financial profile settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="profileName">Workspace Name</Label>
                    <Input 
                      id="profileName" 
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="profileDesc">Description</Label>
                    <Input 
                      id="profileDesc" 
                      value={workspaceDesc}
                      onChange={(e) => setWorkspaceDesc(e.target.value)} 
                    />
                  </div>
                  <Button onClick={handleSaveWorkspace} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Workspace Changes"}
                  </Button>
                </div>
                
                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium leading-none">Available Workspaces</h4>
                  <div className="space-y-2">
                    {profiles?.map(p => (
                      <div key={p.id} className={`flex items-center justify-between p-3 border rounded-md ${currentProfile?.id === p.id ? 'bg-muted/50 border-primary' : ''}`}>
                        <div>
                          <p className="font-medium text-sm">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.description || "No description"}</p>
                        </div>
                        {currentProfile?.id === p.id && (
                          <span className="text-xs font-semibold text-primary">Active</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
