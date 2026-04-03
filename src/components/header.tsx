"use client"

import Link from "next/link"
import {
  Menu,
  ChevronDown,
  PlusCircle,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { UserNav } from "@/components/user-nav"
import { MainNav } from "./main-nav"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useForm } from "react-hook-form"
import { useEffect, useState } from "react"
import { collection, serverTimestamp } from "firebase/firestore"
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { useProfile } from "@/context/ProfileContext"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  description: z.string().optional(),
})

export function Header() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { currentProfile, setCurrentProfile, profiles, setProfiles, setIsLoading } = useProfile()
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<any>(null);
  const [confirmName, setConfirmName] = useState("");
  const { toast } = useToast();

  const profilesQuery = useMemoFirebase(() => {
    if (!user) return null
    return collection(firestore, `users/${user.uid}/userProfiles`)
  }, [firestore, user])

  const { data: fetchedProfiles, isLoading: profilesLoading } = useCollection(profilesQuery)

  // Synchronization logic for profiles.
  useEffect(() => {
    setIsLoading(profilesLoading);

    if (!profilesLoading && fetchedProfiles) {
      setProfiles(fetchedProfiles);

      // If no profile is selected, or the current selected one is not in the list, default to the first one available.
      const exists = currentProfile && fetchedProfiles.some(p => p.id === currentProfile.id);
      
      if (!exists && fetchedProfiles.length > 0) {
        setCurrentProfile(fetchedProfiles[0]);
      } else if (fetchedProfiles.length === 0) {
        setCurrentProfile(null);
      }
    }
  }, [fetchedProfiles, profilesLoading, setIsLoading, setProfiles, setCurrentProfile]);

  // Safety reset for unclickable UI bug.
  // Sometimes Radix UI Dialog leaves pointer-events: none on the body if it closes during a heavy re-render.
  useEffect(() => {
    if (!popoverOpen || !deleteDialogOpen) {
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [popoverOpen, deleteDialogOpen]);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return
    const profilesCol = collection(firestore, `users/${user.uid}/userProfiles`);
    
    try {
      await addDocumentNonBlocking(profilesCol, {
        ...values,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: "Profile Created",
        description: `${values.name} is now active.`,
      });
      
      form.reset();
      setPopoverOpen(false);
    } catch (error) {
      console.error("Error creating profile:", error);
      toast({
        title: "Error",
        description: "Failed to create profile.",
        variant: "destructive",
      });
    }
  }

  function handleDeleteProfile(profile: any) {
    setProfileToDelete(profile);
    setConfirmName("");
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!user || !profileToDelete || confirmName !== profileToDelete.name) return;

    const profileRef = doc(firestore, `users/${user.uid}/userProfiles/${profileToDelete.id}`);
    deleteDocumentNonBlocking(profileRef);
    
    toast({
      title: "Profile Deleted",
      description: `${profileToDelete.name} has been removed.`,
    });

    setDeleteDialogOpen(false);
    setProfileToDelete(null);
  }

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Main navigation menu for accessing different sections of the application.
          </SheetDescription>
          <nav className="grid gap-2 text-lg font-medium">
            <Link
              href="#"
              className="flex items-center gap-2 text-lg font-semibold mb-4 text-primary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" /><path d="m12 12 4 10 1.5-1.5L14 14l-1.5-1.5Z" /><path d="m16 16 3-3" /><path d="M7 7h.01" /><path d="M7 11h.01" /><path d="M7 15h.01" /></svg>
              <span>FinTrack Pro</span>
            </Link>
            <MainNav />
          </nav>
        </SheetContent>
      </Sheet>
      <div className="w-full flex-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2" disabled={profilesLoading}>
              {currentProfile ? currentProfile.name : "Select Profile"}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Switch Profile</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {profiles?.map(profile => (
              <DropdownMenuItem key={profile.id} className="flex items-center justify-between group">
                <span className="flex-1 cursor-pointer" onClick={() => setCurrentProfile(profile)}>
                  {profile.name}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProfile(profile);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setPopoverOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Profile
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-destructive">Delete Profile</DialogTitle>
              <DialogDescription>
                This action cannot be undone. All data in this profile will be orphaned.
                Please type <span className="font-bold text-foreground">{(profileToDelete as any)?.name}</span> to confirm.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input 
                placeholder="Type profile name..." 
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
              />
              <Button 
                variant="destructive" 
                className="w-full" 
                disabled={confirmName !== (profileToDelete as any)?.name}
                onClick={confirmDelete}
              >
                Permanently Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={popoverOpen} onOpenChange={setPopoverOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>New Profile</DialogTitle>
              <DialogDescription>
                Create a new financial profile.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Personal Finances" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="A brief description of this profile" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">Create Profile</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <UserNav />
    </header>
  )
}
