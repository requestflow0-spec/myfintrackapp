"use client"

import { useUser } from "@/firebase"
import { useProfile } from "@/context/ProfileContext"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

export default function ProfilePage() {
  const { user } = useUser();
  const { currentProfile, profiles } = useProfile();

  return (
    <div className="flex-1 space-y-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
        <p className="text-muted-foreground">Manage your account and financial profiles.</p>
      </div>

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
                <Input id="profileName" defaultValue={currentProfile?.name || ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profileDesc">Description</Label>
                <Input id="profileDesc" defaultValue={currentProfile?.description || ""} />
              </div>
            </div>
            
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

            <Button>Save Workspace Changes</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
