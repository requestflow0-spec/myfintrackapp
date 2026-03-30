"use client"

import { useUser, useAuth } from "@/firebase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { placeholderImages } from "@/lib/placeholder-images.json"
import { useRouter } from "next/navigation"
import { Skeleton } from "./ui/skeleton"

export function UserNav() {
  const { user, isUserLoading } = useUser()
  const auth = useAuth()
  const router = useRouter()
  const userAvatar = placeholderImages.find(p => p.id === "user-avatar");

  const handleLogout = () => {
    if (auth) {
      auth.signOut().then(() => {
        router.push('/login');
      });
    }
  }

  if (isUserLoading || !user) {
    return <Skeleton className="h-9 w-9 rounded-full" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={userAvatar?.imageUrl} alt={user.email || "user avatar"} data-ai-hint={userAvatar?.imageHint}/>
            <AvatarFallback>{user.email ? user.email[0].toUpperCase() : 'U'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              My Account
            </p>
            {user.email &&
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            }
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            Profile
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Settings
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          Log out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
