"use client"

import Link from "next/link"
import {
  Menu,
  ChevronDown,
  PlusCircle,
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
import { ThemeToggle } from "@/components/theme-toggle"
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
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { useProfile } from "@/context/ProfileContext"

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  description: z.string().optional(),
})

export function Header() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { currentProfile, setCurrentProfile, profiles, setProfiles, setIsLoading } = useProfile()
  const [popoverOpen, setPopoverOpen] = useState(false);

  const profilesQuery = useMemoFirebase(() => {
    if (!user) return null
    return collection(firestore, `users/${user.uid}/userProfiles`)
  }, [firestore, user])

  const { data: fetchedProfiles, isLoading: profilesLoading } = useCollection(profilesQuery)

  useEffect(() => {
    setIsLoading(profilesLoading);

    if (!profilesLoading) {
      if (fetchedProfiles && fetchedProfiles.length > 0) {
        setProfiles(fetchedProfiles);

        const latestProfile = fetchedProfiles.find(p => p.id === currentProfile?.id);

        if (latestProfile) {
          // If profile exists, update it if the content has changed (e.g. new categories added)
          if (JSON.stringify(latestProfile) !== JSON.stringify(currentProfile)) {
            setCurrentProfile(latestProfile);
          }
        } else {
          // If no profile is selected or the current one is gone, select the first.
          setCurrentProfile(fetchedProfiles[0]);
        }
      } else if (fetchedProfiles && fetchedProfiles.length === 0) {
        setProfiles([]);
        setCurrentProfile(null);
      } else {
        // This case handles when fetchedProfiles is null after loading (error).
        setProfiles([]);
        setCurrentProfile(null);
      }
    }
  }, [fetchedProfiles, profilesLoading, currentProfile, setCurrentProfile, setProfiles, setIsLoading]);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return
    const profilesCol = collection(firestore, `users/${user.uid}/userProfiles`);
    addDocumentNonBlocking(profilesCol, {
      ...values,
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    form.reset();
    setPopoverOpen(false);
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
              <DropdownMenuItem key={profile.id} onSelect={() => setCurrentProfile(profile)}>
                {profile.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setPopoverOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Profile
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
      <ThemeToggle />
      <UserNav />
    </header>
  )
}
